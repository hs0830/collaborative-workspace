'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import type { Member } from '../../../lib/auth';
import { emitAction, useSynced } from '../../../lib/socket';
import { useKanban } from '../../../lib/useKanban';
import { formatMeetingDate, MEETING_TEMPLATE, timeAgo } from '../../../lib/meetings';
import { TAGS, type Meeting, type MeetingAction, type Tag } from '../../../lib/types';
import CollaborativeEditor from '../../../components/CollaborativeEditor';
import MeetingForm from '../../../components/MeetingForm';

const inputCls =
  'w-full text-xs border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 rounded-lg px-3 py-2 outline-none focus:border-blue-500';

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = useSearchParams().get('new') === '1';

  const meetings = useSynced<Meeting[]>('meetings', 'meetings:state');
  const members = useSynced<Member[]>('team', 'team:state') ?? [];
  const meeting = meetings?.find((m) => m.id === id);
  const [editing, setEditing] = useState(false);

  // 기본 양식을 넣은 뒤 주소에서 ?new=1 을 지워서, 새로고침해도 양식이 다시 들어가지 않게 함
  const onTemplateApplied = useCallback(() => router.replace(`/meetings/${id}`), [router, id]);

  const run = async (action: MeetingAction) => {
    const res = await emitAction('meeting:action', action);
    if (!res.ok) alert(res.error || '처리하지 못했습니다.');
    return res.ok;
  };

  if (!meetings) return <p className="text-xs text-gray-400">불러오는 중...</p>;

  if (!meeting) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-sm text-gray-500">회의록을 찾을 수 없어요. 삭제되었을 수 있어요.</p>
        <Link href="/meetings" className="text-xs font-semibold text-blue-600 hover:underline">
          ← 회의록 목록으로
        </Link>
      </div>
    );
  }

  const colorOf = (name: string) => members.find((m) => m.name === name)?.color ?? '#9ca3af';

  return (
    <div className="space-y-5">
      <Link href="/meetings" className="no-print text-xs text-gray-500 hover:text-blue-600">
        ← 회의록 목록
      </Link>

      {/* 회의 정보 (인쇄 시에도 출력) */}
      <header className="border-b border-gray-200 dark:border-slate-800 pb-4 flex flex-wrap gap-3 justify-between items-start">
        <div className="space-y-2 min-w-0">
          <div>
            <p className="text-xs font-semibold text-blue-600">{formatMeetingDate(meeting.date)}</p>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white break-words">{meeting.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-gray-500 dark:text-gray-400 mr-1">참석자</span>
            {meeting.attendees.length === 0 && <span className="text-gray-400">없음</span>}
            {meeting.attendees.map((name) => (
              <span
                key={name}
                className="flex items-center gap-1 pl-0.5 pr-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200"
              >
                <span className="w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: colorOf(name) }}>
                  {name.slice(0, 1)}
                </span>
                {name}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-gray-400">
            작성 {meeting.createdBy} · {timeAgo(meeting.updatedAt)} 수정
          </p>
        </div>

        <div className="no-print flex gap-2">
          <button
            onClick={() => setEditing(true)}
            className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-100 text-xs font-medium px-3 py-2 rounded-lg transition"
          >
            정보 수정
          </button>
          <button
            onClick={async () => {
              if (!confirm(`'${meeting.title}' 회의록을 삭제할까요?\n작성한 내용도 함께 삭제되며 되돌릴 수 없습니다.`)) return;
              if (await run({ type: 'meeting:delete', payload: { id: meeting.id } })) router.push('/meetings');
            }}
            className="text-xs text-red-500 hover:text-red-600 px-2"
          >
            삭제
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 items-start">
        <div className="xl:col-span-3">
          <CollaborativeEditor
            room={`meeting-${meeting.id}`}
            label="🗒️ 회의 내용"
            exportName={`${meeting.date} ${meeting.title}`}
            template={isNew ? MEETING_TEMPLATE : undefined}
            onTemplateApplied={onTemplateApplied}
          />
        </div>
        <TodoToKanban meeting={meeting} members={members} />
      </div>

      {editing && (
        <MeetingForm
          title="회의 정보 수정"
          submitLabel="저장"
          members={members}
          initial={{ title: meeting.title, date: meeting.date, attendees: meeting.attendees }}
          onClose={() => setEditing(false)}
          onSubmit={async (data) => {
            if (await run({ type: 'meeting:update', payload: { id: meeting.id, ...data } })) setEditing(false);
          }}
        />
      )}
    </div>
  );
}

/** 회의 중 나온 할 일을 바로 칸반 카드로 등록 */
function TodoToKanban({ meeting, members }: { meeting: Meeting; members: Member[] }) {
  const { dispatch, connected } = useKanban();
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [due, setDue] = useState('');
  const [tag, setTag] = useState<Tag>('기타');
  const [added, setAdded] = useState<string[]>([]);

  // 참석자를 먼저, 나머지 팀원은 뒤에
  const names = [...new Set([...meeting.attendees, ...members.map((m) => m.name)])];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const ok = await dispatch({ type: 'task:add', payload: { title: title.trim(), assignee, dueDate: due, tag } });
    if (!ok) {
      alert('칸반에 추가하지 못했습니다.');
      return;
    }
    setAdded((prev) => [`${title.trim()}${assignee ? ` (${assignee})` : ''}`, ...prev]);
    setTitle('');
    setDue('');
  };

  return (
    <aside className="no-print bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">📋 할 일 → 칸반</h3>
        <p className="text-[11px] text-gray-400 mt-0.5">회의에서 정한 할 일을 바로 칸반 카드로 만들어요.</p>
      </div>

      <form onSubmit={submit} className="space-y-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="할 일 내용" className={inputCls} />
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={inputCls}>
          <option value="">담당자 선택 (선택)</option>
          {names.map((n) => (
            <option key={n} value={n}>
              {n}
              {meeting.attendees.includes(n) ? '' : ' (불참)'}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 xl:grid-cols-1 gap-2">
          <select value={tag} onChange={(e) => setTag(e.target.value as Tag)} className={inputCls}>
            {TAGS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={inputCls} title="마감일 (선택)" />
        </div>
        <button
          type="submit"
          disabled={!connected || !title.trim()}
          className="w-full bg-gray-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 text-white text-xs font-medium py-2 rounded-lg transition disabled:opacity-50"
        >
          + 칸반에 추가
        </button>
      </form>

      {added.length > 0 && (
        <div className="pt-2 border-t border-gray-100 dark:border-slate-800 space-y-1">
          <p className="text-[11px] font-semibold text-emerald-600">✓ 추가됨 ({added.length})</p>
          {added.map((t, i) => (
            <p key={i} className="text-[11px] text-gray-600 dark:text-gray-300 truncate">
              · {t}
            </p>
          ))}
          <Link href="/kanban" className="inline-block text-[11px] text-blue-600 hover:underline pt-1">
            칸반에서 보기 →
          </Link>
        </div>
      )}
    </aside>
  );
}
