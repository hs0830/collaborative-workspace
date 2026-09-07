const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const WebSocket = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

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
  if (request.url.startsWith('/yjs')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));