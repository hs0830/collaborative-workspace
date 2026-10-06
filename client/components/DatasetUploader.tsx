'use client';

import { useRef, useState } from 'react';
import { api } from '../lib/auth';
import { useSynced } from '../lib/socket';
import { downloadFile, formatSize, LIMITS, uploadFile } from '../lib/files';
import type { StoredFile } from '../lib/types';

export default function DatasetUploader() {
  const datasets = useSynced<StoredFile[]>('datasets', 'datasets:state');
  const [uploading, setUploading] = useState<{ name: string; percent: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startUpload = async (file: File) => {
    if (file.size > LIMITS.dataset) {
      alert('데이터셋 파일은 최대 1GB까지 업로드할 수 있습니다.');
      return;
    }
    setUploading({ name: file.name, percent: 0 });
    try {
      // 목록은 업로드 완료 시 서버가 모든 팀원에게 보내줌
      await uploadFile('dataset', file, (percent) => setUploading({ name: file.name, percent }));
    } catch (err) {
      alert(err instanceof Error ? err.message : '업로드에 실패했습니다.');
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (file: StoredFile) => {
    if (!confirm(`'${file.name}' 데이터셋을 삭제할까요?\n팀 전체에서 삭제되며 되돌릴 수 없습니다.`)) return;
    try {
      await api(`/api/files/${file.id}`, { method: 'DELETE' });
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    }
  };

  const totalSize = datasets?.reduce((sum, d) => sum + d.size, 0) ?? 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">📊 연구/프로젝트 데이터셋</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {datasets ? `${datasets.length}개 · 총 ${formatSize(totalSize)}` : '불러오는 중...'}
          </p>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) startUpload(f);
          }}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={!!uploading}
          className="bg-gray-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition disabled:opacity-50 cursor-pointer"
        >
          {uploading ? '업로드 중...' : '💾 데이터셋 추가 (최대 1GB)'}
        </button>
      </div>

      {/* 끌어다 놓기 영역 */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f && !uploading) startUpload(f);
        }}
        className={`rounded-lg border-2 border-dashed p-4 text-center text-xs transition ${
          dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600' : 'border-gray-200 dark:border-slate-700 text-gray-400'
        }`}
      >
        {uploading ? (
          <div className="space-y-1.5 text-left">
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span className="truncate pr-2">⬆️ {uploading.name}</span>
              <span>{uploading.percent}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploading.percent}%` }} />
            </div>
            <p className="text-[11px] text-gray-400">업로드가 끝날 때까지 이 페이지를 닫지 마세요.</p>
          </div>
        ) : (
          '여기에 파일을 끌어다 놓아도 됩니다 (CSV, ZIP, DICOM, NIfTI 등)'
        )}
      </div>

      {/* 데이터셋 목록 */}
      {datasets && datasets.length === 0 ? (
        <div className="text-center py-8 text-xs text-gray-400">등록된 데이터셋이 없습니다.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {datasets?.map((data) => (
            <div
              key={data.id}
              className="p-3 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-lg flex items-center justify-between gap-2 text-xs"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="font-semibold text-gray-800 dark:text-gray-100 truncate" title={data.name}>
                  {data.name}
                </p>
                <p className="text-gray-400 text-[11px]">
                  {formatSize(data.size)} · {data.uploaderName} · {new Date(data.createdAt).toLocaleDateString('ko-KR')}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => downloadFile(data.id).catch((e) => alert(e.message))}
                  className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer"
                >
                  다운로드
                </button>
                <button onClick={() => handleDelete(data)} className="text-gray-400 hover:text-red-500 px-1.5 cursor-pointer" title="삭제">
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
