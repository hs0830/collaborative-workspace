'use client';

import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export default function CollaborativeEditor({ room = 'default-room' }) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText('codemirror');

    const provider = new WebsocketProvider(
      'wss://collaborative-workspace-w24r.onrender.com/yjs',
      room,
      ydoc
    );

    provider.on('status', (e: { status: 'connecting' | 'connected' | 'disconnected' }) => {
      setStatus(e.status);
    });

    ytext.observe(() => {
      setText(ytext.toString());
    });

    return () => {
      provider.destroy();
      ydoc.destroy();
    };
  }, [room]);

  // 1. 마크다운(.md) 내보내기 다운로드
  const downloadMarkdown = () => {
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `workspace-doc-${Date.now()}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // 2. PDF 내보내기 (브라우저 Print 연동)
  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xs p-6 space-y-4">
      <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-700">
        <span className="text-xs font-bold text-gray-700 dark:text-gray-200">📄 실시간 협업 문서</span>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadMarkdown}
            className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            📥 Markdown 다운로드
          </button>
          <button
            onClick={exportPDF}
            className="px-2.5 py-1 bg-gray-900 dark:bg-white dark:text-gray-900 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            🖨️ PDF/인쇄 출력
          </button>
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="팀원들과 함께 문서 내용을 실시간 작성하세요..."
        className="w-full h-80 p-4 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-transparent outline-none resize-none font-sans leading-relaxed"
      />
    </div>
  );
}