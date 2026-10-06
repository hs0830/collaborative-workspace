'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout, updateMe, useCurrentUser, type Member } from '../lib/auth';
import { useSynced } from '../lib/socket';
import { doneColumnId, useKanban } from '../lib/useKanban';
import type { CalendarEvent } from '../lib/types';
import { daysUntil, todayStr } from '../lib/date';

const navItems = [
  { name: '대시보드', href: '/', icon: '📊' },
  { name: '팀원 관리', href: '/team', icon: '👥' },
  { name: '실시간 문서', href: '/editor', icon: '📝' },
  { name: '작업 & 칸반', href: '/kanban', icon: '📋' },
  { name: '팀 캘린더', href: '/calendar', icon: '📅' },
  { name: '대용량 데이터셋', href: '/datasets', icon: '💾' },
  { name: '팀 채팅', href: '/chat', icon: '💬' },
];

const THEME_KEY = 'workspace:theme';

export default function Sidebar() {
  const pathname = usePathname();
  const me = useCurrentUser();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // 다크 모드: 저장된 설정 → 없으면 OS 설정 따름
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(THEME_KEY);
    } catch {
      /* 무시 */
    }
    setIsDarkMode(saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);

  const toggleDark = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    try {
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    } catch {
      /* 무시 */
    }
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // 페이지를 옮기면 모바일 메뉴 닫기
  useEffect(() => setMobileOpen(false), [pathname]);

  // 서버 데이터가 바뀌면 내 정보(이름 등)도 갱신
  const members = useSynced<Member[]>('team', 'team:state');
  useEffect(() => {
    const fresh = members?.find((m) => m.id === me?.id);
    if (fresh && (fresh.name !== me?.name || fresh.color !== me?.color)) updateMe(fresh);
  }, [members, me]);

  // 알림: 3일 이내 마감 / 지난 마감인 미완료 작업 + 다가오는 일정
  const { state: kanban } = useKanban();
  const events = useSynced<CalendarEvent[]>('calendar', 'calendar:state');
  const notifications = useMemo(() => {
    const list: { id: string; title: string; text: string; urgent: boolean; href: string }[] = [];
    const doneCol = kanban ? doneColumnId(kanban.columns) : undefined;
    kanban?.tasks.forEach((t) => {
      if (!t.dueDate || t.statusId === doneCol) return;
      const d = daysUntil(t.dueDate);
      if (d > 3) return;
      list.push({
        id: t.id,
        title: d < 0 ? '⏰ 마감 지남' : d === 0 ? '🔥 오늘 마감' : `📌 마감 ${d}일 전`,
        text: `${t.title} (${t.assignee})`,
        urgent: d <= 0,
        href: '/kanban',
      });
    });
    events?.forEach((e) => {
      const d = daysUntil(e.date);
      if (d < 0 || d > 3) return;
      list.push({ id: e.id, title: d === 0 ? '📅 오늘 일정' : `📅 일정 ${d}일 전`, text: e.title, urgent: d === 0, href: '/calendar' });
    });
    return list.sort((a, b) => Number(b.urgent) - Number(a.urgent));
  }, [kanban, events]);

  return (
    <>
      {/* 모바일 상단 바 */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-12 flex items-center justify-between px-4 bg-[#F7F7F5]/95 dark:bg-slate-900/95 backdrop-blur border-b border-gray-200 dark:border-slate-800">
        <button onClick={() => setMobileOpen(true)} className="text-lg px-1 cursor-pointer" aria-label="메뉴 열기">
          ☰
        </button>
        <span className="font-extrabold text-sm text-gray-800 dark:text-gray-100">🚀 워크스페이스</span>
        <span className="w-6" />
      </div>
      {mobileOpen && <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)} />}

      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-[#F7F7F5] dark:bg-slate-900 border-r border-gray-200/80 dark:border-slate-800 p-4 space-y-6 flex flex-col shrink-0 transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* 헤더 및 스위치 영역 */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2 font-extrabold text-gray-800 dark:text-gray-100 text-lg">
            <span>🚀</span> 워크스페이스
          </div>
          <div className="flex items-center gap-1 relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-1.5 text-xs rounded-lg hover:bg-gray-200/60 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300 relative cursor-pointer"
              title="알림 센터"
            >
              🔔
              {notifications.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
            </button>

            <button
              onClick={toggleDark}
              className="p-1.5 text-xs rounded-lg hover:bg-gray-200/60 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300 cursor-pointer"
              title="다크 모드 전환"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>

            {showNotifications && (
              <div className="absolute top-9 right-0 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 p-3 space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-slate-700">
                  <span className="font-bold text-gray-800 dark:text-gray-200">🔔 알림 센터</span>
                  <button onClick={() => setShowNotifications(false)} className="text-gray-400 cursor-pointer">
                    ✕
                  </button>
                </div>
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-center text-gray-400 py-4">다가오는 마감이 없습니다 🎉</p>
                  ) : (
                    notifications.map((n) => (
                      <Link
                        key={n.id}
                        href={n.href}
                        onClick={() => setShowNotifications(false)}
                        className={`block p-2 rounded-lg space-y-0.5 ${n.urgent ? 'bg-red-50 dark:bg-red-950/40' : 'bg-gray-50 dark:bg-slate-700/60'}`}
                      >
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{n.title}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">{n.text}</p>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 메뉴 리스트 */}
        <nav className="space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                  isActive
                    ? 'bg-gray-200/80 dark:bg-blue-600 text-gray-900 dark:text-white font-bold'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-200 font-medium'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* 내 정보 */}
        {me && (
          <div className="flex items-center gap-2 px-2 py-1.5 border-t border-gray-200 dark:border-slate-800 pt-3">
            <span
              className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
              style={{ backgroundColor: me.color }}
            >
              {me.name.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{me.name}</p>
              <p className="text-[10px] text-gray-400">오늘 {todayStr().slice(5).replace('-', '/')}</p>
            </div>
            <button
              onClick={() => confirm('로그아웃할까요?') && logout()}
              className="ml-auto text-[11px] text-gray-400 hover:text-red-500 cursor-pointer"
            >
              로그아웃
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
