'use client';

import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useEditor, EditorContent, type Editor, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Placeholder from '@tiptap/extension-placeholder';
import { YJS_URL } from '../lib/config';
import { getToken, useCurrentUser, type Member } from '../lib/auth';

type Status = 'connecting' | 'connected' | 'disconnected';

interface Peer {
  clientId: number;
  name: string;
  color: string;
}

/**
 * 연결(Y.Doc + WebsocketProvider)을 만들고, 준비되면 실제 에디터를 렌더링합니다.
 * 연결과 에디터를 나눠 두면 React 개발 모드의 이중 마운트에서도 연결이 꼬이지 않습니다.
 */
export default function CollaborativeEditor({ room = 'default-room' }: { room?: string }) {
  const user = useCurrentUser();
  const [conn, setConn] = useState<{ ydoc: Y.Doc; provider: WebsocketProvider } | null>(null);
  const [status, setStatus] = useState<Status>('connecting');
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(YJS_URL, room, ydoc, { params: { token: getToken() ?? '' } });

    provider.on('status', (e: { status: Status }) => setStatus(e.status));
    provider.on('sync', (isSynced: boolean) => setSynced(isSynced));

    setConn({ ydoc, provider });
    return () => {
      provider.destroy();
      ydoc.destroy();
      setConn(null);
      setSynced(false);
    };
  }, [room]);

  if (!conn || !user) {
    return <EditorShell status={status} peers={[]} editor={null} />;
  }

  return <EditorInner {...conn} user={user} status={status} synced={synced} />;
}

function EditorInner({
  ydoc,
  provider,
  user,
  status,
  synced,
}: {
  ydoc: Y.Doc;
  provider: WebsocketProvider;
  user: Member;
  status: Status;
  synced: boolean;
}) {
  const [peers, setPeers] = useState<Peer[]>([]);

  const editor = useEditor(
    {
      immediatelyRender: false, // Next.js 서버 렌더링 시 hydration 오류 방지
      extensions: [
        StarterKit.configure({ history: false }), // 실행 취소는 Yjs가 담당
        Collaboration.configure({ document: ydoc, field: 'content' }),
        CollaborationCursor.configure({ provider, user: { name: user.name, color: user.color } }),
        Placeholder.configure({ placeholder: '팀원들과 함께 문서 내용을 실시간으로 작성하세요...' }),
      ],
      editorProps: {
        attributes: {
          class:
            'prose-editor min-h-80 p-4 border border-gray-200 dark:border-gray-700 rounded-lg text-sm leading-relaxed outline-none focus:border-blue-500',
        },
      },
    },
    [ydoc, provider]
  );

  // 이름을 바꾸면 커서 이름표도 바로 갱신
  useEffect(() => {
    editor?.commands.updateUser({ name: user.name, color: user.color });
  }, [editor, user.name, user.color]);

  // 현재 접속 중인 사람 목록 (awareness)
  useEffect(() => {
    const update = () => {
      const list: Peer[] = [];
      provider.awareness.getStates().forEach((state, clientId) => {
        if (state.user) list.push({ clientId, name: state.user.name, color: state.user.color });
      });
      setPeers(list);
    };
    provider.awareness.on('change', update);
    update();
    return () => provider.awareness.off('change', update);
  }, [provider]);

  return <EditorShell status={status} peers={peers} editor={editor} loading={!synced} />;
}

function EditorShell({
  status,
  peers,
  editor,
  loading = true,
}: {
  status: Status;
  peers: Peer[];
  editor: Editor | null;
  loading?: boolean;
}) {
  const downloadMarkdown = () => {
    if (!editor) return;
    const md = toMarkdown(editor.getJSON());
    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace-doc-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusLabel = {
    connected: { text: '연결됨', dot: 'bg-emerald-500' },
    connecting: { text: '연결 중...', dot: 'bg-amber-400 animate-pulse' },
    disconnected: { text: '연결 끊김', dot: 'bg-red-500' },
  }[status];

  return (
    <div className="print-area bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xs p-6 space-y-4">
      <div className="no-print flex flex-wrap gap-3 justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-700 dark:text-gray-200">📄 실시간 협업 문서</span>
          <span className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
            <span className={`w-2 h-2 rounded-full ${statusLabel.dot}`} />
            {statusLabel.text}
          </span>
          {peers.length > 0 && (
            <div className="flex -space-x-1.5" title={peers.map((p) => p.name).join(', ')}>
              {peers.slice(0, 5).map((p) => (
                <span
                  key={p.clientId}
                  className="w-6 h-6 rounded-full text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white dark:ring-gray-800"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name.slice(0, 1)}
                </span>
              ))}
              {peers.length > 5 && (
                <span className="w-6 h-6 rounded-full text-[10px] bg-gray-200 text-gray-700 flex items-center justify-center ring-2 ring-white">
                  +{peers.length - 5}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadMarkdown}
            disabled={!editor}
            className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 text-xs font-semibold rounded-lg transition cursor-pointer disabled:opacity-50"
          >
            📥 Markdown 다운로드
          </button>
          <button
            onClick={() => window.print()}
            className="px-2.5 py-1 bg-gray-900 dark:bg-white dark:text-gray-900 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            🖨️ PDF/인쇄 출력
          </button>
        </div>
      </div>

      {editor && <Toolbar editor={editor} />}

      <div className="relative">
        <EditorContent editor={editor} />
        {(loading || !editor) && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-800/70 rounded-lg text-xs text-gray-500">
            {status === 'disconnected' ? '서버에 연결할 수 없습니다. 서버 주소와 실행 여부를 확인하세요.' : '문서를 불러오는 중...'}
          </div>
        )}
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const btn = (active: boolean) =>
    `px-2 py-1 rounded text-xs font-semibold transition cursor-pointer ${
      active
        ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`;

  return (
    <div className="no-print flex flex-wrap gap-1">
      <button className={btn(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        제목
      </button>
      <button className={btn(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()}>
        <b>B</b>
      </button>
      <button className={btn(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <i>I</i>
      </button>
      <button className={btn(editor.isActive('strike'))} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <s>S</s>
      </button>
      <button className={btn(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        • 목록
      </button>
      <button className={btn(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        1. 목록
      </button>
      <button className={btn(editor.isActive('blockquote'))} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        인용
      </button>
      <button className={btn(editor.isActive('codeBlock'))} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        {'</>'}
      </button>
    </div>
  );
}

/** Tiptap 문서(JSON)를 간단한 Markdown 으로 변환 */
function toMarkdown(doc: JSONContent): string {
  const inline = (nodes: JSONContent[] = []): string =>
    nodes
      .map((n) => {
        if (n.type === 'hardBreak') return '  \n';
        let t = n.text ?? '';
        for (const m of n.marks ?? []) {
          if (m.type === 'bold') t = `**${t}**`;
          else if (m.type === 'italic') t = `*${t}*`;
          else if (m.type === 'strike') t = `~~${t}~~`;
          else if (m.type === 'code') t = `\`${t}\``;
        }
        return t;
      })
      .join('');

  const block = (n: JSONContent, indent = ''): string => {
    switch (n.type) {
      case 'heading':
        return `${'#'.repeat(n.attrs?.level ?? 1)} ${inline(n.content)}`;
      case 'paragraph':
        return indent + inline(n.content);
      case 'blockquote':
        return (n.content ?? []).map((c) => `> ${block(c)}`).join('\n');
      case 'codeBlock':
        return '```' + (n.attrs?.language ?? '') + '\n' + inline(n.content) + '\n```';
      case 'horizontalRule':
        return '---';
      case 'bulletList':
      case 'orderedList':
        return (n.content ?? [])
          .map((item, i) => {
            const marker = n.type === 'bulletList' ? '-' : `${i + 1}.`;
            const [first, ...rest] = item.content ?? [];
            const head = `${indent}${marker} ${first ? inline(first.content) : ''}`;
            const tail = rest.map((c) => block(c, indent + '   ')).join('\n');
            return tail ? `${head}\n${tail}` : head;
          })
          .join('\n');
      default:
        return inline(n.content);
    }
  };

  return (doc.content ?? []).map((n) => block(n)).join('\n\n') + '\n';
}
