// 채팅·칸반 데이터 저장소.
// 지금은 메모리에만 보관합니다 (서버 재시작 시 초기화).
// 4단계에서 이 파일만 DB 연동으로 바꾸면 나머지 코드는 그대로 동작하도록 함수 형태로 분리했습니다.

const crypto = require('crypto');

const MAX_CHAT_HISTORY = 200;
const newId = () => crypto.randomUUID();

const state = {
  chat: [
    {
      id: newId(),
      senderId: 'system',
      sender: '시스템',
      color: '#6b7280',
      text: '팀 채팅방에 오신 것을 환영합니다!',
      createdAt: new Date().toISOString(),
    },
  ],
  kanban: {
    columns: [
      { id: 'todo', label: '📋 할 일', color: 'amber' },
      { id: 'in_progress', label: '⚡ 진행 중', color: 'blue' },
      { id: 'done', label: '✅ 완료', color: 'emerald' },
    ],
    tasks: [
      { id: newId(), title: '데이터셋 전처리 및 정제', assignee: '팀원 A', tag: 'AI', statusId: 'todo', dueDate: '' },
      { id: newId(), title: '실시간 WebSocket 연결', assignee: '팀원 B', tag: '백엔드', statusId: 'in_progress', dueDate: '' },
      { id: newId(), title: 'Next.js 레이아웃 구축', assignee: '강현승', tag: '프론트엔드', statusId: 'done', dueDate: '' },
    ],
  },
};

// ───────── 입력값 정리 ─────────
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const TAGS = ['AI', '프론트엔드', '백엔드', '문서', '기타'];
const COL_COLORS = ['amber', 'blue', 'emerald', 'purple', 'rose', 'gray'];

// ───────── 채팅 ─────────
function getChatHistory() {
  return state.chat;
}

function addChatMessage({ senderId, sender, color, text, file }) {
  const msg = {
    id: newId(),
    senderId: str(senderId, 40) || 'unknown',
    sender: str(sender, 20) || '익명',
    color: /^#[0-9a-f]{6}$/i.test(color) ? color : '#6b7280',
    text: str(text, 2000),
    createdAt: new Date().toISOString(),
  };
  if (file && typeof file.url === 'string' && file.url.startsWith('/uploads/')) {
    msg.file = {
      url: file.url,
      name: str(file.name, 200) || 'file',
      size: Number(file.size) || 0,
      isImage: Boolean(file.isImage),
    };
  }
  if (!msg.text && !msg.file) return null;

  state.chat.push(msg);
  if (state.chat.length > MAX_CHAT_HISTORY) state.chat.splice(0, state.chat.length - MAX_CHAT_HISTORY);
  return msg;
}

// ───────── 칸반 ─────────
function getKanban() {
  return state.kanban;
}

/**
 * 칸반 변경 요청을 적용합니다. 성공하면 true.
 * 클라이언트는 "무엇을 바꿀지"만 보내고, 실제 상태는 서버가 관리합니다.
 */
function applyKanbanAction(action) {
  const k = state.kanban;
  const p = action?.payload ?? {};

  switch (action?.type) {
    case 'task:add': {
      const title = str(p.title, 200);
      if (!title || k.columns.length === 0) return false;
      k.tasks.push({
        id: newId(),
        title,
        assignee: str(p.assignee, 40) || '미지정',
        tag: TAGS.includes(p.tag) ? p.tag : '기타',
        statusId: k.columns.some((c) => c.id === p.statusId) ? p.statusId : k.columns[0].id,
        dueDate: /^\d{4}-\d{2}-\d{2}$/.test(p.dueDate) ? p.dueDate : '',
      });
      return true;
    }
    case 'task:update': {
      const t = k.tasks.find((x) => x.id === p.id);
      if (!t) return false;
      if (p.title !== undefined) t.title = str(p.title, 200) || t.title;
      if (p.assignee !== undefined) t.assignee = str(p.assignee, 40) || '미지정';
      if (p.tag !== undefined && TAGS.includes(p.tag)) t.tag = p.tag;
      if (p.dueDate !== undefined) t.dueDate = /^\d{4}-\d{2}-\d{2}$/.test(p.dueDate) ? p.dueDate : '';
      if (p.statusId !== undefined && k.columns.some((c) => c.id === p.statusId)) t.statusId = p.statusId;
      return true;
    }
    case 'task:delete': {
      const before = k.tasks.length;
      k.tasks = k.tasks.filter((x) => x.id !== p.id);
      return k.tasks.length !== before;
    }
    case 'column:add': {
      const label = str(p.label, 40);
      if (!label) return false;
      k.columns.push({
        id: `col-${newId().slice(0, 8)}`,
        label,
        color: COL_COLORS.includes(p.color) ? p.color : 'purple',
      });
      return true;
    }
    case 'column:delete': {
      if (k.columns.length <= 1) return false;
      const idx = k.columns.findIndex((c) => c.id === p.id);
      if (idx === -1) return false;
      k.columns.splice(idx, 1);
      // 삭제된 컬럼의 카드는 지우지 않고 첫 번째 컬럼으로 옮김
      const fallback = k.columns[0].id;
      k.tasks.forEach((t) => {
        if (t.statusId === p.id) t.statusId = fallback;
      });
      return true;
    }
    default:
      return false;
  }
}

module.exports = { getChatHistory, addChatMessage, getKanban, applyKanbanAction, TAGS };
