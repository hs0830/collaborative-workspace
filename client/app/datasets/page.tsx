'use client';

import DatasetUploader from '../../components/DatasetUploader';

export default function DatasetsPage() {
  return (
    <div className="space-y-6">
      <header className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-extrabold text-gray-900">💾 대용량 프로젝트 데이터셋</h1>
        <p className="text-xs text-gray-500 mt-1">
          CSV, ZIP, DICOM, NIfTI 등 프로젝트 연구에 필요한 대용량 파일(최대 1GB)을 업로드하고 관리합니다.
        </p>
      </header>

      <DatasetUploader />
    </div>
  );
}