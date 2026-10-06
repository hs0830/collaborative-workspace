'use client';

import { useRef, useState } from 'react';
import { formatSize, LIMITS, uploadFile } from '../lib/files';
import { WORK_CATEGORIES, type KanbanTask, type Work, type WorkCategory, type WorkInput } from '../lib/types';

const inputCls =
  'w-full border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 rounded-lg p-2.5 outline-none focus:border-blue-500';

/** 작업물 올리기·수정 창 */
export default function WorkForm({
  initial,
  myName,
  tasks,
  onClose,
  onSubmit,
}: {
  initial?: Work;
  myName: string;
  tasks: KanbanTask[];
  onClose: () => void;
  onSubmit: (data: WorkInput) => Promise<boolean>;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState<WorkCategory>(initial?.category ?? '문서');
  const [isPrivate, setIsPrivate] = useState(initial?.visibility === 'private');
  const [linkUrl, setLinkUrl] = useState(initial?.linkUrl ?? '');
  const [taskId, setTaskId] = useState(initial?.taskId ?? '');

  // 파일: 기존 파일 유지 / 새 파일 선택 / 파일 제거
  const [file, setFile] = useState<File | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const existing = !removeFile && !file ? initial?.file : null;

  // 내 카드 먼저, 나머지는 뒤에
  const sortedTasks = [...tasks].sort((a, b) => Number(b.assignee === myName) - Number(a.assignee === myName));

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
      const data: WorkInput = {
        title: title.trim(),
        description: description.trim(),
        category,
        visibility: isPrivate ? 'private' : 'team',
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
          <p className="text-[11px] text-gray-400 mt-1">무엇을, 왜 했는지 적어 두면 나중에 포트폴리오를 쓸 때 큰 도움이 돼요.</p>
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
            <input required maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 중간발표 슬라이드, 전처리 파이프라인 v2" className={inputCls} />
          </label>

          <label className="block space-y-1">
            <span className="font-semibold text-gray-700 dark:text-gray-300">설명</span>
            <textarea
              rows={4}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={'무엇을 했고, 왜 했고, 결과가 어땠는지\n예: DICOM 이미지를 NIfTI로 변환하는 스크립트 작성. 수작업 대비 처리 시간을 3시간 → 10분으로 줄임.'}
              className={`${inputCls} resize-y leading-relaxed`}
            />
          </label>

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
                    {t.assignee === myName ? '' : ` (${t.assignee})`}
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

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="w-4 h-4 accent-blue-600" />
            <span className="text-gray-700 dark:text-gray-300">🔒 나만 보기</span>
            <span className="text-[11px] text-gray-400">(체크하지 않으면 팀원 모두가 볼 수 있어요)</span>
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
