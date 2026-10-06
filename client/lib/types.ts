// 서버(server/store.js)와 주고받는 데이터 형태

/** 업로드된 파일 정보 (채팅 첨부·데이터셋 공통) */
export interface StoredFile {
  id: string;
  name: string;
  size: number;
  contentType: string;
  isImage: boolean;
  uploaderName: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  sender: string;
  color: string;
  text: string;
  file?: StoredFile;
  createdAt: string; // ISO 시각
}

export type ColumnColor = 'amber' | 'blue' | 'emerald' | 'purple' | 'rose' | 'gray';

export interface KanbanColumn {
  id: string;
  label: string;
  color: ColumnColor;
}

export const TAGS = ['AI', '프론트엔드', '백엔드', '문서', '기타'] as const;
export type Tag = (typeof TAGS)[number];

export interface KanbanTask {
  id: string;
  title: string;
  assignee: string;
  tag: Tag;
  statusId: string;
  dueDate: string; // YYYY-MM-DD 또는 ''
}

export interface KanbanState {
  columns: KanbanColumn[];
  tasks: KanbanTask[];
}

export type KanbanAction =
  | { type: 'task:add'; payload: Partial<Omit<KanbanTask, 'id'>> & { title: string } }
  | { type: 'task:update'; payload: Partial<KanbanTask> & { id: string } }
  | { type: 'task:delete'; payload: { id: string } }
  | { type: 'column:add'; payload: { label: string; color?: ColumnColor } }
  | { type: 'column:delete'; payload: { id: string } };

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  assignee: string;
}

export type CalendarAction =
  | { type: 'event:add'; payload: Omit<CalendarEvent, 'id'> }
  | { type: 'event:delete'; payload: { id: string } };

export type TeamAction =
  | { type: 'member:add'; payload: { name: string; role?: string; email?: string } }
  | { type: 'member:update'; payload: { id: string; name?: string; role?: string; email?: string } }
  | { type: 'member:delete'; payload: { id: string } };

export interface Meeting {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  attendees: string[];
  createdBy: string;
  preview: string; // 본문 앞부분 (목록·검색용)
  createdAt: string;
  updatedAt: string;
}

export type MeetingAction =
  | { type: 'meeting:add'; payload: { title: string; date: string; attendees: string[] } }
  | { type: 'meeting:update'; payload: { id: string; title?: string; date?: string; attendees?: string[] } }
  | { type: 'meeting:delete'; payload: { id: string } };

export type { Member } from './auth';
