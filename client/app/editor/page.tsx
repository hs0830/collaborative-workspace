'use client';

import CollaborativeEditor from '../../components/CollaborativeEditor';

export default function EditorPage() {
  return (
    <div className="space-y-6">
      <header className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-extrabold text-gray-900">📝 실시간 협업 문서 에디터</h1>
        <p className="text-xs text-gray-500 mt-1">
          팀원들과 함께 실시간으로 문서를 작성하고 회의록, 기획서 및 참고 파일을 공유하세요.
        </p>
      </header>

      <CollaborativeEditor room="default-room" />
    </div>
  );
}