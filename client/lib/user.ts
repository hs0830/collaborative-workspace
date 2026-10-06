'use client';

import { useEffect, useState } from 'react';

// 로그인 기능(4단계)을 붙이기 전까지 사용하는 임시 사용자 정보.
// 이름은 브라우저에 저장되고, 채팅 발신자와 에디터 커서 이름표에 쓰입니다.

export interface CurrentUser {
  id: string;
  name: string;
  color: string;
}

const STORAGE_KEY = 'workspace:user';
const COLORS = ['#2563eb', '#059669', '#9333ea', '#d97706', '#e11d48', '#0891b2', '#4f46e5'];

const listeners = new Set<(u: CurrentUser) => void>();
let cached: CurrentUser | null = null;

function createUser(): CurrentUser {
  const id = Math.random().toString(36).slice(2, 10);
  return {
    id,
    name: `익명-${id.slice(0, 4)}`,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
}

function load(): CurrentUser {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      cached = JSON.parse(raw) as CurrentUser;
      return cached;
    }
  } catch {
    /* 저장소를 쓸 수 없는 환경이면 새로 만듦 */
  }
  cached = createUser();
  save(cached);
  return cached;
}

function save(user: CurrentUser) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    /* 무시 */
  }
}

export function setUserName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const next = { ...load(), name: trimmed.slice(0, 20) };
  cached = next;
  save(next);
  listeners.forEach((fn) => fn(next));
}

/** 현재 사용자. 서버 렌더링 중에는 null 이고 브라우저에서 채워집니다. */
export function useCurrentUser(): CurrentUser | null {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    setUser(load());
    listeners.add(setUser);
    return () => {
      listeners.delete(setUser);
    };
  }, []);

  return user;
}
