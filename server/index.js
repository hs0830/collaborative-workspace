const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { Server } = require('socket.io');
const WebSocket = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');
const store = require('./store');

// 허용할 프론트엔드 주소 (쉼표로 여러 개). 예: http://localhost:3000,https://my-app.vercel.app
const ALLOWED_ORIGINS = (process.env.CLIENT_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const CHAT_FILE_LIMIT = 20 * 1024 * 1024; // 20MB

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: ALLOWED_ORIGINS } });

// ───────── HTTP: CORS ─────────
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Render 등 배포 환경의 헬스체크용
app.get('/health', (_req, res) => res.json({ ok: true }));

// ───────── HTTP: 파일 업로드 (채팅 첨부) ─────────
// 지금은 서버 디스크(server/uploads)에 저장합니다. Render 무료 플랜은 재배포 시 디스크가 지워지므로
// 4단계에서 클라우드 저장소로 바꿉니다.
const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    // 원본 이름은 저장하지 않고 무작위 이름 사용 (경로 조작·덮어쓰기 방지)
    filename: (_req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase().slice(0, 10)),
  }),
  limits: { fileSize: CHAT_FILE_LIMIT, files: 1 },
});

app.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? '파일 용량은 최대 20MB입니다.' : '업로드에 실패했습니다.';
      return res.status(400).json({ error: msg });
    }
    if (!req.file) return res.status(400).json({ error: '파일이 없습니다.' });

    // multer는 파일 이름을 latin1로 읽으므로 한글 이름 복원
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    res.json({
      url: `/uploads/${req.file.filename}`,
      name: originalName,
      size: req.file.size,
      isImage: /^image\/(png|jpe?g|gif|webp)$/.test(req.file.mimetype),
    });
  });
});

// 업로드 파일 제공. 이미지가 아니면 항상 다운로드로 처리 (업로드된 HTML이 실행되는 것 방지)
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (!/\.(png|jpe?g|gif|webp)$/i.test(filePath)) res.setHeader('Content-Disposition', 'attachment');
    },
  })
);

// ───────── Socket.IO: 채팅 & 칸반 ─────────
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // 접속하자마자 현재 상태 전달
  socket.emit('chat:history', store.getChatHistory());
  socket.emit('kanban:state', store.getKanban());

  // 페이지 이동 후 다시 화면에 들어왔을 때 최신 상태 요청
  socket.on('chat:get', () => socket.emit('chat:history', store.getChatHistory()));
  socket.on('kanban:get', () => socket.emit('kanban:state', store.getKanban()));

  socket.on('chat:send', (data, ack) => {
    const msg = store.addChatMessage(data ?? {});
    if (!msg) return typeof ack === 'function' && ack({ ok: false });
    io.emit('chat:message', msg);
    if (typeof ack === 'function') ack({ ok: true });
  });

  socket.on('kanban:action', (action, ack) => {
    const ok = store.applyKanbanAction(action);
    if (ok) io.emit('kanban:state', store.getKanban());
    if (typeof ack === 'function') ack({ ok });
  });
});

// ───────── Yjs WebSocket (실시간 문서) ─────────
const wss = new WebSocket.Server({ noServer: true });
wss.on('connection', (ws, req) => setupWSConnection(ws, req));

server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url, 'http://localhost');

  // Socket.IO는 자체 upgrade 핸들러가 처리하므로 건드리지 않음
  if (pathname.startsWith('/socket.io')) return;

  if (pathname.startsWith('/yjs')) {
    const origin = request.headers.origin;
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
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

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});
