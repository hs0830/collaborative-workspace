import { Layers3 } from 'lucide-react';

/** 사이드바·로그인 화면 로고 */
export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'w-6 h-6 rounded-md' : 'w-7 h-7 rounded-lg';
  const icon = size === 'sm' ? 14 : 16;
  return (
    <span className="flex items-center gap-2">
      <span className={`${box} bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center shrink-0`}>
        <Layers3 size={icon} strokeWidth={2} />
      </span>
      <span className={`font-bold tracking-tight text-gray-900 dark:text-gray-100 ${size === 'sm' ? 'text-sm' : 'text-base'}`}>워크스페이스</span>
    </span>
  );
}
