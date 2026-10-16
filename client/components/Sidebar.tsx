'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout, updateMe, useCurrentUser, type Member } from '../lib/auth';
import { useSynced } from '../lib/socket';
import { doneColumnId, useKanban } from '../lib/useKanban';
import type { CalendarEvent } from '../lib/types';
import { daysUntil, todayStr } from '../lib/date';
import { useChatUnread } from '../lib/useChatUnread';
import {
  Award,
  Bell,
  CalendarDays,
  CalendarClock,
  Database,
  FileText,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Moon,
  NotebookPen,
  SquareKanban,
  Sun,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import Logo from './Logo';

const navItems: { name: string; href: string; icon: LucideIcon }[] = [
  { name: '대시보드', href: '/', icon: LayoutDashboard },
  { name: '진행 현황', href: '/progress', icon: TrendingUp },
  { name: '팀원 관리', href: '/team', icon: Users },
  { name: '작업 기록', href: '/work', icon: Award },
  { name: '실시간 문서', href: '/editor', icon: FileText },
  { name: '회의록', href: '/meetings', icon: NotebookPen },
  { name: '작업 & 칸반', href: '/kanban', icon: SquareKanban },
  { name: '팀 캘린더', href: '/calendar', icon: CalendarDays },
  { name: '대용량 데이터셋', href: '/datasets', icon: Database },
  { name: '팀 채팅', href: '/chat', icon: MessageSquare },
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
        title: d < 0 ? `마감 ${-d}일 지남` : d === 0 ? '오늘 마감' : `마감 ${d}일 전`,
        text: `${t.title} (${t.assignee})`,
        urgent: d <= 0,
        href: '/kanban',
      });
    });
    events?.forEach((e) => {
      const d = daysUntil(e.date);
      if (d < 0 || d > 3) return;
      list.push({ id: e.id, title: d === 0 ? '오늘 일정' : `일정 ${d}일 전`, text: e.title, urgent: d === 0, href: '/calendar' });
    });
    return list.sort((a, b) => Number(b.urgent) - Number(a.urgent));
  }, [kanban, events]);

  // 안 읽은 팀 채팅
  const { unread: unreadChat } = useChatUnread(me?.id, pathname.startsWith('/chat'));
  const lastChat = unreadChat[unreadChat.length - 1];
  const chatPreview = lastChat ? `${lastChat.sender}: ${lastChat.text || (lastChat.file ? `파일 ${lastChat.file.name}` : '')}` : '';
  const hasAlert = notifications.length > 0 || unreadChat.length > 0;

  // 브라우저 탭 제목에도 안 읽은 개수 표시
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\+?\) /, '');
    document.title = unreadChat.length ? `(${unreadChat.length > 99 ? '99+' : unreadChat.length}) ${base}` : base;
  }, [unreadChat.length, pathname]);

  return (
    <>
      {/* 모바일 상단 바 */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-12 flex items-center justify-between px-3 bg-[#F7F7F5]/95 dark:bg-slate-900/95 backdrop-blur border-b border-gray-200 dark:border-slate-800">
        <button onClick={() => setMobileOpen(true)} className="relative p-1.5 rounded-lg text-gray-700 dark:text-gray-200" aria-label="메뉴 열기">
          <Menu size={20} />
          {hasAlert && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#F7F7F5] dark:ring-slate-900" />}
        </button>
        <Logo size="sm" />
        <span className="w-8" />
      </div>
      {mobileOpen && <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)} />}

      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-[#F7F7F5] dark:bg-slate-900 border-r border-gray-200/80 dark:border-slate-800 p-4 space-y-6 flex flex-col shrink-0 transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* 헤더 및 스위치 영역 */}
        <div className="relative flex items-center justify-between px-2">
          <Logo />
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-1.5 rounded-lg hover:bg-gray-200/60 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 relative"
              title="알림 센터"
              aria-label="알림 센터"
            >
              <Bell size={17} strokeWidth={1.75} />
              {hasAlert && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#F7F7F5] dark:ring-slate-900" />}
            </button>

            <button
              onClick={toggleDark}
              className="p-1.5 rounded-lg hover:bg-gray-200/60 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400"
              title="다크 모드 전환"
              aria-label="다크 모드 전환"
            >
              {isDarkMode ? <Sun size={17} strokeWidth={1.75} /> : <Moon size={17} strokeWidth={1.75} />}
            </button>

            {showNotifications && (
              <div className="absolute top-10 inset-x-0 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 p-3 space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-slate-700">
                  <span className="font-bold text-gray-800 dark:text-gray-200">알림</span>
                  <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600" aria-label="닫기">
                    <X size={14} />
                  </button>
                </div>
                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {unreadChat.length > 0 && (
                    <Link
                      href="/chat"
                      onClick={() => setShowNotifications(false)}
                      className="flex gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40"
                    >
                      <MessageSquare size={14} className="shrink-0 mt-0.5 text-blue-500" />
                      <span className="min-w-0 flex-1 space-y-0.5">
                        <span className="block font-semibold text-blue-700 dark:text-blue-300">새 채팅 {unreadChat.length}개</span>
                        <span className="block text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 break-words">{chatPreview}</span>
                      </span>
                    </Link>
                  )}
                  {notifications.length === 0 && unreadChat.length === 0 ? (
                    <p className="text-center text-gray-400 py-4">새 알림이 없습니다.</p>
                  ) : (
                    notifications.map((n) => (
                      <Link
                        key={n.id}
                        href={n.href}
                        onClick={() => setShowNotifications(false)}
                        className={`flex gap-2 p-2 rounded-lg ${n.urgent ? 'bg-red-50 dark:bg-red-950/40' : 'bg-gray-50 dark:bg-slate-700/60'}`}
                      >
                        <CalendarClock size={14} className={`shrink-0 mt-0.5 ${n.urgent ? 'text-red-500' : 'text-gray-400'}`} />
                        <span className="min-w-0 flex-1 space-y-0.5">
                          <span className={`block font-semibold ${n.urgent ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>{n.title}</span>
                          <span className="block text-[11px] text-gray-500 dark:text-gray-400 break-words">{n.text}</span>
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 메뉴 리스트 */}
        <nav className="space-y-0.5 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                  isActive
                    ? 'bg-gray-200/80 dark:bg-slate-800 text-gray-900 dark:text-white font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-slate-800/60 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon size={17} strokeWidth={isActive ? 2 : 1.75} className={isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'} />
                <span>{item.name}</span>
                {item.href === '/chat' && unreadChat.length > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadChat.length > 99 ? '99+' : unreadChat.length}
                  </span>
                )}
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
