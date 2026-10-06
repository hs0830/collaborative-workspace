'use client';

import { useEffect, useState } from 'react';
import { SERVER_URL } from './config';

// 초대 코드 로그인. 서버가 준 토큰을 브라우저에 저장하고 모든 요청에 붙입니다.

export interface Member {
  id: string;
  name: string;
  role: string;
  email: string;
  color: string;
}

const TOKEN_KEY = 'workspace:token';
const MEMBER_KEY = 'workspace:member';

type Session = { token: string; member: Member } | null;
const listeners = new Set<(s: Session) => void>();
let session: Session | undefined; // undefined = 아직 읽지 않음

function read(): Session {
  if (session !== undefined) return session;
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const member = localStorage.getItem(MEMBER_KEY);
    session = token && member ? { token, member: JSON.parse(member) } : null;
  } catch {
    session = null;
  }
  return session;
}

function write(next: Session) {
  session = next;
  try {
    if (next) {
      localStorage.setItem(TOKEN_KEY, next.token);
      localStorage.setItem(MEMBER_KEY, JSON.stringify(next.member));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(MEMBER_KEY);
    }
  } catch {
    /* 저장소를 쓸 수 없으면 이번 탭에서만 유지 */
  }
  listeners.forEach((fn) => fn(next));
}

export const getToken = () => read()?.token ?? null;

export async function login(code: string, name: string): Promise<string | null> {
  try {
    const res = await fetch(`${SERVER_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, name }),
    });
    const data = await res.json();
    if (!res.ok) return data.error || '로그인에 실패했습니다.';
    write({ token: data.token, member: data.member });
    return null;
  } catch {
    return '서버에 연결할 수 없습니다. 서버가 켜져 있는지 확인하세요.';
  }
}

export function logout() {
  write(null);
}

/** 내 정보가 바뀌었을 때(이름 변경 등) 저장된 정보 갱신 */
export function updateMe(member: Member) {
  const s = read();
  if (s && s.member.id === member.id) write({ ...s, member });
}

/**
 * 로그인 상태.
 * - undefined: 아직 확인 전 (서버 렌더링 / 첫 렌더)
 * - null: 로그인 안 됨
 */
export function useSession(): Session | undefined {
  const [s, setS] = useState<Session | undefined>(undefined);
  useEffect(() => {
    setS(read());
    listeners.add(setS);
    return () => {
      listeners.delete(setS);
    };
  }, []);
  return s;
}

/** 현재 로그인한 팀원 (없으면 null) */
export function useCurrentUser(): Member | null {
  return useSession()?.member ?? null;
}

/** 로그인 토큰을 붙여서 서버 API 호출. 401이면 자동 로그아웃 */
export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${SERVER_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${getToken() ?? ''}`,
      ...init.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) logout();
  if (!res.ok) throw new Error(data.error || '요청에 실패했습니다.');
  return data as T;
}
