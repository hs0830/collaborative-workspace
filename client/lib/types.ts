// 서버(server/store.js)와 주고받는 데이터 형태

export interface ChatFile {
  url: string; // 서버 기준 경로 (/uploads/...)
  name: string;
  size: number;
  isImage: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  sender: string;
  color: string;
  text: string;
  file?: ChatFile;
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
