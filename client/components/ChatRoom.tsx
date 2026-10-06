'use client';

import { useEffect, useRef, useState } from 'react';
import { getSocket, useSocketConnected, fileUrl } from '../lib/socket';
import { SERVER_URL } from '../lib/config';
import { useCurrentUser } from '../lib/user';
import type { ChatFile, ChatMessage } from '../lib/types';

const MAX_SIZE = 20 * 1024 * 1024; // 20MB (서버 제한과 동일)

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`;

export default function ChatRoom() {
  const user = useCurrentUser();
  const connected = useSocketConnected();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 서버에서 기록·새 메시지 받기
  useEffect(() => {
    const s = getSocket();
    const onHistory = (list: ChatMessage[]) => setMessages(list);
    const onMessage = (msg: ChatMessage) =>
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));

    s.on('chat:history', onHistory);
    s.on('chat:message', onMessage);
    if (s.connected) s.emit('chat:get');
    return () => {
      s.off('chat:history', onHistory);
      s.off('chat:message', onMessage);
    };
  }, []);

  // 새 메시지가 오면 맨 아래로 스크롤
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const send = (text: string, file?: ChatFile) => {
    if (!user) return;
    getSocket().emit('chat:send', {
      senderId: user.id,
      sender: user.name,
      color: user.color,
      text,
      file,
    });
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || !connected) return;
    send(text);
    setInputText('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    if (file.size > MAX_SIZE) {
      alert('파일 용량은 최대 20MB까지 업로드할 수 있습니다.');
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${SERVER_URL}/api/upload`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '업로드 실패');
      send('', data as ChatFile);
    } catch (err) {
      alert(err instanceof Error ? err.message : '업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-[560px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
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
                  mine
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-100 rounded-bl-none'
                }`}
              >
                {msg.text && <p>{msg.text}</p>}

                {msg.file?.isImage && (
                  <a href={fileUrl(msg.file.url)} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fileUrl(msg.file.url)}
                      alt={msg.file.name}
                      className="mt-1 rounded-md max-h-40 object-cover border border-gray-200"
                    />
                  </a>
                )}

                {msg.file && !msg.file.isImage && (
                  <a
                    href={fileUrl(msg.file.url)}
                    download={msg.file.name}
                    className="flex items-center gap-1 text-xs underline underline-offset-2 opacity-90 hover:opacity-100"
                  >
                    📎 {msg.file.name} ({formatSize(msg.file.size)})
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 입력 박스 */}
      <div className="p-3 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!connected || uploading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition disabled:opacity-40"
            title="파일 첨부"
          >
            {uploading ? '⏳' : '📎'}
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
            className="flex-1 text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition"
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
