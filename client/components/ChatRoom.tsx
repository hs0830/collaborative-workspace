'use client';

import { useState, useRef } from 'react';

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  fileName?: string;
  fileUrl?: string;
  isImage?: boolean;
  time: string;
}

export default function ChatRoom() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: '시스템',
      text: '팀 채팅방에 오신 것을 환영합니다!',
      time: '오전 10:00',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: '나',
      text: inputText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 용량 제한 검사 (20MB)
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert('파일 용량은 최대 20MB까지 업로드할 수 있습니다.');
      return;
    }

    const fileUrl = URL.createObjectURL(file);
    const isImage = file.type.startsWith('image/');

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: '나',
      text: `${file.name} 파일을 첨부했습니다.`,
      fileName: file.name,
      fileUrl: fileUrl,
      isImage: isImage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMessage]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-[560px] bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
          💬 팀 실시간 채팅
        </h3>
        <span className="text-xs text-gray-400">최대 20MB 첨부 가능</span>
      </div>

      {/* 메시지 리스트 */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === '나' ? 'items-end' : 'items-start'}`}>
            <span className="text-xs text-gray-400 mb-1">{msg.sender} • {msg.time}</span>
            <div
              className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                msg.sender === '나'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-800 rounded-bl-none'
              }`}
            >
              <p>{msg.text}</p>

              {/* 이미지 첨부 파일 미리보기 */}
              {msg.isImage && msg.fileUrl && (
                <img
                  src={msg.fileUrl}
                  alt={msg.fileName}
                  className="mt-2 rounded-md max-h-40 object-cover border border-gray-200"
                />
              )}

              {/* 일반 파일 다운로드 링크 */}
              {!msg.isImage && msg.fileUrl && (
                <a
                  href={msg.fileUrl}
                  download={msg.fileName}
                  className="mt-2 flex items-center gap-1 text-xs underline underline-offset-2 opacity-90 hover:opacity-100"
                >
                  📎 {msg.fileName} 다운로드
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 입력 박스 */}
      <div className="p-3 border-t border-gray-100 bg-white">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            title="파일 첨부"
          >
            📎
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="메시지 또는 파일 전달..."
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition"
          />
          <button
            onClick={handleSend}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}