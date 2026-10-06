import KanbanBoard from '../../components/KanbanBoard';

export default function KanbanPage() {
  return (
    <div className="space-y-6">
      <header className="border-b border-gray-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">📋 작업 & 칸반 보드</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          카드를 끌어다 놓아 상태를 바꾸세요. 모든 변경 사항은 팀원 화면에 바로 반영됩니다.
        </p>
      </header>

      <KanbanBoard />
    </div>
  );
}
