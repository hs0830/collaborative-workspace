'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSocket, useSocketConnected } from './socket';
import type { KanbanAction, KanbanState } from './types';

/** 서버와 동기화되는 칸반 상태. 대시보드·팀원·캘린더 화면에서도 같이 사용합니다. */
export function useKanban() {
  const [state, setState] = useState<KanbanState | null>(null);
  const connected = useSocketConnected();

  useEffect(() => {
    const s = getSocket();
    const onState = (next: KanbanState) => setState(next);
    s.on('kanban:state', onState);
    // 이미 연결된 상태에서 이 화면에 들어온 경우, 최신 상태를 다시 요청
    if (s.connected) s.emit('kanban:get');
    return () => {
      s.off('kanban:state', onState);
    };
  }, []);

  const dispatch = useCallback(
    (action: KanbanAction) =>
      new Promise<boolean>((resolve) => {
        getSocket()
          .timeout(5000)
          .emit('kanban:action', action, (err: Error | null, res?: { ok: boolean }) => resolve(!err && !!res?.ok));
      }),
    []
  );

  return { state, dispatch, connected };
}
