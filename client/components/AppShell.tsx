'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '../lib/auth';
import { closeSocket } from '../lib/socket';
import Sidebar from './Sidebar';

/** 로그인 여부에 따라 로그인 화면 / 사이드바가 있는 앱 화면을 보여줍니다. */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (session === undefined) return; // 아직 확인 전
    if (!session && !isLoginPage) {
      closeSocket();
      router.replace('/login');
    }
    if (session && isLoginPage) router.replace('/');
  }, [session, isLoginPage, router]);

  if (isLoginPage) return <main className="flex-1">{children}</main>;

  if (!session) {
    return <main className="flex-1 flex items-center justify-center text-xs text-gray-400">불러오는 중...</main>;
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 min-w-0 px-4 pt-16 pb-8 md:p-8">
        <div className="max-w-[1200px] mx-auto">{children}</div>
      </main>
    </>
  );
}
