'use client';

import { useState } from 'react';
import type { Member } from '../../lib/auth';
import { emitAction, useSynced } from '../../lib/socket';
import { doneColumnId, useKanban } from '../../lib/useKanban';
import { toDateStr, todayStr } from '../../lib/date';
import type { CalendarAction, CalendarEvent, Meeting } from '../../lib/types';
import Link from 'next/link';

interface DayItem {
  id: string;
  title: string;
  assignee: string;
  kind: 'event' | 'task' | 'meeting';
  done?: boolean;
}

const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
const inputCls =
  'w-full text-xs border border-gray-200 dark:border-slate-700 dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500';

export default function CalendarPage() {
  const today = todayStr();
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(today);
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('');

  const events = useSynced<CalendarEvent[]>('calendar', 'calendar:state') ?? [];
  const members = useSynced<Member[]>('team', 'team:state') ?? [];
  const meetings = useSynced<Meeting[]>('meetings', 'meetings:state') ?? [];
  const { state: kanban } = useKanban();
  const doneId = kanban ? doneColumnId(kanban.columns) : undefined;

  // 날짜별로 일정 + 칸반 마감 카드 모으기
  const byDate = new Map<string, DayItem[]>();
  const push = (date: string, item: DayItem) => byDate.set(date, [...(byDate.get(date) ?? []), item]);
  meetings.forEach((m) => push(m.date, { id: m.id, title: m.title, assignee: m.attendees.join(', ') || '참석자 없음', kind: 'meeting' }));
  events.forEach((e) => push(e.date, { id: e.id, title: e.title, assignee: e.assignee, kind: 'event' }));
  kanban?.tasks.forEach(
    (t) => t.dueDate && push(t.dueDate, { id: t.id, title: t.title, assignee: t.assignee, kind: 'task', done: t.statusId === doneId })
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const run = async (action: CalendarAction) => {
    const res = await emitAction('calendar:action', action);
    if (!res.ok) alert(res.error || '처리하지 못했습니다.');
    return res.ok;
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    if (await run({ type: 'event:add', payload: { title: newTitle, date: selectedDate, assignee: newAssignee } })) {
      setNewTitle('');
      setNewAssignee('');
    }
  };

  const goToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(today);
  };

  const selectedItems = byDate.get(selectedDate) ?? [];

  return (
    <div className="space-y-6">
      <header className="border-b border-gray-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">📅 팀 프로젝트 캘린더</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          날짜를 클릭해 일정을 등록하세요. 칸반 카드에 마감일을 넣으면 여기에도 자동으로 표시됩니다.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 달력 */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-slate-800">
            <h2 className="font-bold text-gray-800 dark:text-gray-100 text-base">
              {year}년 {month + 1}월
            </h2>
            <div className="flex gap-1">
              {[
                ['◀', () => setCurrentDate(new Date(year, month - 1, 1))],
                ['오늘', goToday],
                ['▶', () => setCurrentDate(new Date(year, month + 1, 1))],
              ].map(([label, fn]) => (
                <button
                  key={label as string}
                  onClick={fn as () => void}
                  className="px-2.5 py-1 text-xs border border-gray-200 dark:border-slate-700 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  {label as string}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {dayNames.map((day, idx) => (
              <div
                key={day}
                className={`text-xs font-bold py-1.5 ${idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}
              >
                {day}
              </div>
            ))}

            {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-20 bg-gray-50/50 dark:bg-slate-800/30 rounded-lg" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const date = toDateStr(new Date(year, month, dayNum));
              const items = byDate.get(date) ?? [];
              const isSelected = selectedDate === date;
              const isToday = today === date;

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDate(date)}
                  className={`h-20 p-1 rounded-lg border text-left transition flex flex-col gap-0.5 cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/50'
                      : 'border-gray-100 dark:border-slate-800/80 hover:border-gray-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  <span
                    className={`text-xs w-5 h-5 flex items-center justify-center rounded-full shrink-0 ${
                      isToday ? 'bg-blue-600 text-white font-bold' : isSelected ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {items.slice(0, 2).map((it) => (
                    <span
                      key={it.id}
                      className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate w-full ${
                        it.kind === 'meeting'
                          ? 'bg-purple-600 text-white'
                          : it.kind === 'event'
                          ? 'bg-blue-600 text-white'
                          : it.done
                          ? 'bg-gray-100 text-gray-400 line-through dark:bg-slate-800'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                      }`}
                    >
                      {it.title}
                    </span>
                  ))}
                  {items.length > 2 && <span className="text-[10px] text-gray-400 px-1">+{items.length - 2}개</span>}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-600" /> 일정</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-200" /> 칸반 마감</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-purple-600" /> 회의록</span>
          </div>
        </div>

        {/* 선택한 날짜 */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 h-fit">
          <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm border-b border-gray-100 dark:border-slate-800 pb-2">
            📌 {selectedDate} {selectedDate === today && <span className="text-blue-500">(오늘)</span>}
          </h3>

          <form onSubmit={handleAddEvent} className="space-y-2">
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="일정 제목..." className={inputCls} />
            <input value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)} placeholder="담당자 (선택)" list="member-names" className={inputCls} />
            <datalist id="member-names">
              {members.map((m) => (
                <option key={m.id} value={m.name} />
              ))}
            </datalist>
            <button
              type="submit"
              className="w-full bg-gray-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 text-white text-xs font-medium py-2 rounded-lg transition cursor-pointer"
            >
              + 일정 추가
            </button>
          </form>

          <div className="pt-2 border-t border-gray-100 dark:border-slate-800 space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400">이 날의 일정 ({selectedItems.length})</h4>
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {selectedItems.length === 0 && <p className="text-[11px] text-gray-400 py-3 text-center">등록된 일정이 없습니다.</p>}
              {selectedItems.map((it) => (
                <div
                  key={it.id}
                  className="p-2.5 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-lg text-xs flex justify-between items-start gap-2"
                >
                  <div className="min-w-0">
                    {it.kind === 'meeting' ? (
                      <Link href={`/meetings/${it.id}`} className="font-semibold text-purple-600 dark:text-purple-400 hover:underline">
                        🗒️ {it.title}
                      </Link>
                    ) : (
                      <p className={`font-semibold ${it.done ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                        {it.kind === 'task' ? '📋 ' : ''}
                        {it.title}
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400">
                      👤 {it.assignee}
                      {it.kind === 'task' && ' · 칸반 카드 마감'}
                      {it.kind === 'meeting' && ' · 회의록'}
                    </p>
                  </div>
                  {it.kind === 'event' && (
                    <button
                      onClick={() => confirm(`'${it.title}' 일정을 삭제할까요?`) && run({ type: 'event:delete', payload: { id: it.id } })}
                      className="text-gray-400 hover:text-red-500 text-[11px] shrink-0 cursor-pointer"
                    >
                      삭제
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
