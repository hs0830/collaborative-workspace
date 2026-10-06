import type { Metadata } from 'next';
import './globals.css';
import AppShell from '../components/AppShell';

export const metadata: Metadata = {
  title: 'Team Collaborative Workspace',
  description: 'Real-time collaborative workspace for team project',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <body className="flex min-h-screen bg-[#FBFBFA] dark:bg-slate-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
