'use client';

import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { SERVER_URL } from './config';

// 앱 전체에서 하나의 연결만 사용 (페이지를 옮겨 다녀도 재연결하지 않음)
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
  }
  return socket;
}

/** Socket.IO 연결 여부 */
export function useSocketConnected(): boolean {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = getSocket();
    const on = () => setConnected(true);
    const off = () => setConnected(false);
    setConnected(s.connected);
    s.on('connect', on);
    s.on('disconnect', off);
    s.on('connect_error', off);
    return () => {
      s.off('connect', on);
      s.off('disconnect', off);
      s.off('connect_error', off);
    };
  }, []);

  return connected;
}

/** 서버의 파일 경로(/uploads/...)를 전체 URL로 변환 */
export const fileUrl = (path: string) => `${SERVER_URL}${path}`;
