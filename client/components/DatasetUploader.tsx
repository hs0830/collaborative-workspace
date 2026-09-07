'use client';

import { useState, useRef } from 'react';

interface DatasetFile {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
  url: string;
}

export default function DatasetUploader() {
  const [datasets, setDatasets] = useState<DatasetFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDatasetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1GB 용량 제한 검사 (1024 * 1024 * 1024 Bytes)
    const MAX_DATASET_SIZE = 1 * 1024 * 1024 * 1024;
    if (file.size > MAX_DATASET_SIZE) {
      alert('데이터셋 파일은 최대 1GB까지 업로드할 수 있습니다.');
      return;
    }

    setIsUploading(true);
    setProgress(10);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);

          const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
          const sizeStr =
            file.size >= 1024 * 1024 * 1024
              ? (file.size / (1024 * 1024 * 1024)).toFixed(2) + 'GB'
              : `${sizeInMB}MB`;

          const newDataset: DatasetFile = {
            id: Date.now().toString(),
            name: file.name,
            size: sizeStr,
            uploadDate: new Date().toLocaleDateString(),
            url: URL.createObjectURL(file),
          };

          setDatasets((prevData) => [...prevData, newDataset]);
          return 0;
        }
        return prev + 20;
      });
    }, 300);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div>
          <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
            📊 연구/프로젝트 대용량 데이터셋 관리자
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            CSV, ZIP, DICOM, NIfTI 등 대용량 데이터셋을 최대 1GB까지 등록할 수 있습니다.
          </p>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleDatasetUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="bg-gray-900 hover:bg-black text-white text-xs font-medium px-4 py-2 rounded-lg transition disabled:bg-gray-400 cursor-pointer"
        >
          {isUploading ? '업로드 중...' : '💾 데이터셋 추가 (최대 1GB)'}
        </button>
      </div>

      {/* 업로드 진행률 바 */}
      {isUploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-600">
            <span>대용량 파일 전송 중...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 데이터셋 목록 */}
      <div className="space-y-2">
        {datasets.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
            등록된 데이터셋이 없습니다. 버튼을 눌러 데이터 파일(.zip, .csv 등)을 등록하세요.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {datasets.map((data) => (
              <div
                key={data.id}
                className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between text-xs"
              >
                <div className="truncate space-y-0.5 pr-2">
                  <p className="font-semibold text-gray-800 truncate">{data.name}</p>
                  <p className="text-gray-400 text-[11px]">
                    용량: {data.size} • 등록일: {data.uploadDate}
                  </p>
                </div>
                <a
                  href={data.url}
                  download={data.name}
                  className="shrink-0 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-2.5 py-1 rounded text-[11px] font-medium transition"
                >
                  다운로드
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}   