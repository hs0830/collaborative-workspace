'use client';

import { useRef, useState } from 'react';
import type { Member } from '../lib/auth';
import { formatSize, LIMITS, uploadFile } from '../lib/files';
import {
  WORK_CATEGORIES,
  type Contributor,
  type KanbanTask,
  type Work,
  type WorkCategory,
  type WorkInput,
  type WorkSection,
} from '../lib/types';

const inputCls =
  'w-full border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 rounded-lg p-2.5 outline-none focus:border-blue-500';

/** 작업물 올리기·수정 창 */
export default function WorkForm({
  initial,
  ownerName,
  members,
  tasks,
  onClose,
  onSubmit,
}: {
  initial?: Work;
  /** 작업물을 올린 사람 (새로 올릴 때는 나) */
  ownerName: string;
  members: Member[];
  tasks: KanbanTask[];
  onClose: () => void;
  onSubmit: (data: WorkInput) => Promise<boolean>;
}) {
  const [section, setSection] = useState<WorkSection>(initial?.section ?? 'personal');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState<WorkCategory>(initial?.category ?? '문서');
  const [linkUrl, setLinkUrl] = useState(initial?.linkUrl ?? '');
  const [taskId, setTaskId] = useState(initial?.taskId ?? '');

  // 팀 작업물 참여자: 이름 → 맡은 역할. 올린 사람은 항상 포함
  const [roles, setRoles] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = { [ownerName]: '' };
    initial?.contributors.forEach((c) => (init[c.name] = c.role));
    return init;
  });

  // 파일: 기존 파일 유지 / 새 파일 선택 / 파일 제거
  const [file, setFile] = useState<File | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const existing = !removeFile && !file ? initial?.file : null;

  // 올린 사람 → 등록된 팀원 → 팀원 목록에 없는 기존 참여자 순
  const names = [...new Set([ownerName, ...members.map((m) => m.name), ...Object.keys(roles)])];
  const toggle = (n: string) =>
    setRoles((prev) => {
      if (n === ownerName) return prev;
      const next = { ...prev };
      if (n in next) delete next[n];
      else next[n] = '';
      return next;
    });

  // 담당자가 나인 카드를 먼저
  const sortedTasks = [...tasks].sort((a, b) => Number(b.assignee === ownerName) - Number(a.assignee === ownerName));

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > LIMITS.work) {
      alert('작업물 파일은 최대 100MB까지 올릴 수 있어요.\n더 큰 데이터는 "대용량 데이터셋"에 올려 주세요.');
      return;
    }
    setFile(f);
    setRemoveFile(false);
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const linkInvalid = linkUrl.trim() !== '' && !/^https?:\/\/\S+$/i.test(linkUrl.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || linkInvalid) return;
    setSaving(true);
    try {
      const contributors: Contributor[] =
        section === 'team' ? names.filter((n) => n in roles).map((n) => ({ name: n, role: roles[n].trim() })) : [];
      const data: WorkInput = {
        section,
        title: title.trim(),
        description: description.trim(),
        category,
        contributors,
        linkUrl: linkUrl.trim(),
        taskId: taskId || null,
      };
      if (file) {
        setProgress(0);
        const stored = await uploadFile('work', file, setProgress);
        data.fileId = stored.id;
      } else if (removeFile) {
        data.fileId = null;
      }
      if (await onSubmit(data)) onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : '업로드에 실패했습니다.');
    } finally {
      setSaving(false);
      setProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => !saving && onClose()}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{initial ? '✏️ 작업물 수정' : '📤 작업물 올리기'}</h3>
          <p className="text-[11px] text-gray-400 mt-1">무엇을, 왜 했는지 적어 두면 나중에 포트폴리오나 발표에서 역할을 설명하기 쉬워요.</p>
        </div>

        {/* 구분 */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {(
            [
              ['personal', '🙋 개인 작업물', '내가 맡아서 한 작업'],
              ['team', '🤝 팀 작업물', '여러 명이 함께 만든 결과물'],
            ] as const
          ).map(([value, label, desc]) => (
            <button
              type="button"
              key={value}
              onClick={() => setSection(value)}
              className={`text-left rounded-xl border p-3 transition ${
                section === value
                  ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40'
                  : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
              }`}
            >
              <p className="font-bold text-gray-800 dark:text-gray-100">{label}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
            </button>
          ))}
        </div>

        <div className="space-y-3 text-xs">
          {/* 파일 */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pickFile(e.dataTransfer.files?.[0]);
            }}
            className="rounded-lg border-2 border-dashed border-gray-200 dark:border-slate-700 p-3 text-center space-y-1"
          >
            <input type="file" ref={fileRef} className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? undefined)} />
            {file ? (
              <p className="text-gray-700 dark:text-gray-200">
                📎 {file.name} <span className="text-gray-400">({formatSize(file.size)})</span>
              </p>
            ) : existing ? (
              <p className="text-gray-700 dark:text-gray-200">
                📎 {existing.name} <span className="text-gray-400">({formatSize(existing.size)})</span>
              </p>
            ) : (
              <p className="text-gray-400">파일을 끌어다 놓거나 선택하세요 (PPT, PDF, Word, 코드, 이미지 등 · 최대 100MB)</p>
            )}
            <div className="flex justify-center gap-3">
              <button type="button" onClick={() => fileRef.current?.click()} className="text-blue-600 hover:underline">
                {file || existing ? '다른 파일로 바꾸기' : '파일 선택'}
              </button>
              {(file || existing) && (
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setRemoveFile(Boolean(initial?.file));
                  }}
                  className="text-gray-400 hover:text-red-500"
                >
                  파일 빼기
                </button>
              )}
            </div>
            {progress !== null && (
              <div className="pt-1">
                <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5">
                  <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">업로드 중 {progress}%</p>
              </div>
            )}
          </div>

          <label className="block space-y-1">
            <span className="font-semibold text-gray-700 dark:text-gray-300">제목</span>
            <input
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={section === 'team' ? '예: 최종 발표 자료, 중간 보고서' : '예: 전처리 파이프라인 v2, 실험 결과 정리'}
              className={inputCls}
            />
          </label>

          <label className="block space-y-1">
            <span className="font-semibold text-gray-700 dark:text-gray-300">설명</span>
            <textarea
              rows={3}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={'무엇을 했고, 왜 했고, 결과가 어땠는지\n예: DICOM 이미지를 NIfTI로 변환하는 스크립트 작성. 처리 시간을 3시간 → 10분으로 줄임.'}
              className={`${inputCls} resize-y leading-relaxed`}
            />
          </label>

          {/* 팀 작업물: 참여자와 역할 */}
          {section === 'team' && (
            <div className="space-y-1.5">
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                참여자와 맡은 역할 ({Object.keys(roles).length}명)
              </span>
              <div className="rounded-lg border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-800">
                {names.map((n) => {
                  const on = n in roles;
                  return (
                    <div key={n} className="flex items-center gap-2 p-2">
                      <label className="flex items-center gap-1.5 w-24 shrink-0 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={n === ownerName}
                          onChange={() => toggle(n)}
                          className="w-3.5 h-3.5 accent-blue-600"
                        />
                        <span className={`truncate ${on ? 'text-gray-800 dark:text-gray-100 font-medium' : 'text-gray-400'}`}>{n}</span>
                      </label>
                      {on ? (
                        <input
                          value={roles[n]}
                          maxLength={200}
                          onChange={(e) => setRoles((prev) => ({ ...prev, [n]: e.target.value }))}
                          placeholder="맡은 역할 (예: 실험 결과 슬라이드 5~9)"
                          className="flex-1 min-w-0 text-xs border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 rounded-md px-2 py-1.5 outline-none focus:border-blue-500"
                        />
                      ) : (
                        <span className="text-[11px] text-gray-300 dark:text-slate-600">참여하지 않음</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-gray-400">참여자 모두의 작업 기록에 표시되고, 참여자라면 누구나 내용을 고칠 수 있어요.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="font-semibold text-gray-700 dark:text-gray-300">분류</span>
              <select value={category} onChange={(e) => setCategory(e.target.value as WorkCategory)} className={inputCls}>
                {WORK_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="font-semibold text-gray-700 dark:text-gray-300">연결된 칸반 카드</span>
              <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className={inputCls}>
                <option value="">없음</option>
                {sortedTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                    {t.assignee === ownerName ? '' : ` (${t.assignee})`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-1">
            <span className="font-semibold text-gray-700 dark:text-gray-300">링크 (선택)</span>
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="GitHub, Figma, 노션 등 https:// 주소"
              className={`${inputCls} ${linkInvalid ? '!border-red-400' : ''}`}
            />
            {linkInvalid && <span className="text-[11px] text-red-500">https:// 로 시작하는 주소를 넣어 주세요.</span>}
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-gray-200 text-xs rounded-lg transition"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim() || linkInvalid}
            className="px-4 py-2 bg-gray-900 dark:bg-blue-600 hover:bg-black text-white text-xs rounded-lg transition font-medium disabled:opacity-60"
          >
            {saving ? (progress !== null ? '업로드 중...' : '저장 중...') : initial ? '저장' : '올리기'}
          </button>
        </div>
      </form>
    </div>
  );
}
