import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '../components/Sidebar';

export const metadata: Metadata = {
  title: 'Team Collaborative Workspace',
  description: 'Real-time collaborative workspace for team project',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="flex min-h-screen bg-[#FBFBFA] dark:bg-slate-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
        {/* 분리된 분리형 사이드바 컴포넌트 */}
        <Sidebar />

        {/* 기존 메인 콘텐츠 영역 그대로 유지 */}
        <main className="flex-1 overflow-y-auto p-8 max-w-[1200px]">
          {children}
        </main>
      </body>
    </html>
  );
}