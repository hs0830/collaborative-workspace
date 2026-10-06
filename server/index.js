const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const WebSocket = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');

const config = require('./config');
const auth = require('./auth');
const db = require('./db');
const store = require('./store');
const storage = require('./storage');
const { setupYjsPersistence } = require('./yjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: config.allowedOrigins } });

/** async 라우트에서 난 오류를 잡아 500 응답 (Express 4는 자동으로 잡지 않아 서버가 꺼질 수 있음) */
const safe = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.set('trust proxy', 1); // Render 등 프록시 뒤에서 실제 IP 사용
app.use(express.json({ limit: '100kb' }));

// ───────── HTTP: CORS ─────────
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && config.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/health', (_req, res) => res.json({ ok: true, db: Boolean(db.pool), storage: storage.driver.name }));

// ───────── 로그인 ─────────
app.post('/api/login', safe(async (req, res) => {
  if (auth.tooManyAttempts(req.ip)) return res.status(429).json({ error: '잠시 후 다시 시도하세요.' });

  const { code, name } = req.body ?? {};
  if (!auth.checkInviteCode(code)) return res.status(401).json({ error: '초대 코드가 올바르지 않습니다.' });
  if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: '이름을 입력하세요.' });

  const member = await serial(() => store.loginByName(name));
  if (!member) return res.status(400).json({ error: '이름을 확인하세요.' });
  broadcastTeam();
  res.json({ token: auth.signUserToken(member.id), member });
}));

/** 로그인한 사용자만 통과 */
function requireUser(req, res, next) {
  const member = store.getMember(auth.verifyUserToken(auth.tokenFromRequest(req)));
  if (!member) return res.status(401).json({ error: '다시 로그인하세요.' });
  req.member = member;
  next();
}

app.get('/api/me', requireUser, (req, res) => res.json({ member: req.member }));

// ───────── 파일 업로드·다운로드 ─────────
// 1) POST /api/files            → 업로드 링크 발급 (브라우저가 이 링크로 직접 PUT)
// 2) POST /api/files/:id/complete → 업로드 완료 확인
// 3) GET  /api/files/:id/url     → 다운로드 링크 발급
app.post('/api/files', requireUser, safe(async (req, res) => {
  const { kind, name, size, contentType } = req.body ?? {};
  if (!['chat', 'dataset'].includes(kind)) return res.status(400).json({ error: '잘못된 요청입니다.' });
  const limit = config.limits[kind];
  if (!Number.isFinite(size) || size <= 0) return res.status(400).json({ error: '빈 파일은 올릴 수 없습니다.' });
  if (size > limit) return res.status(400).json({ error: `파일 용량은 최대 ${kind === 'chat' ? '20MB' : '1GB'}입니다.` });

  const cleanName = String(name || 'file').replace(/[\\/\0]/g, '_').slice(0, 200);
  const type = typeof contentType === 'string' && /^[\w.+-]+\/[\w.+-]+$/.test(contentType) ? contentType : 'application/octet-stream';

  const file = await store.createFile({
    kind,
    storageKey: storage.makeKey(kind, cleanName),
    name: cleanName,
    size,
    contentType: type,
    uploader: req.member,
  });
  res.json({ fileId: file.id, uploadUrl: await storage.driver.uploadUrl(file), contentType: type });
}));

app.post('/api/files/:id/complete', requireUser, safe(async (req, res) => {
  const file = store.getFile(req.params.id);
  if (!file || file.uploaderId !== req.member.id) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });

  const size = await storage.driver.size(file);
  if (size === null) return res.status(400).json({ error: '업로드가 완료되지 않았습니다.' });
  if (size > config.limits[file.kind]) {
    await storage.driver.remove(file);
    await store.deleteFile(file.id);
    return res.status(400).json({ error: '허용 용량을 초과했습니다.' });
  }

  await store.markFileReady(file.id, size);
  if (file.kind === 'dataset') io.emit('datasets:state', store.listDatasets());
  res.json({ file: store.publicFile(file) });
}));

app.get('/api/files/:id/url', requireUser, safe(async (req, res) => {
  const file = store.getFile(req.params.id);
  if (!file || file.status !== 'ready') return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
  res.json({ url: await storage.driver.downloadUrl(file, req.query.inline === '1') });
}));

app.delete('/api/files/:id', requireUser, safe(async (req, res) => {
  const file = store.getFile(req.params.id);
  if (!file || file.kind !== 'dataset') return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
  await storage.driver.remove(file);
  await store.deleteFile(file.id);
  io.emit('datasets:state', store.listDatasets());
  res.json({ ok: true });
}));

storage.mountLocalRoutes(app, store);

// 오류 처리 (위 라우트에서 난 오류가 여기로 옴)
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('요청 처리 오류:', err.message);
  if (!res.headersSent) res.status(err.status || 500).json({ error: err.status === 400 ? '잘못된 요청입니다.' : '서버 오류가 발생했습니다.' });
});

// 예상치 못한 오류로 서버 전체가 꺼지지 않도록 기록만 남김
process.on('unhandledRejection', (err) => console.error('처리되지 않은 오류:', err));

// ───────── 변경 작업은 한 번에 하나씩 처리 (동시 요청 시 데이터 꼬임 방지) ─────────
let queue = Promise.resolve();
function serial(fn) {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

// ───────── Socket.IO: 채팅·칸반·캘린더·팀원·데이터셋 ─────────
const broadcastTeam = () => io.emit('team:state', store.getMembers());

// 연결할 때 토큰 확인
io.use((socket, next) => {
  const memberId = auth.verifyUserToken(socket.handshake.auth?.token);
  if (!memberId || !store.getMember(memberId)) return next(new Error('unauthorized'));
  socket.data.memberId = memberId;
  next();
});

const SNAPSHOTS = {
  chat: () => ['chat:history', store.getChatHistory()],
  kanban: () => ['kanban:state', store.getKanban()],
  calendar: () => ['calendar:state', store.getEvents()],
  team: () => ['team:state', store.getMembers()],
  datasets: () => ['datasets:state', store.listDatasets()],
};

io.on('connection', (socket) => {
  const me = () => store.getMember(socket.data.memberId);
  const reply = (ack, value) => typeof ack === 'function' && ack(value);

  // 접속하자마자 현재 상태 전달
  Object.values(SNAPSHOTS).forEach((snap) => socket.emit(...snap()));

  // 화면에 다시 들어왔을 때 최신 상태 요청 (예: sync:get 'kanban')
  socket.on('sync:get', (name) => SNAPSHOTS[name] && socket.emit(...SNAPSHOTS[name]()));

  /** 로그인 확인 → 직렬 실행 → 성공 시 해당 상태를 전체에 배포 */
  const handle = (event, apply, broadcast) =>
    socket.on(event, async (payload, ack) => {
      const member = me();
      if (!member) return reply(ack, { ok: false, error: 'unauthorized' });
      try {
        const result = await serial(() => apply(payload, member));
        const ok = typeof result === 'object' && result !== null ? result.ok : Boolean(result);
        if (ok) broadcast(result);
        reply(ack, typeof result === 'object' && result !== null ? result : { ok });
      } catch (err) {
        console.error(event, err);
        reply(ack, { ok: false, error: '서버 오류가 발생했습니다.' });
      }
    });

  handle(
    'chat:send',
    async (data, member) => {
      const msg = await store.addChatMessage({ senderId: member.id, text: data?.text, fileId: data?.fileId });
      return msg ? { ok: true, msg } : { ok: false };
    },
    ({ msg }) => io.emit('chat:message', msg)
  );

  handle('kanban:action', (action) => store.applyKanbanAction(action), () => io.emit(...SNAPSHOTS.kanban()));

  handle('calendar:action', (action) => store.applyCalendarAction(action), () => io.emit(...SNAPSHOTS.calendar()));

  handle(
    'team:action',
    (action) => store.applyTeamAction(action),
    () => {
      broadcastTeam();
      // 이름 변경·삭제 시 담당자·채팅 발신자 표시도 갱신
      io.emit(...SNAPSHOTS.kanban());
      io.emit(...SNAPSHOTS.calendar());
      io.emit(...SNAPSHOTS.chat());
    }
  );
});

// ───────── Yjs WebSocket (실시간 문서) ─────────
const wss = new WebSocket.Server({ noServer: true });
wss.on('connection', (ws, req) => setupWSConnection(ws, req));

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, 'http://localhost');

  // Socket.IO는 자체 upgrade 핸들러가 처리하므로 건드리지 않음
  if (url.pathname.startsWith('/socket.io')) return;

  if (url.pathname.startsWith('/yjs')) {
    const origin = request.headers.origin;
    const memberId = auth.verifyUserToken(url.searchParams.get('token'));
    if ((origin && !config.allowedOrigins.includes(origin)) || !store.getMember(memberId)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
    return;
  }

  // 알 수 없는 경로의 upgrade 요청은 연결을 닫음
  socket.destroy();
});

// ───────── 시작 ─────────
(async () => {
  try {
    await db.migrate();
    await store.init();
    setupYjsPersistence();
  } catch (err) {
    console.error('❌ 초기화 실패:', err.message);
    process.exit(1);
  }

  server.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
    console.log(`  허용 주소: ${config.allowedOrigins.join(', ')}`);
    console.log(`  DB: ${db.pool ? 'PostgreSQL' : '메모리 (재시작 시 초기화)'}`);
    console.log(`  파일 저장소: ${storage.driver.name === 'r2' ? 'Cloudflare R2' : 'server/uploads (로컬)'}`);
  });
})();
