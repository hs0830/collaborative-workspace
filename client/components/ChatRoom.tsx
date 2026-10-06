'use client';

import { useEffect, useRef, useState } from 'react';
import { emitAction, getSocket, useSocketConnected, useSynced } from '../lib/socket';
import { useCurrentUser } from '../lib/auth';
import { downloadFile, formatSize, LIMITS, uploadFile, useFileViewUrl } from '../lib/files';
import type { ChatMessage, StoredFile } from '../lib/types';

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

export default function ChatRoom() {
  const user = useCurrentUser();
  const connected = useSocketConnected();
  const history = useSynced<ChatMessage[]>('chat', 'chat:history');
  const [messages, setMessages] = useState<ChatMessage[]>(history ?? []);
  const [inputText, setInputText] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 전체 기록(접속·이름 변경 시) + 새 메시지 실시간 수신
  useEffect(() => {
    if (history) setMessages(history);
  }, [history]);

  useEffect(() => {
    const s = getSocket();
    const onMessage = (msg: ChatMessage) => setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    s.on('chat:message', onMessage);
    return () => {
      s.off('chat:message', onMessage);
    };
  }, []);

  // 새 메시지가 오면 맨 아래로 스크롤
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !connected) return;
    setInputText('');
    const res = await emitAction('chat:send', { text });
    if (!res.ok) {
      setInputText(text); // 실패하면 입력 내용 복원
      alert(res.error || '메시지를 보내지 못했습니다.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    if (file.size > LIMITS.chat) {
      alert('파일 용량은 최대 20MB까지 업로드할 수 있습니다.');
      return;
    }

    setProgress(0);
    try {
      const stored = await uploadFile('chat', file, setProgress);
      await emitAction('chat:send', { fileId: stored.id });
    } catch (err) {
      alert(err instanceof Error ? err.message : '업로드에 실패했습니다.');
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-14rem)] min-h-[420px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm flex items-center gap-2">
          💬 팀 실시간 채팅
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`} title={connected ? '연결됨' : '연결 끊김'} />
        </h3>
        <span className="text-xs text-gray-400">최대 20MB 첨부 가능</span>
      </div>

      {/* 메시지 리스트 */}
      <div ref={listRef} className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.map((msg) => {
          const mine = user && msg.senderId === user.id;
          return (
            <div key={msg.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              <span className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                {!mine && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: msg.color }} />}
                {mine ? '나' : msg.sender} • {formatTime(msg.createdAt)}
              </span>
              <div
                className={`max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap break-words ${
                  mine ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-100 rounded-bl-none'
                }`}
              >
                {msg.text && <p>{msg.text}</p>}
                {msg.file && <Attachment file={msg.file} />}
              </div>
            </div>
          );
        })}
      </div>

      {progress !== null && (
        <div className="px-4 pb-2">
          <div className="flex justify-between text-[11px] text-gray-500 mb-1">
            <span>파일 업로드 중...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5">
            <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* 입력 박스 */}
      <div className="p-3 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!connected || progress !== null}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition disabled:opacity-40"
            title="파일 첨부"
          >
            📎
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              // 한글 조합 중 Enter는 무시 (중복 전송·마지막 글자 남는 문제 방지)
              if (e.nativeEvent.isComposing || e.key !== 'Enter') return;
              e.preventDefault();
              handleSend();
            }}
            placeholder={connected ? '메시지 입력...' : '서버에 연결 중...'}
            className="flex-1 min-w-0 text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition"
          />
          <button
            onClick={handleSend}
            disabled={!connected || !inputText.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}

function Attachment({ file }: { file: StoredFile }) {
  const viewUrl = useFileViewUrl(file.isImage ? file.id : undefined);

  if (file.isImage) {
    return viewUrl ? (
      <a href={viewUrl} target="_blank" rel="noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={viewUrl} alt={file.name} className="mt-1 rounded-md max-h-48 object-cover border border-gray-200" />
      </a>
    ) : (
      <div className="mt-1 w-40 h-24 rounded-md bg-black/10 animate-pulse" />
    );
  }

  return (
    <button
      onClick={() => downloadFile(file.id).catch((e) => alert(e.message))}
      className="flex items-center gap-1 text-xs underline underline-offset-2 opacity-90 hover:opacity-100 cursor-pointer text-left"
    >
      📎 {file.name} ({formatSize(file.size)})
    </button>
  );
}
