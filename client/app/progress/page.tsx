'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCurrentUser, type Member } from '../../lib/auth';
import { emitAction, useSynced } from '../../lib/socket';
import { doneColumnId, useKanban } from '../../lib/useKanban';
import { toDateStr, todayStr } from '../../lib/date';
import type { CalendarEvent, Meeting, ProgressAction, ProgressEntry } from '../../lib/types';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
type Range = '2w' | 'month' | 'all';
interface Hint {
  key: string;
  kind: string;
  text: string;
}

const shortDate = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8))}`;
const weekday = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
};
const localDate = (iso: string) => toDateStr(new Date(iso));
const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default function ProgressPage() {
  return (
    <Suspense fallback={<p className="text-xs text-gray-400">불러오는 중...</p>}>
      <ProgressView />
    </Suspense>
  );
}

function ProgressView() {
  const router = useRouter();
  const me = useCurrentUser();
  const members = useSynced<Member[]>('team', 'team:state') ?? [];
  const entries = useSynced<ProgressEntry[]>('progress', 'progress:state');
  const meetings = useSynced<Meeting[]>('meetings', 'meetings:state') ?? [];
  const events = useSynced<CalendarEvent[]>('calendar', 'calendar:state') ?? [];
  const { state: kanban } = useKanban();
  const today = todayStr();

  // 보고 있는 탭: 팀원 id 또는 'all' (주소의 ?member= 로 기억)
  const tab = useSearchParams().get('member') || me?.id || 'all';
  const setTab = (id: string) => router.replace(id === me?.id ? '/progress' : `/progress?member=${id}`);

  const [range, setRange] = useState<Range>('all');
  const [newestFirst, setNewestFirst] = useState(false);
  // 수정 중인 행: '팀원id|날짜' 또는 '팀원id|new'
  const [editing, setEditing] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 내 탭이 맨 앞
  const ordered = useMemo(
    () => [...members].sort((a, b) => Number(b.id === me?.id) - Number(a.id === me?.id)),
    [members, me?.id]
  );

  // 기간 필터 + 정렬 (예정된 날짜는 항상 표시)
  const filterRows = (list: ProgressEntry[]) => {
    const now = new Date();
    const from =
      range === '2w'
        ? toDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13))
        : range === 'month'
        ? toDateStr(new Date(now.getFullYear(), now.getMonth(), 1))
        : '';
    const rows = list.filter((e) => !from || e.date >= from);
    return newestFirst ? [...rows].reverse() : rows;
  };
  const rowsOf = (memberId: string) => filterRows((entries ?? []).filter((e) => e.memberId === memberId));

  // 이 사람·이 날짜의 참고 정보: 담당자로 완료한 칸반 카드, 참석한 회의, 일정
  const hintsFor = (person: Member, date: string): Hint[] => {
    const doneId = kanban ? doneColumnId(kanban.columns) : undefined;
    const tasks = (kanban?.tasks ?? []).filter(
      (t) => t.assignee === person.name && t.statusId === doneId && t.completedAt && localDate(t.completedAt) === date
    );
    const dayMeetings = meetings.filter((m) => m.date === date && (m.attendees.includes(person.name) || m.createdBy === person.name));
    const dayEvents = events.filter((e) => e.date === date && (e.assignee === person.name || e.assignee === '전체'));
    return [
      ...tasks.map((t) => ({ key: `t-${t.id}`, kind: '완료 카드', text: t.title })),
      ...dayMeetings.map((m) => ({ key: `m-${m.id}`, kind: '회의', text: m.title })),
      ...dayEvents.map((e) => ({ key: `e-${e.id}`, kind: '일정', text: e.title })),
    ];
  };

  const run = async (action: ProgressAction) => {
    const res = await emitAction('progress:action', action);
    if (!res.ok) alert(res.error || '저장하지 못했습니다.');
    return res.ok;
  };

  // 지금 탭 기준으로 복사할 표들 (전체 탭이면 팀원별로)
  const tablesForExport = () =>
    (tab === 'all' ? ordered : ordered.filter((m) => m.id === tab))
      .map((m) => ({ member: m, rows: rowsOf(m.id) }))
      .filter((t) => t.rows.length > 0);

  // Word·한글에 붙여 넣으면 표로 들어가도록 HTML 표로 복사
  const copyTable = async () => {
    const cell = 'border:1px solid #999;padding:4px 8px';
    const tables = tablesForExport();
    const html = tables
      .map(({ member, rows }) => {
        const body = rows
          .map((e) => {
            const dateCell = `${shortDate(e.date)}${e.date === today ? '<br>오늘' : e.date > today ? '<br>(예정)' : ''}`;
            const work = `${e.label ? `<b>${escapeHtml(e.label)}</b> ` : ''}${escapeHtml(e.text).replace(/\n/g, '<br>')}`;
            return `<tr><td style="${cell};text-align:center;font-weight:bold;white-space:nowrap">${dateCell}</td><td style="${cell}">${work}</td></tr>`;
          })
          .join('');
        return `<p><b>${escapeHtml(member.name)}</b>${member.role ? ` (${escapeHtml(member.role)})` : ''}</p><table style="border-collapse:collapse"><tr><th style="${cell}">날짜</th><th style="${cell}">핵심 작업</th></tr>${body}</table>`;
      })
      .join('<p></p>');
    const plain = tables
      .map(({ member, rows }) =>
        [member.name, '날짜\t핵심 작업', ...rows.map((e) => `${shortDate(e.date)}\t${e.label ? e.label + ' ' : ''}${e.text.replace(/\n/g, ' ')}`)].join('\n')
      )
      .join('\n\n');
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([plain], { type: 'text/plain' }) }),
      ]);
    } catch {
      // 오래된 브라우저: 화면 밖에 그린 표를 선택해서 복사
      const box = document.createElement('div');
      box.innerHTML = html;
      box.style.position = 'fixed';
      box.style.left = '-9999px';
      document.body.appendChild(box);
      const sel = window.getSelection();
      const r = document.createRange();
      r.selectNodeContents(box);
      sel?.removeAllRanges();
      sel?.addRange(r);
      document.execCommand('copy');
      sel?.removeAllRanges();
      box.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadMarkdown = () => {
    const md = tablesForExport()
      .map(({ member, rows }) =>
        [
          `## ${member.name}${member.role ? ` (${member.role})` : ''}`,
          '',
          '| 날짜 | 핵심 작업 |',
          '|---|---|',
          ...rows.map(
            (e) =>
              `| ${shortDate(e.date)}${e.date === today ? ' 오늘' : e.date > today ? ' (예정)' : ''} | ${e.label ? `**${e.label}** ` : ''}${e.text
                .replace(/\|/g, '\\|')
                .replace(/\n/g, '<br>')} |`
          ),
        ].join('\n')
      )
      .join('\n\n');
    const who = tab === 'all' ? '전체' : members.find((m) => m.id === tab)?.name ?? '';
    const url = URL.createObjectURL(new Blob([md + '\n'], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `진행현황-${who}-${today}.md`;
    // 링크를 문서에 붙였다가 떼고, 다운로드가 시작된 뒤에 해제 (바로 해제하면 파일 이름이 사라짐)
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!me) return <p className="text-xs text-gray-400">불러오는 중...</p>;

  const datesOf = (memberId: string) => new Set((entries ?? []).filter((e) => e.memberId === memberId).map((e) => e.date));
  // '+ 기록 추가' 대상: 보고 있는 팀원 (전체 탭이면 나)
  const target = tab === 'all' ? me : members.find((m) => m.id === tab) ?? me;
  const exportable = tablesForExport().length > 0;
  const chip = (active: boolean) =>
    `px-3 py-1.5 text-xs rounded-lg transition ${
      active ? 'bg-gray-900 text-white font-bold dark:bg-white dark:text-gray-900' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300'
    }`;

  const tableProps = {
    today,
    editing,
    setEditing,
    datesOf,
    hintsFor,
    onSave: async (memberId: string, v: { date: string; label: string; text: string; fromDate?: string }) =>
      (await run({ type: 'progress:save', payload: { memberId, ...v } })) && setEditing(null),
    onDelete: (e: ProgressEntry) =>
      confirm(`${shortDate(e.date)} 기록을 삭제할까요?`) && run({ type: 'progress:delete', payload: { memberId: e.memberId, date: e.date } }),
  };

  return (
    <div className="space-y-5">
      <header className="border-b border-gray-200 dark:border-slate-800 pb-4 flex flex-wrap gap-3 justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">📈 진행 현황</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            팀원별 날짜 · 핵심 작업 기록이에요. 앞으로의 날짜에 적으면 예정으로 표시돼요.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={copyTable}
            disabled={!exportable}
            className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-100 text-xs font-medium px-3 py-2 rounded-lg transition disabled:opacity-50"
            title="Word·한글에 붙여 넣으면 표로 들어가요"
          >
            {copied ? '✓ 복사됨' : '📋 표 복사'}
          </button>
          <button
            onClick={downloadMarkdown}
            disabled={!exportable}
            className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-100 text-xs font-medium px-3 py-2 rounded-lg transition disabled:opacity-50"
          >
            📥 Markdown
          </button>
          <button
            onClick={() => setEditing(`${target.id}|new`)}
            className="bg-gray-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
          >
            + {target.id === me.id ? '내' : `${target.name}님`} 기록 추가
          </button>
        </div>
      </header>

      {/* 팀원 탭 */}
      <div className="flex flex-wrap gap-1.5 border-b border-gray-200 dark:border-slate-800 pb-3" role="tablist">
        {ordered.map((m) => {
          const active = tab === m.id;
          const count = (entries ?? []).filter((e) => e.memberId === m.id).length;
          return (
            <button
              key={m.id}
              role="tab"
              aria-selected={active}
              onClick={() => {
                setEditing(null);
                setTab(m.id);
              }}
              className={`flex items-center gap-1.5 pl-1.5 pr-3 py-1.5 rounded-full text-xs border transition ${
                active
                  ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900 font-bold'
                  : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:border-gray-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: m.color }}>
                {m.name.slice(0, 1)}
              </span>
              {m.name}
              {m.id === me.id && <span className={active ? 'opacity-70' : 'text-gray-400'}>(나)</span>}
              <span className={active ? 'opacity-70' : 'text-gray-400'}>{count}</span>
            </button>
          );
        })}
        <button
          role="tab"
          aria-selected={tab === 'all'}
          onClick={() => {
            setEditing(null);
            setTab('all');
          }}
          className={`px-3 py-1.5 rounded-full text-xs border transition ${
            tab === 'all'
              ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900 font-bold'
              : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:border-gray-400'
          }`}
        >
          👥 전체
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 items-center">
        {(
          [
            ['2w', '최근 2주'],
            ['month', '이번 달'],
            ['all', '전체 기간'],
          ] as const
        ).map(([k, label]) => (
          <button key={k} onClick={() => setRange(k)} className={chip(range === k)}>
            {label}
          </button>
        ))}
        <button onClick={() => setNewestFirst((v) => !v)} className="ml-auto text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
          {newestFirst ? '↑ 최신 날짜부터' : '↓ 오래된 날짜부터'}
        </button>
      </div>

      {!entries ? (
        <p className="text-xs text-gray-400">불러오는 중...</p>
      ) : tab === 'all' ? (
        <div className="space-y-6">
          {ordered.map((m) => (
            <section key={m.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-100">
                  <span className="w-6 h-6 rounded-full text-[11px] text-white flex items-center justify-center" style={{ backgroundColor: m.color }}>
                    {m.name.slice(0, 1)}
                  </span>
                  {m.name}
                  {m.role && <span className="text-xs font-normal text-gray-400">{m.role}</span>}
                </h2>
                <button onClick={() => setEditing(`${m.id}|new`)} className="text-xs text-blue-600 hover:underline">
                  + 추가
                </button>
              </div>
              <PersonTable person={m} rows={rowsOf(m.id)} compact {...tableProps} />
            </section>
          ))}
        </div>
      ) : (
        (() => {
          const person = members.find((m) => m.id === tab);
          if (!person) return <p className="text-xs text-gray-400">팀원을 찾을 수 없어요.</p>;
          return <PersonTable person={person} rows={rowsOf(person.id)} {...tableProps} />;
        })()
      )}
    </div>
  );
}

function PersonTable({
  person,
  rows,
  compact,
  today,
  editing,
  setEditing,
  datesOf,
  hintsFor,
  onSave,
  onDelete,
}: {
  person: Member;
  rows: ProgressEntry[];
  compact?: boolean;
  today: string;
  editing: string | null;
  setEditing: (v: string | null) => void;
  datesOf: (memberId: string) => Set<string>;
  hintsFor: (person: Member, date: string) => Hint[];
  onSave: (memberId: string, v: { date: string; label: string; text: string; fromDate?: string }) => Promise<unknown>;
  onDelete: (e: ProgressEntry) => void;
}) {
  const taken = datesOf(person.id);
  const showNew = editing === `${person.id}|new`;

  return (
    <div className="space-y-3">
      {showNew && (
        <EntryEditor
          title={`${person.name}님의 기록 추가`}
          initial={{ date: taken.has(today) ? '' : today, label: '', text: '' }}
          takenDates={taken}
          hintsFor={(d) => hintsFor(person, d)}
          onCancel={() => setEditing(null)}
          onSave={(v) => onSave(person.id, v)}
        />
      )}

      {rows.length === 0 && !showNew ? (
        <div className={`bg-white dark:bg-slate-900 border border-dashed border-gray-300 dark:border-slate-700 rounded-xl text-center space-y-2 ${compact ? 'py-5' : 'py-12'}`}>
          <p className="text-xs text-gray-400">{person.name}님의 기록이 아직 없어요.</p>
          {!compact && (
            <button onClick={() => setEditing(`${person.id}|new`)} className="text-xs font-semibold text-blue-600 hover:underline">
              기록 추가하기 →
            </button>
          )}
        </div>
      ) : rows.length > 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800/60 text-xs text-gray-500 dark:text-gray-400">
                <th className="w-24 px-4 py-2.5 text-center font-bold">날짜</th>
                <th className="px-4 py-2.5 text-left font-bold">핵심 작업</th>
                <th className="w-24 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((e) =>
                editing === `${person.id}|${e.date}` ? (
                  <tr key={e.date}>
                    <td colSpan={3} className="p-3 border-t border-gray-100 dark:border-slate-800">
                      <EntryEditor
                        initial={e}
                        takenDates={taken}
                        hintsFor={(d) => hintsFor(person, d)}
                        onCancel={() => setEditing(null)}
                        onSave={(v) => onSave(person.id, { ...v, fromDate: e.date })}
                      />
                    </td>
                  </tr>
                ) : (
                  <Row
                    key={e.date}
                    entry={e}
                    today={today}
                    compact={compact}
                    onEdit={() => setEditing(`${person.id}|${e.date}`)}
                    onDelete={() => onDelete(e)}
                  />
                )
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function Row({
  entry: e,
  today,
  compact,
  onEdit,
  onDelete,
}: {
  entry: ProgressEntry;
  today: string;
  compact?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isToday = e.date === today;
  const planned = e.date > today;
  return (
    <tr
      className={`group border-t border-gray-100 dark:border-slate-800 align-top ${
        isToday ? 'bg-blue-50/60 dark:bg-blue-950/30' : planned ? 'bg-gray-50/50 dark:bg-slate-800/20' : ''
      }`}
    >
      <td className={`px-4 text-center ${compact ? 'py-2' : 'py-3'}`}>
        <p className={`font-bold ${planned ? 'text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>{shortDate(e.date)}</p>
        {!compact && <p className="text-[10px] text-gray-400">{weekday(e.date)}</p>}
        {isToday && <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white">오늘</span>}
        {planned && <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300">예정</span>}
      </td>
      <td
        className={`px-4 leading-relaxed whitespace-pre-wrap break-words ${compact ? 'py-2' : 'py-3'} ${
          planned ? 'text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'
        }`}
      >
        {e.label && <b className="text-gray-900 dark:text-white mr-1">{e.label}</b>}
        {e.text}
      </td>
      <td className={`px-3 text-right ${compact ? 'py-2' : 'py-3'}`}>
        <div className="flex justify-end gap-2 text-[11px] opacity-60 group-hover:opacity-100 transition">
          <button onClick={onEdit} className="text-gray-500 hover:text-blue-600">
            수정
          </button>
          <button onClick={onDelete} className="text-red-400 hover:text-red-600">
            삭제
          </button>
        </div>
      </td>
    </tr>
  );
}

const inputCls =
  'border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500';

function EntryEditor({
  title,
  initial,
  takenDates,
  hintsFor,
  onCancel,
  onSave,
}: {
  title?: string;
  initial: { date: string; label: string; text: string };
  takenDates: Set<string>;
  hintsFor: (date: string) => Hint[];
  onCancel: () => void;
  onSave: (v: { date: string; label: string; text: string }) => Promise<unknown>;
}) {
  const [date, setDate] = useState(initial.date);
  const [label, setLabel] = useState(initial.label);
  const [text, setText] = useState(initial.text);
  const [saving, setSaving] = useState(false);

  const duplicate = date !== initial.date && takenDates.has(date);
  const hints = date ? hintsFor(date).filter((h) => !text.includes(h.text)) : [];
  const append = (s: string) => setText((prev) => (prev.trim() ? `${prev.trim()}, ${s}` : s));

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!date || duplicate || (!label.trim() && !text.trim())) return;
        setSaving(true);
        await onSave({ date, label: label.trim(), text: text.trim() });
        setSaving(false);
      }}
      className="bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-800 rounded-xl p-4 space-y-3"
    >
      {title && <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{title}</p>}
      <div className="flex flex-wrap gap-2">
        <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={`${inputCls} w-40`} />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={60}
          placeholder="구분 표시 (선택, 굵게 표시) 예: 멘토링 이후 재분석 시작"
          className={`${inputCls} flex-1 min-w-56`}
        />
      </div>
      {duplicate && <p className="text-[11px] text-red-500">그 날짜에는 이미 기록이 있어요. 표에서 그 날짜의 &apos;수정&apos;을 눌러 주세요.</p>}
      <textarea
        autoFocus
        rows={3}
        maxLength={2000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="핵심 작업 (예: XGBoost·GRU·TCN·Transformer 추가, 총 6개 모델 비교)"
        className={`${inputCls} w-full resize-y leading-relaxed text-sm`}
      />

      {hints.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-gray-400">이 날의 완료 카드·회의에서 가져오기 (누르면 추가돼요)</p>
          <div className="flex flex-wrap gap-1.5">
            {hints.map((h) => (
              <button
                type="button"
                key={h.key}
                onClick={() => append(h.text)}
                className="text-[11px] px-2 py-1 rounded-full border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600"
              >
                + <span className="text-gray-400">{h.kind}</span> {h.text}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-xs rounded-lg">
          취소
        </button>
        <button
          type="submit"
          disabled={saving || !date || duplicate || (!label.trim() && !text.trim())}
          className="px-4 py-1.5 bg-gray-900 dark:bg-blue-600 text-white text-xs font-medium rounded-lg disabled:opacity-50"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
}
