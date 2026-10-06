'use client';

import { useCallback } from 'react';
import { emitAction, useSocketConnected, useSynced } from './socket';
import type { KanbanAction, KanbanColumn, KanbanState } from './types';

/** '완료' 컬럼: id가 done 인 컬럼, 없으면 마지막 컬럼 */
export const doneColumnId = (columns: KanbanColumn[]) =>
  columns.find((c) => c.id === 'done')?.id ?? columns[columns.length - 1]?.id;

/** 서버와 동기화되는 칸반 상태. 대시보드·팀원·캘린더 화면에서도 같이 사용합니다. */
export function useKanban() {
  const state = useSynced<KanbanState>('kanban', 'kanban:state');
  const connected = useSocketConnected();

  const dispatch = useCallback(
    async (action: KanbanAction) => (await emitAction<{ ok: boolean }>('kanban:action', action)).ok,
    []
  );

  return { state, dispatch, connected };
}
