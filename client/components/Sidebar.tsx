'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // HTML 태그에 dark 클래스 토글
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  const notifications = [
    { id: '1', title: '새 할 일 추가됨', text: '강현승님이 새 과제를 할당했습니다.', time: '10분 전' },
    { id: '2', title: '캘린더 마감 임박', text: '데이터셋 1차 정제 마감일이 3일 남았습니다.', time: '1시간 전' },
  ];

  const navItems = [
    { name: '대시보드', href: '/', icon: '📊' },
    { name: '팀원 관리', href: '/team', icon: '👥' },
    { name: '실시간 문서', href: '/editor', icon: '📝' },
    { name: '작업 & 칸반', href: '/kanban', icon: '📋' },
    { name: '팀 캘린더', href: '/calendar', icon: '📅' },
    { name: '대용량 데이터셋', href: '/datasets', icon: '💾' },
    { name: '팀 채팅', href: '/chat', icon: '💬' },
  ];

  return (
    <aside className="w-64 bg-[#F7F7F5] dark:bg-slate-900 border-r border-gray-200/80 dark:border-slate-800 p-4 space-y-6 flex flex-col shrink-0 transition-colors duration-200">
      {/* 헤더 및 스위치 영역 */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 font-extrabold text-gray-800 dark:text-gray-100 text-lg">
          <span>🚀</span> 워크스페이스
        </div>
        <div className="flex items-center gap-1 relative">
          {/* 알림 버튼 */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 text-xs rounded-lg hover:bg-gray-200/60 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300 relative cursor-pointer"
            title="알림 센터"
          >
            🔔
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* 다크 모드 토글 스위치 */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-1.5 text-xs rounded-lg hover:bg-gray-200/60 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300 cursor-pointer"
            title="다크 모드 전환"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>

          {/* 알림 드롭다운 */}
          {showNotifications && (
            <div className="absolute top-9 left-0 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 p-3 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-slate-700">
                <span className="font-bold text-gray-800 dark:text-gray-200">🔔 알림 센터</span>
                <button onClick={() => setShowNotifications(false)} className="text-gray-400">✕</button>
              </div>
              <div className="space-y-1.5">
                {notifications.map((n) => (
                  <div key={n.id} className="p-2 bg-gray-50 dark:bg-slate-700/60 rounded-lg space-y-0.5">
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{n.title}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{n.text}</p>
                    <p className="text-[9px] text-gray-400 text-right">{n.time}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 메뉴 리스트 */}
      <nav className="space-y-1 flex-1">
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
    </aside>
  );
}