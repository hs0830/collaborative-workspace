'use client';

import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { SERVER_URL } from './config';
import { getToken, logout } from './auth';

// 앱 전체에서 하나의 연결만 사용 (페이지를 옮겨 다녀도 재연결하지 않음)
let socket: Socket | null = null;

// 서버가 보내주는 최신 상태를 보관 → 페이지를 옮겨도 빈 화면 없이 바로 표시
const cache = new Map<string, unknown>();
const SNAPSHOT_EVENTS = ['chat:history', 'kanban:state', 'calendar:state', 'team:state', 'datasets:state'];

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      auth: (cb) => cb({ token: getToken() }), // 재연결할 때마다 최신 토큰 사용
    });
    socket.on('connect_error', (err) => {
      if (err.message === 'unauthorized') logout();
    });
    SNAPSHOT_EVENTS.forEach((ev) => socket!.on(ev, (data) => cache.set(ev, data)));
  }
  return socket;
}

/** 로그아웃 시 연결 종료 */
export function closeSocket() {
  socket?.disconnect();
  socket = null;
  cache.clear();
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

/**
 * 서버와 동기화되는 상태 하나를 구독합니다.
 * @param name   서버 SNAPSHOTS 이름 (kanban, calendar, team, datasets, chat)
 * @param event  서버가 상태를 보내는 이벤트 이름
 */
export function useSynced<T>(name: string, event: string): T | null {
  const [data, setData] = useState<T | null>(() => (cache.get(event) as T) ?? null);

  useEffect(() => {
    const s = getSocket();
    const onData = (next: T) => setData(next);
    s.on(event, onData);
    if (s.connected) s.emit('sync:get', name);
    return () => {
      s.off(event, onData);
    };
  }, [name, event]);

  return data;
}

/** 서버에 변경 요청을 보내고 결과를 기다림 */
export function emitAction<R = { ok: boolean; error?: string }>(event: string, payload: unknown): Promise<R> {
  return new Promise((resolve) => {
    getSocket()
      .timeout(8000)
      .emit(event, payload, (err: Error | null, res: R) =>
        resolve(err ? ({ ok: false, error: '서버 응답이 없습니다.' } as R) : res)
      );
  });
}
