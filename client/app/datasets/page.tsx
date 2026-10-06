import DatasetUploader from '../../components/DatasetUploader';

export default function DatasetsPage() {
  return (
    <div className="space-y-6">
      <header className="border-b border-gray-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">💾 대용량 프로젝트 데이터셋</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          CSV, ZIP, DICOM, NIfTI 등 프로젝트 연구에 필요한 대용량 파일(최대 1GB)을 팀과 공유합니다. 파일은 저장소에 직접 업로드되어 큰 파일도 빠르게 올라갑니다.
        </p>
      </header>

      <DatasetUploader />
    </div>
  );
}