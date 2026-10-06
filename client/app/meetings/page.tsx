'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCurrentUser, type Member } from '../../lib/auth';
import { emitAction, useSynced } from '../../lib/socket';
import { todayStr } from '../../lib/date';
import type { Meeting } from '../../lib/types';
import MeetingForm from '../../components/MeetingForm';
import { formatMeetingDate, timeAgo } from '../../lib/meetings';


export default function MeetingsPage() {
  const router = useRouter();
  const me = useCurrentUser();
  const meetings = useSynced<Meeting[]>('meetings', 'meetings:state');
  const members = useSynced<Member[]>('team', 'team:state') ?? [];

  const [query, setQuery] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [creating, setCreating] = useState(false);

  const colorOf = (name: string) => members.find((m) => m.name === name)?.color ?? '#9ca3af';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (meetings ?? []).filter((m) => {
      if (onlyMine && me && !m.attendees.includes(me.name) && m.createdBy !== me.name) return false;
      if (!q) return true;
      return [m.title, m.preview, m.date, ...m.attendees].some((v) => v.toLowerCase().includes(q));
    });
  }, [meetings, query, onlyMine, me]);

  // 월별로 묶기
  const groups = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    filtered.forEach((m) => {
      const key = m.date.slice(0, 7);
      map.set(key, [...(map.get(key) ?? []), m]);
    });
    return [...map.entries()];
  }, [filtered]);

  const handleCreate = async (data: { title: string; date: string; attendees: string[] }) => {
    const res = await emitAction<{ ok: boolean; id?: string; error?: string }>('meeting:action', { type: 'meeting:add', payload: data });
    if (!res.ok || !res.id) {
      alert(res.error || '회의록을 만들지 못했습니다.');
      return;
    }
    router.push(`/meetings/${res.id}?new=1`);
  };

  return (
    <div className="space-y-6">
      <header className="border-b border-gray-200 dark:border-slate-800 pb-4 flex flex-wrap gap-3 justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">🗒️ 회의록</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            회의록을 팀원들과 함께 실시간으로 작성하세요. 입력한 내용은 자동으로 저장됩니다.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="bg-gray-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition shadow-xs"
        >
          + 새 회의록
        </button>
      </header>

      {/* 검색·필터 */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목, 내용, 참석자로 검색..."
          className="flex-1 min-w-48 text-xs border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-gray-100 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
        />
        {(['전체', '내가 참석한 회의'] as const).map((label, i) => {
          const active = onlyMine === (i === 1);
          return (
            <button
              key={label}
              onClick={() => setOnlyMine(i === 1)}
              className={`px-3 py-2 text-xs rounded-lg transition ${
                active ? 'bg-gray-900 text-white font-bold dark:bg-white dark:text-gray-900' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* 목록 */}
      {!meetings ? (
        <p className="text-xs text-gray-400">불러오는 중...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-gray-300 dark:border-slate-700 rounded-xl py-14 text-center space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {meetings.length === 0 ? '아직 회의록이 없어요.' : '검색 결과가 없어요.'}
          </p>
          {meetings.length === 0 && (
            <button onClick={() => setCreating(true)} className="text-xs font-semibold text-blue-600 hover:underline">
              첫 회의록 작성하기 →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([month, list]) => (
            <section key={month} className="space-y-2">
              <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400">
                {Number(month.slice(0, 4))}년 {Number(month.slice(5))}월 · {list.length}건
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {list.map((m) => (
                  <Link
                    key={m.id}
                    href={`/meetings/${m.id}`}
                    className="group bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 hover:border-blue-500 hover:shadow-md transition flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-[11px] font-semibold ${m.date === todayStr() ? 'text-blue-600' : 'text-gray-400'}`}>
                          {formatMeetingDate(m.date)}
                          {m.date === todayStr() && ' · 오늘'}
                        </p>
                        <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition truncate">{m.title}</h3>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0 pt-0.5">{timeAgo(m.updatedAt)} 수정</span>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 min-h-8">
                      {m.preview || <span className="text-gray-300 dark:text-slate-600">아직 작성된 내용이 없어요</span>}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex -space-x-1.5">
                        {m.attendees.slice(0, 6).map((name) => (
                          <span
                            key={name}
                            title={name}
                            className="w-6 h-6 rounded-full text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white dark:ring-slate-900"
                            style={{ backgroundColor: colorOf(name) }}
                          >
                            {name.slice(0, 1)}
                          </span>
                        ))}
                        {m.attendees.length > 6 && (
                          <span className="w-6 h-6 rounded-full text-[10px] bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-200 flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                            +{m.attendees.length - 6}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400">작성 {m.createdBy}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {creating && (
        <MeetingForm
          title="새 회의록"
          submitLabel="만들고 작성하기"
          members={members}
          initial={{ title: '', date: todayStr(), attendees: me ? [me.name] : [] }}
          onClose={() => setCreating(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
