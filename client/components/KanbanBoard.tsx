'use client';

import { useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useKanban } from '../lib/useKanban';
import { useSynced } from '../lib/socket';
import type { Member } from '../lib/auth';
import { todayStr } from '../lib/date';
import { TAGS, type ColumnColor, type KanbanColumn, type KanbanTask, type Tag } from '../lib/types';

// Tailwind는 클래스 이름을 그대로 찾아야 하므로 색상별 클래스를 미리 적어 둠
const COLUMN_STYLES: Record<ColumnColor, string> = {
  amber: 'border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20',
  blue: 'border-blue-300 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20',
  emerald: 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/20',
  purple: 'border-purple-300 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-900/20',
  rose: 'border-rose-300 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-900/20',
  gray: 'border-gray-300 bg-gray-50/50 dark:border-slate-700 dark:bg-slate-800/40',
};

const inputCls =
  'text-xs border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 rounded-lg px-3 py-2 outline-none focus:border-blue-500';

export default function KanbanBoard() {
  const { state, dispatch, connected } = useKanban();
  const members = useSynced<Member[]>('team', 'team:state') ?? [];

  const [selectedTag, setSelectedTag] = useState<'전체' | Tag>('전체');
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newTag, setNewTag] = useState<Tag>('AI');
  const [newDue, setNewDue] = useState('');
  const [newColLabel, setNewColLabel] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  // 드래그 직후 서버 응답 전까지 카드가 원래 자리로 튀지 않도록 임시로 위치를 기억
  const [pendingMoves, setPendingMoves] = useState<Record<string, string>>({});
  useEffect(() => setPendingMoves({}), [state]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), // 버튼 클릭과 드래그 구분
    useSensor(KeyboardSensor)
  );

  if (!state) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-10 text-center text-xs text-gray-500">
        {connected ? '칸반 보드를 불러오는 중...' : '서버에 연결할 수 없습니다. 서버 실행 여부와 NEXT_PUBLIC_SERVER_URL 을 확인하세요.'}
      </div>
    );
  }

  const tasks = state.tasks.map((t) => (pendingMoves[t.id] ? { ...t, statusId: pendingMoves[t.id] } : t));
  const visible = selectedTag === '전체' ? tasks : tasks.filter((t) => t.tag === selectedTag);
  const activeTask = tasks.find((t) => t.id === activeId) ?? null;

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    dispatch({ type: 'task:add', payload: { title: newTitle, assignee: newAssignee, tag: newTag, dueDate: newDue } });
    setNewTitle('');
    setNewAssignee('');
    setNewDue('');
  };

  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColLabel.trim()) return;
    dispatch({ type: 'column:add', payload: { label: newColLabel } });
    setNewColLabel('');
  };

  const handleDeleteColumn = (col: KanbanColumn) => {
    if (state.columns.length <= 1) {
      alert('최소 1개 이상의 컬럼은 유지되어야 합니다.');
      return;
    }
    const count = state.tasks.filter((t) => t.statusId === col.id).length;
    const target = state.columns.find((c) => c.id !== col.id)!;
    const msg =
      count > 0
        ? `'${col.label}' 컬럼을 삭제할까요?\n안에 있는 카드 ${count}개는 '${target.label}' 컬럼으로 옮겨집니다.`
        : `'${col.label}' 컬럼을 삭제할까요?`;
    if (confirm(msg)) dispatch({ type: 'column:delete', payload: { id: col.id } });
  };

  const move = (taskId: string, statusId: string) => {
    setPendingMoves((prev) => ({ ...prev, [taskId]: statusId }));
    dispatch({ type: 'task:update', payload: { id: taskId, statusId } });
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over) return;
    const taskId = String(e.active.id);
    const toCol = String(e.over.id);
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.statusId !== toCol) move(taskId, toCol);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-5">
      {/* 카드 추가 / 컬럼 추가 */}
      <div className="pb-4 border-b border-gray-100 dark:border-slate-800">
        <form onSubmit={handleAddTask} className="flex flex-wrap gap-2 flex-1">
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="새 작업 내용 입력..." className={`${inputCls} flex-1 min-w-40`} />
          <input value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)} placeholder="담당자" list="kanban-members" className={`${inputCls} w-28`} />
          <datalist id="kanban-members">
            {members.map((m) => (
              <option key={m.id} value={m.name} />
            ))}
          </datalist>
          <select value={newTag} onChange={(e) => setNewTag(e.target.value as Tag)} className={`${inputCls} px-2`}>
            {TAGS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} className={`${inputCls} px-2`} title="마감일 (선택)" />
          <button type="submit" disabled={!connected} className="bg-gray-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition shrink-0 cursor-pointer disabled:opacity-50">
            + 카드 추가
          </button>
        </form>

      </div>

      {/* 태그 필터 */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-xs font-bold text-gray-500 mr-1">🏷️ 태그 필터:</span>
        {(['전체', ...TAGS] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSelectedTag(t)}
            className={`px-2.5 py-1 text-xs rounded-lg transition cursor-pointer ${
              selectedTag === t
                ? 'bg-gray-900 text-white font-bold dark:bg-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300'
            }`}
          >
            {t}
          </button>
        ))}
        {!connected && <span className="text-[11px] text-red-500">● 연결 끊김 - 변경 사항이 저장되지 않습니다</span>}
        <form onSubmit={handleAddColumn} className="flex gap-2 ml-auto">
          <input value={newColLabel} onChange={(e) => setNewColLabel(e.target.value)} placeholder="새 상태 이름 (예: 검수 중)" className={`${inputCls} w-40`} />
          <button type="submit" disabled={!connected} className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-100 text-xs font-medium px-3 py-2 rounded-lg transition border border-gray-200 dark:border-slate-700 cursor-pointer disabled:opacity-50">
            + 상태 컬럼 추가
          </button>
        </form>
      </div>

      {/* 컬럼 (가로 스크롤) */}
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {state.columns.map((col) => (
            <Column
              key={col.id}
              column={col}
              tasks={visible.filter((t) => t.statusId === col.id)}
              columns={state.columns}
              onDeleteColumn={() => handleDeleteColumn(col)}
              onMove={move}
              onUpdate={(id, patch) => dispatch({ type: 'task:update', payload: { id, ...patch } })}
              onDelete={(task) => confirm(`'${task.title}' 카드를 삭제할까요?`) && dispatch({ type: 'task:delete', payload: { id: task.id } })}
            />
          ))}
        </div>
        <DragOverlay>{activeTask && <CardBody task={activeTask} dragging />}</DragOverlay>
      </DndContext>
    </div>
  );
}

function Column({
  column,
  tasks,
  columns,
  onDeleteColumn,
  onMove,
  onUpdate,
  onDelete,
}: {
  column: KanbanColumn;
  tasks: KanbanTask[];
  columns: KanbanColumn[];
  onDeleteColumn: () => void;
  onMove: (taskId: string, statusId: string) => void;
  onUpdate: (id: string, patch: Partial<KanbanTask>) => void;
  onDelete: (task: KanbanTask) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={`border rounded-xl p-3 flex flex-col gap-3 min-h-[260px] w-[260px] shrink-0 transition ${COLUMN_STYLES[column.color] ?? COLUMN_STYLES.gray} ${
        isOver ? 'ring-2 ring-blue-400' : ''
      }`}
    >
      <div className="flex justify-between items-center px-1">
        <span className="font-semibold text-xs text-gray-800 dark:text-gray-100">{column.label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-300 px-2 py-0.5 rounded-full border border-gray-200 dark:border-slate-700">
            {tasks.length}
          </span>
          <button onClick={onDeleteColumn} className="text-gray-400 hover:text-red-500 text-xs px-1 cursor-pointer" title="상태 컬럼 삭제">
            ✕
          </button>
        </div>
      </div>

      <div className="space-y-2 flex-1">
        {tasks.length === 0 ? (
          <div className="h-24 flex items-center justify-center text-[11px] text-gray-400 border border-dashed border-gray-300/80 dark:border-slate-700 rounded-lg">
            여기로 카드를 끌어다 놓으세요
          </div>
        ) : (
          tasks.map((task) => (
            <DraggableCard key={task.id} task={task} columns={columns} onMove={onMove} onUpdate={onUpdate} onDelete={onDelete} />
          ))
        )}
      </div>
    </div>
  );
}

function DraggableCard({
  task,
  columns,
  onMove,
  onUpdate,
  onDelete,
}: {
  task: KanbanTask;
  columns: KanbanColumn[];
  onMove: (taskId: string, statusId: string) => void;
  onUpdate: (id: string, patch: Partial<KanbanTask>) => void;
  onDelete: (task: KanbanTask) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [assignee, setAssignee] = useState(task.assignee);
  const [tag, setTag] = useState<Tag>(task.tag);
  const [due, setDue] = useState(task.dueDate);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, disabled: editing });

  if (editing) {
    return (
      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-blue-300 space-y-2 text-xs">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={`${inputCls} w-full py-1`} />
        <input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="담당자" list="kanban-members" className={`${inputCls} w-full py-1`} />
        <div className="flex gap-1">
          <select value={tag} onChange={(e) => setTag(e.target.value as Tag)} className={`${inputCls} px-1 py-1 flex-1`}>
            {TAGS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={`${inputCls} px-1 py-1 flex-1`} />
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => {
              onUpdate(task.id, { title, assignee, tag, dueDate: due });
              setEditing(false);
            }}
            className="flex-1 bg-blue-600 text-white text-[11px] py-1 rounded cursor-pointer"
          >
            저장
          </button>
          <button onClick={() => setEditing(false)} className="flex-1 bg-gray-100 dark:bg-slate-700 text-[11px] py-1 rounded cursor-pointer">
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={`touch-none ${isDragging ? 'opacity-30' : ''}`}>
      <CardBody
        task={task}
        actions={
          <>
            <div className="flex gap-2">
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  setTitle(task.title);
                  setAssignee(task.assignee);
                  setTag(task.tag);
                  setDue(task.dueDate);
                  setEditing(true);
                }}
                className="text-gray-500 hover:text-blue-600 transition cursor-pointer"
              >
                수정
              </button>
              <button onPointerDown={(e) => e.stopPropagation()} onClick={() => onDelete(task)} className="text-red-400 hover:text-red-600 transition cursor-pointer">
                삭제
              </button>
            </div>
            {/* 드래그가 어려운 환경(모바일 등)을 위한 상태 변경 */}
            <select
              value={task.statusId}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => onMove(task.id, e.target.value)}
              className="border border-gray-200 dark:border-slate-700 rounded px-1 py-0.5 bg-gray-50 dark:bg-slate-900 text-gray-700 dark:text-gray-300 outline-none max-w-24"
              aria-label="상태 변경"
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </>
        }
      />
    </div>
  );
}

function CardBody({ task, actions, dragging }: { task: KanbanTask; actions?: React.ReactNode; dragging?: boolean }) {
  const today = todayStr();
  const overdue = task.dueDate && task.dueDate < today;

  return (
    <div
      className={`bg-white dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-700 space-y-2 text-xs cursor-grab ${
        dragging ? 'shadow-xl rotate-2 cursor-grabbing' : 'shadow-xs'
      }`}
    >
      <p className="font-medium text-gray-800 dark:text-gray-100 leading-snug">{task.title}</p>
      <div className="flex flex-wrap gap-1.5 items-center text-[10px]">
        <span className="bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold">{task.tag}</span>
        <span className="text-gray-400">👤 {task.assignee}</span>
        {task.dueDate && <span className={overdue ? 'text-red-500 font-semibold' : 'text-gray-400'}>📅 {task.dueDate.slice(5)}</span>}
      </div>
      {actions && (
        <div className="pt-1.5 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between text-[10px]">{actions}</div>
      )}
    </div>
  );
}
