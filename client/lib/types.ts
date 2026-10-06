// 서버(server/store.js)와 주고받는 데이터 형태

/** 업로드된 파일 정보 (채팅 첨부·데이터셋 공통) */
export interface StoredFile {
  id: string;
  name: string;
  size: number;
  contentType: string;
  isImage: boolean;
  uploaderId: string;
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
  completedAt?: string; // 완료 컬럼에 들어간 시각 (ISO) 또는 ''
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

export const WORK_CATEGORIES = ['코드', '문서', '발표자료', '실험결과', '디자인', '기타'] as const;
export type WorkCategory = (typeof WORK_CATEGORIES)[number];

/** 작업 기록 페이지에 올리는 개인 작업물 */
export interface Work {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: WorkCategory;
  visibility: 'team' | 'private';
  fileId: string | null;
  file: StoredFile | null;
  linkUrl: string;
  taskId: string | null; // 연결된 칸반 카드
  createdAt: string;
  updatedAt: string;
}

export interface WorkInput {
  title: string;
  description: string;
  category: WorkCategory;
  visibility: 'team' | 'private';
  linkUrl: string;
  taskId: string | null;
  fileId?: string | null; // 보낼 때만 파일 변경 (null = 파일 제거)
}

export type WorkAction =
  | { type: 'work:add'; payload: WorkInput }
  | { type: 'work:update'; payload: Partial<WorkInput> & { id: string } }
  | { type: 'work:delete'; payload: { id: string } };

export type { Member } from './auth';
