'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCurrentUser, type Member } from '../../lib/auth';
import { emitAction, useSynced } from '../../lib/socket';
import { doneColumnId, useKanban } from '../../lib/useKanban';
import { downloadFile, formatSize, openFile } from '../../lib/files';
import { formatMeetingDate } from '../../lib/meetings';
import type { KanbanTask, Meeting, StoredFile, Work, WorkAction, WorkInput } from '../../lib/types';
import WorkForm from '../../components/WorkForm';

type Kind = 'team' | 'personal' | 'task' | 'meeting' | 'dataset';

interface Entry {
  key: string;
  kind: Kind;
  date: string; // YYYY-MM-DD, 날짜를 모르면 ''
  work?: Work;
  task?: KanbanTask;
  meeting?: Meeting;
  dataset?: StoredFile;
}

const KIND_LABEL: Record<Kind, string> = { team: '팀 작업물', personal: '개인 작업물', task: '완료한 카드', meeting: '회의', dataset: '데이터셋' };
const KIND_STYLE: Record<Kind, string> = {
  team: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  personal: 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  task: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  meeting: 'bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  dataset: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

// ISO 시각 → 현지 날짜 YYYY-MM-DD
const localDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function WorkPage() {
  return (
    <Suspense fallback={<p className="text-xs text-gray-400">불러오는 중...</p>}>
      <WorkRecords />
    </Suspense>
  );
}

function WorkRecords() {
  const router = useRouter();
  const me = useCurrentUser();
  const members = useSynced<Member[]>('team', 'team:state') ?? [];
  const works = useSynced<Work[]>('works', 'works:state');
  const meetings = useSynced<Meeting[]>('meetings', 'meetings:state') ?? [];
  const datasets = useSynced<StoredFile[]>('datasets', 'datasets:state') ?? [];
  const { state: kanban } = useKanban();

  const memberId = useSearchParams().get('member') || me?.id || '';
  const person = members.find((m) => m.id === memberId) ?? (me?.id === memberId ? me : null);
  const isMe = person?.id === me?.id;

  const [filter, setFilter] = useState<'all' | Kind>('all');
  const [editing, setEditing] = useState<Work | 'new' | null>(null);

  const allTasks = kanban?.tasks ?? [];
  const doneId = kanban ? doneColumnId(kanban.columns) : undefined;

  // 이 사람의 기록 모으기
  const entries = useMemo<Entry[]>(() => {
    if (!person) return [];
    const list: Entry[] = [];
    (works ?? []).forEach((w) => {
      const mine =
        w.section === 'team' ? w.ownerId === person.id || w.contributors.some((c) => c.name === person.name) : w.ownerId === person.id;
      if (mine) list.push({ key: `w-${w.id}`, kind: w.section, date: localDate(w.createdAt), work: w });
    });
    allTasks
      .filter((t) => t.assignee === person.name && t.statusId === doneId)
      .forEach((t) => list.push({ key: `t-${t.id}`, kind: 'task', date: t.completedAt ? localDate(t.completedAt) : '', task: t }));
    meetings
      .filter((m) => m.attendees.includes(person.name) || m.createdBy === person.name)
      .forEach((m) => list.push({ key: `m-${m.id}`, kind: 'meeting', date: m.date, meeting: m }));
    datasets
      .filter((d) => (d.uploaderId ? d.uploaderId === person.id : d.uploaderName === person.name))
      .forEach((d) => list.push({ key: `d-${d.id}`, kind: 'dataset', date: localDate(d.createdAt), dataset: d }));
    return list.sort((a, b) => (b.date || '0').localeCompare(a.date || '0'));
  }, [person, works, allTasks, doneId, meetings, datasets]);

  const counts = useMemo(() => {
    const c: Record<Kind, number> = { team: 0, personal: 0, task: 0, meeting: 0, dataset: 0 };
    entries.forEach((e) => c[e.kind]++);
    return c;
  }, [entries]);

  const visible = filter === 'all' ? entries : entries.filter((e) => e.kind === filter);

  // 월별로 묶기 (날짜를 모르는 기록은 맨 뒤)
  const groups = useMemo(() => {
    const map = new Map<string, Entry[]>();
    visible.forEach((e) => {
      const key = e.date ? e.date.slice(0, 7) : 'unknown';
      map.set(key, [...(map.get(key) ?? []), e]);
    });
    return [...map.entries()];
  }, [visible]);

  const run = async (action: WorkAction) => {
    const res = await emitAction('work:action', action);
    if (!res.ok) alert(res.error || '처리하지 못했습니다.');
    return res.ok;
  };

  if (!me || !works) return <p className="text-xs text-gray-400">불러오는 중...</p>;
  if (!person) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-sm text-gray-500">팀원을 찾을 수 없어요.</p>
        <Link href="/work" className="text-xs font-semibold text-blue-600 hover:underline">
          내 작업 기록으로 →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-gray-200 dark:border-slate-800 pb-4 flex flex-wrap gap-3 justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-full text-white font-bold flex items-center justify-center shrink-0" style={{ backgroundColor: person.color }}>
            {person.name.slice(0, 2)}
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">🏅 {isMe ? '내' : `${person.name}님의`} 작업 기록</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              팀 작업물에서 맡은 역할과 개인 작업물, 완료한 카드·참석한 회의·올린 데이터셋이 모여요.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={person.id}
            onChange={(e) => router.push(e.target.value === me.id ? '/work' : `/work?member=${e.target.value}`)}
            className="text-xs border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-gray-100 rounded-lg px-2 py-2 outline-none"
            aria-label="팀원 선택"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.id === me.id ? ' (나)' : ''}
              </option>
            ))}
          </select>
          {isMe && (
            <button
              onClick={() => setEditing('new')}
              className="bg-gray-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition shadow-xs"
            >
              + 작업물 올리기
            </button>
          )}
        </div>
      </header>

      {/* 요약 + 필터 */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {(['all', 'team', 'personal', 'task', 'meeting', 'dataset'] as const).map((k) => {
          const active = filter === k;
          const n = k === 'all' ? entries.length : counts[k];
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`text-left rounded-xl border p-3 transition ${
                active
                  ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40'
                  : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-gray-300 dark:hover:border-slate-700'
              }`}
            >
              <p className="text-[11px] text-gray-500 dark:text-gray-400">{k === 'all' ? '전체' : KIND_LABEL[k]}</p>
              <p className="text-xl font-black text-gray-900 dark:text-white">{n}</p>
            </button>
          );
        })}
      </div>

      {/* 타임라인 */}
      {visible.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-gray-300 dark:border-slate-700 rounded-xl py-14 text-center space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">아직 기록이 없어요.</p>
          {isMe && filter !== 'task' && filter !== 'meeting' && filter !== 'dataset' && (
            <button onClick={() => setEditing('new')} className="text-xs font-semibold text-blue-600 hover:underline">
              첫 작업물 올리기 →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([month, list]) => (
            <section key={month} className="space-y-2">
              <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400">
                {month === 'unknown' ? '완료 날짜 기록 없음 (이 기능을 넣기 전에 완료된 카드)' : `${Number(month.slice(0, 4))}년 ${Number(month.slice(5))}월`} · {list.length}건
              </h2>
              <div className="space-y-2">
                {list.map((e) => (
                  <EntryCard
                    key={e.key}
                    entry={e}
                    personName={person.name}
                    me={me}
                    tasks={allTasks}
                    members={members}
                    onEdit={(w) => setEditing(w)}
                    onDelete={(w) =>
                      confirm(`'${w.title}' 작업물을 삭제할까요?${w.file ? '\n첨부한 파일도 함께 삭제됩니다.' : ''}`) &&
                      run({ type: 'work:delete', payload: { id: w.id } })
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {editing && (
        <WorkForm
          initial={editing === 'new' ? undefined : editing}
          ownerName={editing === 'new' ? me.name : members.find((m) => m.id === editing.ownerId)?.name ?? me.name}
          members={members}
          tasks={allTasks}
          onClose={() => setEditing(null)}
          onSubmit={(data: WorkInput) =>
            editing === 'new' ? run({ type: 'work:add', payload: data }) : run({ type: 'work:update', payload: { id: editing.id, ...data } })
          }
        />
      )}
    </div>
  );
}

function EntryCard({
  entry,
  personName,
  me,
  tasks,
  members,
  onEdit,
  onDelete,
}: {
  entry: Entry;
  personName: string; // 지금 보고 있는 사람
  me: Member;
  tasks: KanbanTask[];
  members: Member[];
  onEdit: (w: Work) => void;
  onDelete: (w: Work) => void;
}) {
  const card = 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 flex gap-3';
  const badge = (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${KIND_STYLE[entry.kind]}`}>{KIND_LABEL[entry.kind]}</span>
  );
  const dateText = entry.date ? `${Number(entry.date.slice(5, 7))}/${Number(entry.date.slice(8))}` : '';
  const dateCol = <span className="w-10 shrink-0 text-xs font-semibold text-gray-400 pt-0.5">{dateText}</span>;

  if ((entry.kind === 'team' || entry.kind === 'personal') && entry.work) {
    const w = entry.work;
    const linked = w.taskId ? tasks.find((t) => t.id === w.taskId) : null;
    const owner = members.find((m) => m.id === w.ownerId);
    const canEdit = w.ownerId === me.id || (w.section === 'team' && w.contributors.some((c) => c.name === me.name));
    const canDelete = w.ownerId === me.id;
    const colorOf = (name: string) => members.find((m) => m.name === name)?.color ?? '#9ca3af';
    return (
      <div className={card}>
        {dateCol}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {badge}
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300">{w.category}</span>
            {w.section === 'team' && owner && <span className="text-[10px] text-gray-400">올린 사람 {owner.name}</span>}
          </div>
          <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 break-words">{w.title}</h3>
          {w.description && <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">{w.description}</p>}
          {w.section === 'team' && w.contributors.length > 0 && (
            <ul className="rounded-lg bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 px-3 py-2 space-y-1">
              {w.contributors.map((c) => {
                const focus = c.name === personName;
                return (
                  <li key={c.name} className={`flex gap-2 text-[11px] ${focus ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                    <span className="flex items-center gap-1 w-20 shrink-0 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colorOf(c.name) }} />
                      {c.name}
                    </span>
                    <span className="break-words min-w-0">
                      {c.role || <span className="text-gray-300 dark:text-slate-600 font-normal">역할 미입력</span>}
                      {focus && <span className="ml-1.5 text-[10px] text-indigo-600 dark:text-indigo-300">← {personName === me.name ? '내' : `${personName}님`} 역할</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] pt-0.5">
            {w.file && (
              <button onClick={() => openFile(w.file!).catch((e) => alert(e.message))} className="text-blue-600 hover:underline text-left">
                📎 {w.file.name} ({formatSize(w.file.size)}){/^image\/|^application\/pdf$/.test(w.file.contentType) ? ' · 보기' : ''}
              </button>
            )}
            {w.file && /^image\/|^application\/pdf$/.test(w.file.contentType) && (
              <button onClick={() => downloadFile(w.file!.id).catch((e) => alert(e.message))} className="text-gray-500 hover:underline">
                다운로드
              </button>
            )}
            {w.linkUrl && (
              <a href={w.linkUrl} target="_blank" rel="noreferrer noopener" className="text-blue-600 hover:underline break-all">
                🔗 {w.linkUrl.replace(/^https?:\/\//, '').slice(0, 50)}
              </a>
            )}
            {linked && <span className="text-gray-500">📋 {linked.title}</span>}
          </div>
        </div>
        {(canEdit || canDelete) && (
          <div className="flex flex-col gap-1 text-[11px] shrink-0">
            {canEdit && (
              <button onClick={() => onEdit(w)} className="text-gray-500 hover:text-blue-600">
                수정
              </button>
            )}
            {canDelete && (
              <button onClick={() => onDelete(w)} className="text-red-400 hover:text-red-600">
                삭제
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (entry.kind === 'task' && entry.task) {
    const t = entry.task;
    return (
      <div className={card}>
        {dateCol}
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
          {badge}
          <span className="text-sm text-gray-800 dark:text-gray-100">{t.title}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-500">{t.tag}</span>
        </div>
      </div>
    );
  }

  if (entry.kind === 'meeting' && entry.meeting) {
    const m = entry.meeting;
    return (
      <Link href={`/meetings/${m.id}`} className={`${card} hover:border-purple-400 transition`}>
        {dateCol}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {badge}
            <span className="text-sm text-gray-800 dark:text-gray-100">{m.title}</span>
          </div>
          <p className="text-[11px] text-gray-400 truncate">
            {formatMeetingDate(m.date)} · 참석 {m.attendees.length}명{m.preview ? ` · ${m.preview}` : ''}
          </p>
        </div>
      </Link>
    );
  }

  if (entry.kind === 'dataset' && entry.dataset) {
    const d = entry.dataset;
    return (
      <div className={card}>
        {dateCol}
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
          {badge}
          <span className="text-sm text-gray-800 dark:text-gray-100 break-all">{d.name}</span>
          <span className="text-[11px] text-gray-400">{formatSize(d.size)}</span>
        </div>
      </div>
    );
  }

  return null;
}
