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

  // 파일을 업로드 영역 밖에 떨어뜨리면 브라우저가 그 파일을 열거나 다운로드해 버리므로 막음
  // (텍스트 끌어다 놓기는 그대로 두고, 파일일 때만)
  useEffect(() => {
    const block = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
    };
    window.addEventListener('dragover', block);
    window.addEventListener('drop', block);
    return () => {
      window.removeEventListener('dragover', block);
      window.removeEventListener('drop', block);
    };
  }, []);

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
