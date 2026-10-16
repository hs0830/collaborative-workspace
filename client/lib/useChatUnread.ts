'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSocket, useSynced } from './socket';
import type { ChatMessage } from './types';

const seenKey = (userId: string) => `workspace:chatSeen:${userId}`;

function readSeen(userId: string): string | null {
  try {
    return localStorage.getItem(seenKey(userId));
  } catch {
    return null;
  }
}

function writeSeen(userId: string, iso: string) {
  try {
    localStorage.setItem(seenKey(userId), iso);
  } catch {
    /* 저장 안 되는 브라우저면 이번 접속 동안만 기억 */
  }
}

/**
 * 안 읽은 팀 채팅 메시지 (다른 사람이 보낸 것만)
 * - 채팅 화면을 마지막으로 본 시각 이후의 메시지를 셉니다.
 * - 채팅 화면에 있는 동안에는 새 메시지가 와도 바로 읽음 처리합니다.
 */
export function useChatUnread(userId: string | undefined, onChatPage: boolean) {
  const history = useSynced<ChatMessage[]>('chat', 'chat:history');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [seenAt, setSeenAt] = useState<string | null>(null);

  useEffect(() => {
    if (history) setMessages(history);
  }, [history]);

  useEffect(() => {
    const s = getSocket();
    const onMessage = (msg: ChatMessage) => setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    s.on('chat:message', onMessage);
    return () => {
      s.off('chat:message', onMessage);
    };
  }, []);

  // 처음 접속한 기기에서는 지금까지의 기록을 전부 '읽음'으로 시작
  useEffect(() => {
    if (!userId) return;
    let saved = readSeen(userId);
    if (!saved) {
      saved = new Date().toISOString();
      writeSeen(userId, saved);
    }
    setSeenAt(saved);
  }, [userId]);

  const markRead = useCallback(() => {
    if (!userId) return;
    const now = new Date().toISOString();
    writeSeen(userId, now);
    setSeenAt(now);
  }, [userId]);

  useEffect(() => {
    if (onChatPage) markRead();
  }, [onChatPage, messages.length, markRead]);

  const unread = seenAt && !onChatPage ? messages.filter((m) => m.senderId !== userId && m.createdAt > seenAt) : [];
  return { unread, markRead };
}
