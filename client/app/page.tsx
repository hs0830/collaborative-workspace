'use client';

import Link from 'next/link';
import type { Member } from '../lib/auth';
import { useSynced } from '../lib/socket';
import { doneColumnId, useKanban } from '../lib/useKanban';
import { daysUntil } from '../lib/date';
import type { CalendarEvent } from '../lib/types';

export default function DashboardPage() {
  const { state: kanban } = useKanban();
  const members = useSynced<Member[]>('team', 'team:state') ?? [];
  const events = useSynced<CalendarEvent[]>('calendar', 'calendar:state') ?? [];

  if (!kanban) return <p className="text-xs text-gray-400">불러오는 중...</p>;

  const tasks = kanban.tasks;
  const doneId = doneColumnId(kanban.columns);
  const firstId = kanban.columns[0]?.id;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.statusId === doneId).length;
  const todoTasks = tasks.filter((t) => t.statusId === firstId && firstId !== doneId).length;
  const inProgressTasks = totalTasks - completedTasks - todoTasks;
  const progressPercent = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 팀원별 담당 (등록된 팀원 + 칸반에만 있는 담당자 이름)
  const names = new Map<string, string>(members.map((m) => [m.name, m.color]));
  tasks.forEach((t) => !names.has(t.assignee) && names.set(t.assignee, '#9ca3af'));
  const distribution = [...names.entries()]
    .map(([name, color]) => {
      const mine = tasks.filter((t) => t.assignee === name);
      return { name, color, total: mine.length, done: mine.filter((t) => t.statusId === doneId).length, role: members.find((m) => m.name === name)?.role };
    })
    .filter((d) => d.total > 0 || members.some((m) => m.name === d.name))
    .sort((a, b) => b.total - a.total);
  const maxTasks = Math.max(1, ...distribution.map((d) => d.total));

  // 다가오는 마감 (미완료 카드 + 일정, 14일 이내 / 지난 것 포함)
  const upcoming = [
    ...tasks
      .filter((t) => t.dueDate && t.statusId !== doneId)
      .map((t) => ({ id: t.id, title: t.title, who: t.assignee, date: t.dueDate, kind: '카드' })),
    ...events.map((e) => ({ id: e.id, title: e.title, who: e.assignee, date: e.date, kind: '일정' })),
  ]
    .map((x) => ({ ...x, d: daysUntil(x.date) }))
    .filter((x) => x.d <= 14 && (x.kind === '카드' || x.d >= 0))
    .sort((a, b) => a.d - b.d)
    .slice(0, 8);

  const card = 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl';

  return (
    <div className="space-y-6">
      <header className="border-b border-gray-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">📊 프로젝트 현황 대시보드</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">칸반 보드와 캘린더의 실제 데이터로 계산됩니다.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`${card} p-4 space-y-2`}>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">전체 진행률</span>
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-black text-gray-900 dark:text-white">{progressPercent}%</span>
            <span className="text-xs text-blue-600 font-bold">
              {completedTasks}/{totalTasks} 완료
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
        <Stat card={card} color="text-amber-600" label="📋 대기 중 카드" value={todoTasks} sub="우선순위 지정 필요" />
        <Stat card={card} color="text-blue-600" label="⚡ 진행 중 카드" value={inProgressTasks} sub="실시간 진행 작업" />
        <Stat card={card} color="text-emerald-600" label="✅ 완료된 카드" value={completedTasks} sub="목표 달성" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${card} p-6 space-y-4`}>
          <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">👥 팀원별 담당 과제</h3>
          {distribution.length === 0 ? (
            <p className="text-xs text-gray-400">칸반 카드에 담당자를 지정하면 표시됩니다.</p>
          ) : (
            <div className="space-y-3">
              {distribution.map((m) => (
                <div key={m.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-800 dark:text-gray-200">
                      {m.name} {m.role && <span className="text-gray-400 font-normal">({m.role})</span>}
                    </span>
                    <span className="text-gray-500">
                      {m.done}/{m.total} 완료
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div className="h-2.5 rounded-full relative transition-all duration-500" style={{ width: `${(m.total / maxTasks) * 100}%`, backgroundColor: `${m.color}55` }}>
                      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: m.total ? `${(m.done / m.total) * 100}%` : 0, backgroundColor: m.color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`${card} p-6 space-y-4`}>
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">⏰ 다가오는 마감 (2주)</h3>
            <Link href="/calendar" className="text-[11px] text-blue-600 hover:underline">
              캘린더 →
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-xs text-gray-400">2주 안에 마감되는 작업이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((u) => (
                <li key={u.id} className="flex items-center gap-3 text-xs">
                  <span
                    className={`w-14 shrink-0 text-center font-bold rounded-md py-1 ${
                      u.d < 0 ? 'bg-red-100 text-red-600 dark:bg-red-950/50' : u.d <= 3 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300'
                    }`}
                  >
                    {u.d < 0 ? `${-u.d}일 지남` : u.d === 0 ? '오늘' : `D-${u.d}`}
                  </span>
                  <span className="truncate text-gray-800 dark:text-gray-200">{u.title}</span>
                  <span className="ml-auto shrink-0 text-gray-400 text-[11px]">
                    {u.kind} · {u.who}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ card, color, label, value, sub }: { card: string; color: string; label: string; value: number; sub: string }) {
  return (
    <div className={`${card} p-4 space-y-1`}>
      <span className={`text-xs font-bold ${color}`}>{label}</span>
      <p className="text-2xl font-black text-gray-900 dark:text-white">{value}개</p>
      <p className="text-[10px] text-gray-400">{sub}</p>
    </div>
  );
}
