'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useEffect, useState, useRef } from 'react';

export default function CollaborativeEditor({ room }: { room: string }) {
  const [ydoc] = useState(() => new Y.Doc());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<{ name: string; url: string; size: string }[]>([]);

  useEffect(() => {
    const provider = new WebsocketProvider('ws://localhost:4000/yjs', room, ydoc);
    return () => provider.destroy();
  }, [room, ydoc]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ history: false }),
      Collaboration.configure({ document: ydoc }),
    ],
    content: '<h2>📝 프로젝트 문서 작성</h2><p>이곳을 클릭하여 자유롭게 내용을 작성하세요...</p>',
  });

  const handleDocFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert('파일 용량은 최대 20MB까지 업로드할 수 있습니다.');
      return;
    }

    const fileUrl = URL.createObjectURL(file);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2) + 'MB';

    setAttachments((prev) => [...prev, { name: file.name, url: fileUrl, size: fileSizeMB }]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
      {/* 툴바 & 파일 첨부 버튼 */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className="px-2.5 py-1 text-xs font-semibold border border-gray-200 rounded hover:bg-gray-100"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className="px-2.5 py-1 text-xs italic border border-gray-200 rounded hover:bg-gray-100"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            className="px-2.5 py-1 text-xs font-bold border border-gray-200 rounded hover:bg-gray-100"
          >
            H2
          </button>
        </div>

        <input type="file" ref={fileInputRef} onChange={handleDocFileUpload} className="hidden" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-3 py-1.5 rounded-md transition flex items-center gap-1 cursor-pointer"
        >
          📂 파일 첨부 (최대 20MB)
        </button>
      </div>

      {/* 에디터 본문 */}
      <div className="min-h-[200px] border border-gray-100 rounded-lg p-3 focus-within:border-blue-400">
        <EditorContent
          editor={editor}
          className="prose max-w-none outline-none text-gray-800 leading-relaxed"
        />
      </div>

      {/* 첨부된 파일 목록 */}
      {attachments.length > 0 && (
        <div className="pt-3 border-t border-gray-100 space-y-2">
          <h4 className="text-xs font-semibold text-gray-500">첨부된 참고 문서 ({attachments.length})</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {attachments.map((file, idx) => (
              <a
                key={idx}
                href={file.url}
                download={file.name}
                className="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs transition"
              >
                <span className="truncate text-gray-700 font-medium">{file.name}</span>
                <span className="text-gray-400 text-[10px] ml-2">{file.size}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}