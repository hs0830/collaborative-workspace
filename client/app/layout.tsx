'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: '📊 대시보드', href: '/' },
    { name: '📝 실시간 문서', href: '/editor' },
    { name: '📋 작업 & 칸반', href: '/kanban' },
    { name: '📅 팀 캘린더', href: '/calendar' },
    { name: '💾 대용량 데이터셋', href: '/datasets' },
    { name: '💬 팀 채팅', href: '/chat' },
  ];

  return (
    <html lang="ko">
      <body className="flex min-h-screen bg-[#FBFBFA] text-gray-900 font-sans">
        {/* 좌측 사이드바 */}
        <aside className="w-64 bg-[#F7F7F5] border-r border-gray-200/80 p-4 space-y-6 flex flex-col shrink-0">
          <div className="flex items-center gap-2 px-2 font-extrabold text-gray-800 text-lg">
            <span>🚀</span> 워크스페이스
          </div>

          <nav className="space-y-1 flex-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                    isActive
                      ? 'bg-gray-200/80 text-gray-900 font-bold'
                      : 'text-gray-600 hover:bg-gray-200/50 hover:text-gray-900 font-medium'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-1 overflow-y-auto p-8 max-w-[1200px]">{children}</main>
      </body>
    </html>
  );
}