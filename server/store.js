// 데이터 저장소.
// - 모든 데이터를 메모리에 들고 있어 빠르게 응답하고,
// - DATABASE_URL 이 설정되어 있으면 변경할 때마다 PostgreSQL(Supabase)에도 기록합니다.
// - 서버가 다시 켜지면 DB에서 전부 불러옵니다.

const crypto = require('crypto');
const { pool } = require('./db');

const newId = () => crypto.randomUUID();
const MAX_CHAT_HISTORY = 200;
const TAGS = ['AI', '프론트엔드', '백엔드', '문서', '기타'];
const COL_COLORS = ['amber', 'blue', 'emerald', 'purple', 'rose', 'gray'];
const MEMBER_COLORS = ['#2563eb', '#059669', '#9333ea', '#d97706', '#e11d48', '#0891b2', '#4f46e5', '#0d9488'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const dateOrEmpty = (v) => (typeof v === 'string' && DATE_RE.test(v) ? v : '');

/** DB가 연결되어 있을 때만 쿼리 실행 */
const q = (sql, params) => (pool ? pool.query(sql, params) : Promise.resolve({ rows: [] }));

const state = {
  members: [], // { id, name, role, email, color }
  columns: [], // { id, label, color }
  tasks: [], // { id, title, assignee, tag, statusId, dueDate }
  events: [], // { id, title, date, assignee }
  files: new Map(), // id → { id, kind, storageKey, name, size, contentType, uploaderId, uploaderName, status, createdAt }
  chat: [], // { id, senderId, text, fileId, createdAt }
  meetings: [], // { id, title, date, attendees: string[], createdBy, preview, createdAt, updatedAt }
};

// ───────────────────────── 초기화 ─────────────────────────
async function init() {
  if (!pool) {
    seedDemo();
    return;
  }

  const [m, c, t, e, f, ch, mt] = await Promise.all([
    q('select id, name, role, email, color from members order by created_at'),
    q('select id, label, color from kanban_columns order by position'),
    q('select id, title, assignee, tag, status_id, due_date from kanban_tasks order by created_at'),
    q('select id, title, date, assignee from calendar_events order by date, created_at'),
    q("select * from files where status = 'ready'"),
    q('select id, sender_id, text, file_id, created_at from chat_messages order by created_at desc limit $1', [MAX_CHAT_HISTORY]),
    q('select * from meetings order by date desc, created_at desc'),
  ]);

  state.members = m.rows;
  state.columns = c.rows;
  state.tasks = t.rows.map((r) => ({ id: r.id, title: r.title, assignee: r.assignee, tag: r.tag, statusId: r.status_id, dueDate: r.due_date }));
  state.events = e.rows;
  f.rows.forEach((r) => state.files.set(r.id, fileFromRow(r)));
  state.meetings = mt.rows.map(meetingFromRow);
  state.chat = ch.rows.reverse().map((r) => ({ id: r.id, senderId: r.sender_id, text: r.text, fileId: r.file_id, createdAt: r.created_at.toISOString() }));

  // 처음 실행이면 기본 컬럼 생성
  if (state.columns.length === 0) {
    for (const col of defaultColumns()) await addColumnRow(col);
  }
}

function defaultColumns() {
  return [
    { id: 'todo', label: '📋 할 일', color: 'amber' },
    { id: 'in_progress', label: '⚡ 진행 중', color: 'blue' },
    { id: 'done', label: '✅ 완료', color: 'emerald' },
  ];
}

function seedDemo() {
  state.columns = defaultColumns();
  state.tasks = [
    { id: newId(), title: '데이터셋 전처리 및 정제', assignee: '팀원 A', tag: 'AI', statusId: 'todo', dueDate: '' },
    { id: newId(), title: '실시간 WebSocket 연결', assignee: '팀원 B', tag: '백엔드', statusId: 'in_progress', dueDate: '' },
    { id: newId(), title: 'Next.js 레이아웃 구축', assignee: '강현승', tag: '프론트엔드', statusId: 'done', dueDate: '' },
  ];
}

const fileFromRow = (r) => ({
  id: r.id,
  kind: r.kind,
  storageKey: r.storage_key,
  name: r.name,
  size: Number(r.size),
  contentType: r.content_type,
  uploaderId: r.uploader_id,
  uploaderName: r.uploader_name,
  status: r.status,
  createdAt: new Date(r.created_at).toISOString(),
});

// ───────────────────────── 팀원 ─────────────────────────
const getMembers = () => state.members;
const getMember = (id) => state.members.find((m) => m.id === id) || null;
const findMemberByName = (name) => state.members.find((m) => m.name.toLowerCase() === name.toLowerCase()) || null;

async function createMember({ name, role = '', email = '' }) {
  const member = {
    id: newId(),
    name: str(name, 20),
    role: str(role, 60),
    email: str(email, 120),
    color: MEMBER_COLORS[state.members.length % MEMBER_COLORS.length],
  };
  await q('insert into members (id, name, role, email, color) values ($1, $2, $3, $4, $5)', [
    member.id, member.name, member.role, member.email, member.color,
  ]);
  state.members.push(member);
  return member;
}

/** 로그인: 같은 이름의 팀원이 있으면 그 사람으로, 없으면 새로 등록 */
async function loginByName(name) {
  const clean = str(name, 20);
  if (!clean) return null;
  return findMemberByName(clean) || createMember({ name: clean });
}

async function applyTeamAction(action) {
  const p = action?.payload ?? {};
  switch (action?.type) {
    case 'member:add': {
      const name = str(p.name, 20);
      if (!name || findMemberByName(name)) return { ok: false, error: '이름이 비었거나 이미 있는 팀원입니다.' };
      await createMember(p);
      return { ok: true };
    }
    case 'member:update': {
      const m = getMember(p.id);
      if (!m) return { ok: false };
      const oldName = m.name;
      const name = p.name !== undefined ? str(p.name, 20) : m.name;
      if (!name) return { ok: false, error: '이름을 입력하세요.' };
      const dup = findMemberByName(name);
      if (dup && dup.id !== m.id) return { ok: false, error: '같은 이름의 팀원이 있습니다.' };
      const next = {
        name,
        role: p.role !== undefined ? str(p.role, 60) : m.role,
        email: p.email !== undefined ? str(p.email, 120) : m.email,
      };
      await q('update members set name = $2, role = $3, email = $4 where id = $1', [m.id, next.name, next.role, next.email]);
      Object.assign(m, next);
      // 이름이 바뀌면 칸반·캘린더의 담당자 이름도 함께 변경
      if (oldName !== name) {
        await q('update kanban_tasks set assignee = $2 where assignee = $1', [oldName, name]);
        await q('update calendar_events set assignee = $2 where assignee = $1', [oldName, name]);
        state.tasks.forEach((t) => t.assignee === oldName && (t.assignee = name));
        state.events.forEach((e) => e.assignee === oldName && (e.assignee = name));
        // 회의록 참석자 이름도 변경
        for (const mt of state.meetings) {
          if (!mt.attendees.includes(oldName)) continue;
          mt.attendees = mt.attendees.map((a) => (a === oldName ? name : a));
          await q('update meetings set attendees = $2 where id = $1', [mt.id, JSON.stringify(mt.attendees)]);
        }
      }
      return { ok: true, renamed: oldName !== name };
    }
    case 'member:delete': {
      const idx = state.members.findIndex((m) => m.id === p.id);
      if (idx === -1) return { ok: false };
      await q('delete from members where id = $1', [p.id]);
      state.members.splice(idx, 1);
      return { ok: true };
    }
    default:
      return { ok: false };
  }
}

// ───────────────────────── 칸반 ─────────────────────────
const getKanban = () => ({ columns: state.columns, tasks: state.tasks });

async function addColumnRow(col) {
  await q('insert into kanban_columns (id, label, color, position) values ($1, $2, $3, $4)', [col.id, col.label, col.color, state.columns.length]);
  state.columns.push(col);
}

async function applyKanbanAction(action) {
  const p = action?.payload ?? {};

  switch (action?.type) {
    case 'task:add': {
      const title = str(p.title, 200);
      if (!title || state.columns.length === 0) return false;
      const task = {
        id: newId(),
        title,
        assignee: str(p.assignee, 40) || '미지정',
        tag: TAGS.includes(p.tag) ? p.tag : '기타',
        statusId: state.columns.some((c) => c.id === p.statusId) ? p.statusId : state.columns[0].id,
        dueDate: dateOrEmpty(p.dueDate),
      };
      await q('insert into kanban_tasks (id, title, assignee, tag, status_id, due_date) values ($1, $2, $3, $4, $5, $6)', [
        task.id, task.title, task.assignee, task.tag, task.statusId, task.dueDate,
      ]);
      state.tasks.push(task);
      return true;
    }
    case 'task:update': {
      const t = state.tasks.find((x) => x.id === p.id);
      if (!t) return false;
      const next = { ...t };
      if (p.title !== undefined) next.title = str(p.title, 200) || t.title;
      if (p.assignee !== undefined) next.assignee = str(p.assignee, 40) || '미지정';
      if (p.tag !== undefined && TAGS.includes(p.tag)) next.tag = p.tag;
      if (p.dueDate !== undefined) next.dueDate = dateOrEmpty(p.dueDate);
      if (p.statusId !== undefined && state.columns.some((c) => c.id === p.statusId)) next.statusId = p.statusId;
      await q('update kanban_tasks set title = $2, assignee = $3, tag = $4, status_id = $5, due_date = $6 where id = $1', [
        t.id, next.title, next.assignee, next.tag, next.statusId, next.dueDate,
      ]);
      Object.assign(t, next);
      return true;
    }
    case 'task:delete': {
      const idx = state.tasks.findIndex((x) => x.id === p.id);
      if (idx === -1) return false;
      await q('delete from kanban_tasks where id = $1', [p.id]);
      state.tasks.splice(idx, 1);
      return true;
    }
    case 'column:add': {
      const label = str(p.label, 40);
      if (!label) return false;
      await addColumnRow({ id: `col-${newId().slice(0, 8)}`, label, color: COL_COLORS.includes(p.color) ? p.color : 'purple' });
      return true;
    }
    case 'column:delete': {
      if (state.columns.length <= 1) return false;
      const idx = state.columns.findIndex((c) => c.id === p.id);
      if (idx === -1) return false;
      const fallback = state.columns.find((c) => c.id !== p.id).id;
      // 삭제된 컬럼의 카드는 지우지 않고 다른 컬럼으로 이동
      await q('update kanban_tasks set status_id = $2 where status_id = $1', [p.id, fallback]);
      await q('delete from kanban_columns where id = $1', [p.id]);
      state.tasks.forEach((t) => t.statusId === p.id && (t.statusId = fallback));
      state.columns.splice(idx, 1);
      return true;
    }
    default:
      return false;
  }
}

// ───────────────────────── 캘린더 ─────────────────────────
const getEvents = () => state.events;

async function applyCalendarAction(action) {
  const p = action?.payload ?? {};
  switch (action?.type) {
    case 'event:add': {
      const title = str(p.title, 200);
      const date = dateOrEmpty(p.date);
      if (!title || !date) return false;
      const ev = { id: newId(), title, date, assignee: str(p.assignee, 40) || '미지정' };
      await q('insert into calendar_events (id, title, date, assignee) values ($1, $2, $3, $4)', [ev.id, ev.title, ev.date, ev.assignee]);
      state.events.push(ev);
      state.events.sort((a, b) => a.date.localeCompare(b.date));
      return true;
    }
    case 'event:delete': {
      const idx = state.events.findIndex((e) => e.id === p.id);
      if (idx === -1) return false;
      await q('delete from calendar_events where id = $1', [p.id]);
      state.events.splice(idx, 1);
      return true;
    }
    default:
      return false;
  }
}

// ───────────────────────── 파일 ─────────────────────────
async function createFile({ kind, storageKey, name, size, contentType, uploader }) {
  const file = {
    id: newId(),
    kind,
    storageKey,
    name,
    size,
    contentType,
    uploaderId: uploader.id,
    uploaderName: uploader.name,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  await q(
    'insert into files (id, kind, storage_key, name, size, content_type, uploader_id, uploader_name, status) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [file.id, file.kind, file.storageKey, file.name, file.size, file.contentType, file.uploaderId, file.uploaderName, file.status]
  );
  state.files.set(file.id, file);
  return file;
}

const getFile = (id) => state.files.get(id) || null;

async function markFileReady(id, size) {
  const f = state.files.get(id);
  if (!f) return null;
  await q("update files set status = 'ready', size = $2 where id = $1", [id, size]);
  f.status = 'ready';
  f.size = size;
  return f;
}

async function deleteFile(id) {
  await q('delete from files where id = $1', [id]);
  state.files.delete(id);
  state.chat.forEach((m) => m.fileId === id && (m.fileId = null));
}

const publicFile = (f) => ({
  id: f.id,
  name: f.name,
  size: f.size,
  contentType: f.contentType,
  isImage: /^image\/(png|jpe?g|gif|webp)$/.test(f.contentType),
  uploaderName: f.uploaderName,
  createdAt: f.createdAt,
});

const listDatasets = () =>
  [...state.files.values()]
    .filter((f) => f.kind === 'dataset' && f.status === 'ready')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(publicFile);

// ───────────────────────── 회의록 ─────────────────────────
// 회의 정보(제목·날짜·참석자)만 여기서 관리하고, 본문은 실시간 문서(Yjs)로 저장합니다.

const meetingFromRow = (r) => ({
  id: r.id,
  title: r.title,
  date: r.date,
  attendees: safeJsonArray(r.attendees),
  createdBy: r.created_by,
  preview: r.preview,
  createdAt: new Date(r.created_at).toISOString(),
  updatedAt: new Date(r.updated_at).toISOString(),
});

function safeJsonArray(text) {
  try {
    const v = JSON.parse(text);
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

const cleanAttendees = (list) =>
  Array.isArray(list) ? [...new Set(list.map((n) => str(n, 20)).filter(Boolean))].slice(0, 30) : [];

const sortMeetings = () =>
  state.meetings.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

const getMeetings = () => state.meetings;
const getMeeting = (id) => state.meetings.find((m) => m.id === id) || null;

/** 회의록 문서 이름 (y-websocket 이 붙이는 'yjs/' 접두사 포함) */
const meetingDocName = (id) => `yjs/meeting-${id}`;

async function applyMeetingAction(action, member) {
  const p = action?.payload ?? {};
  switch (action?.type) {
    case 'meeting:add': {
      const title = str(p.title, 100);
      const date = dateOrEmpty(p.date);
      if (!title || !date) return { ok: false, error: '제목과 날짜를 입력하세요.' };
      const now = new Date().toISOString();
      const mt = {
        id: newId(),
        title,
        date,
        attendees: cleanAttendees(p.attendees),
        createdBy: member.name,
        preview: '',
        createdAt: now,
        updatedAt: now,
      };
      await q('insert into meetings (id, title, date, attendees, created_by) values ($1, $2, $3, $4, $5)', [
        mt.id, mt.title, mt.date, JSON.stringify(mt.attendees), mt.createdBy,
      ]);
      state.meetings.push(mt);
      sortMeetings();
      return { ok: true, id: mt.id };
    }
    case 'meeting:update': {
      const mt = getMeeting(p.id);
      if (!mt) return { ok: false, error: '회의록을 찾을 수 없습니다.' };
      const next = {
        title: p.title !== undefined ? str(p.title, 100) || mt.title : mt.title,
        date: p.date !== undefined ? dateOrEmpty(p.date) || mt.date : mt.date,
        attendees: p.attendees !== undefined ? cleanAttendees(p.attendees) : mt.attendees,
      };
      await q('update meetings set title = $2, date = $3, attendees = $4, updated_at = now() where id = $1', [
        mt.id, next.title, next.date, JSON.stringify(next.attendees),
      ]);
      Object.assign(mt, next, { updatedAt: new Date().toISOString() });
      sortMeetings();
      return { ok: true };
    }
    case 'meeting:delete': {
      const idx = state.meetings.findIndex((m) => m.id === p.id);
      if (idx === -1) return { ok: false };
      await q('delete from meetings where id = $1', [p.id]);
      await q('delete from yjs_documents where name = $1', [meetingDocName(p.id)]);
      state.meetings.splice(idx, 1);
      return { ok: true };
    }
    default:
      return { ok: false };
  }
}

/**
 * 회의록 본문이 저장될 때 호출 (yjs.js). 목록에 보여줄 미리보기와 수정 시각을 갱신합니다.
 * 바뀐 게 있으면 true 를 돌려줘서 목록을 다시 배포하게 합니다.
 */
async function touchMeeting(id, preview) {
  const mt = getMeeting(id);
  if (!mt) return false;
  const clean = str(preview, 300);
  if (clean === mt.preview) return false;
  mt.preview = clean;
  mt.updatedAt = new Date().toISOString();
  await q('update meetings set preview = $2, updated_at = now() where id = $1', [id, clean]);
  return true;
}

// ───────────────────────── 채팅 ─────────────────────────
const SYSTEM_SENDER = { name: '시스템', color: '#6b7280' };

function toClientMessage(m) {
  const sender = getMember(m.senderId) || (m.senderId === 'system' ? SYSTEM_SENDER : { name: '(탈퇴한 팀원)', color: '#9ca3af' });
  const file = m.fileId ? getFile(m.fileId) : null;
  return {
    id: m.id,
    senderId: m.senderId,
    sender: sender.name,
    color: sender.color,
    text: m.text,
    file: file && file.status === 'ready' ? publicFile(file) : undefined,
    createdAt: m.createdAt,
  };
}

const getChatHistory = () => state.chat.map(toClientMessage);

async function addChatMessage({ senderId, text, fileId }) {
  const file = fileId ? getFile(fileId) : null;
  const msg = {
    id: newId(),
    senderId,
    text: str(text, 2000),
    fileId: file && file.kind === 'chat' && file.status === 'ready' && file.uploaderId === senderId ? file.id : null,
    createdAt: new Date().toISOString(),
  };
  if (!msg.text && !msg.fileId) return null;

  await q('insert into chat_messages (id, sender_id, text, file_id, created_at) values ($1, $2, $3, $4, $5)', [
    msg.id, msg.senderId, msg.text, msg.fileId, msg.createdAt,
  ]);
  state.chat.push(msg);
  if (state.chat.length > MAX_CHAT_HISTORY) state.chat.splice(0, state.chat.length - MAX_CHAT_HISTORY);
  return toClientMessage(msg);
}

module.exports = {
  init,
  // 팀원
  getMembers, getMember, loginByName, applyTeamAction,
  // 칸반
  getKanban, applyKanbanAction,
  // 캘린더
  getEvents, applyCalendarAction,
  // 파일
  createFile, getFile, markFileReady, deleteFile, listDatasets, publicFile,
  // 채팅
  getChatHistory, addChatMessage,
  // 회의록
  getMeetings, getMeeting, applyMeetingAction, touchMeeting, meetingDocName,
};
