'use client';

import { useState } from 'react';
import type { Member } from '../lib/auth';

interface MeetingFormData {
  title: string;
  date: string;
  attendees: string[];
}

const inputCls =
  'w-full border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 rounded-lg p-2.5 outline-none focus:border-blue-500';

/** 회의록 만들기·정보 수정에 같이 쓰는 입력 창 */
export default function MeetingForm({
  title,
  submitLabel,
  members,
  initial,
  onClose,
  onSubmit,
}: {
  title: string;
  submitLabel: string;
  members: Member[];
  initial: MeetingFormData;
  onClose: () => void;
  onSubmit: (data: MeetingFormData) => Promise<void> | void;
}) {
  const [name, setName] = useState(initial.title);
  const [date, setDate] = useState(initial.date);
  const [attendees, setAttendees] = useState<string[]>(initial.attendees);
  const [saving, setSaving] = useState(false);

  // 팀원 목록에 없는 참석자(외부 인원·삭제된 팀원)도 보여주기
  const names = [...new Set([...members.map((m) => m.name), ...attendees])];
  const toggle = (n: string) => setAttendees((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim() || !date) return;
          setSaving(true);
          await onSubmit({ title: name.trim(), date, attendees });
          setSaving(false);
        }}
        className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl"
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">🗒️ {title}</h3>

        <div className="space-y-3 text-xs">
          <label className="block space-y-1">
            <span className="font-semibold text-gray-700 dark:text-gray-300">회의 제목</span>
            <input
              autoFocus
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 3주차 정기 회의, 모델 성능 점검"
              className={inputCls}
            />
          </label>

          <label className="block space-y-1">
            <span className="font-semibold text-gray-700 dark:text-gray-300">회의 날짜</span>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </label>

          <div className="space-y-1.5">
            <span className="font-semibold text-gray-700 dark:text-gray-300">참석자 ({attendees.length})</span>
            <div className="flex flex-wrap gap-1.5">
              {names.length === 0 && <span className="text-gray-400">등록된 팀원이 없어요.</span>}
              {names.map((n) => {
                const on = attendees.includes(n);
                return (
                  <button
                    type="button"
                    key={n}
                    onClick={() => toggle(n)}
                    className={`px-2.5 py-1 rounded-full border transition ${
                      on
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {on ? '✓ ' : ''}
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-gray-200 text-xs rounded-lg transition"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-gray-900 dark:bg-blue-600 hover:bg-black text-white text-xs rounded-lg transition font-medium disabled:opacity-60"
          >
            {saving ? '처리 중...' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
