import ChatRoom from '../../components/ChatRoom';

export default function ChatPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <header className="border-b border-gray-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">💬 팀 실시간 소통 채널</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          팀원들과 메시지를 주고받고 간단한 이미지 및 문서(최대 20MB)를 피드백하세요.
        </p>
      </header>

      <ChatRoom />
    </div>
  );
}