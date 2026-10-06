const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const WebSocket = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');

// 허용할 프론트엔드 주소 (쉼표로 여러 개). 예: http://localhost:3000,https://my-app.vercel.app
const ALLOWED_ORIGINS = (process.env.CLIENT_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: ALLOWED_ORIGINS } });

// Render 등 배포 환경의 헬스체크용
app.get('/health', (_req, res) => res.json({ ok: true }));

// Socket.IO Chat & Kanban events
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.on('chat:message', (data) => io.emit('chat:message', data));
  socket.on('kanban:update', (data) => socket.broadcast.emit('kanban:update', data));
});

// Yjs WebSocket server setup
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
