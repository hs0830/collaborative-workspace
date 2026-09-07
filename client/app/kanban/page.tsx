'use client';

import { useState } from 'react';

interface Column {
  id: string;
  label: string;
  color: string;
}

interface Task {
  id: string;
  title: string;
  assignee: string;
  statusId: string;
}

export default function KanbanBoard() {
  // 상태(컬럼) 동적 관리
  const [columns, setColumns] = useState<Column[]>([
    { id: 'todo', label: '📋 할 일', color: 'border-amber-300 bg-amber-50/50' },
    { id: 'in_progress', label: '⚡ 진행 중', color: 'border-blue-300 bg-blue-50/50' },
    { id: 'done', label: '✅ 완료', color: 'border-emerald-300 bg-emerald-50/50' },
  ]);

  // 태스크 상태
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: '데이터셋 전처리 및 정제', assignee: '팀원 A', statusId: 'todo' },
    { id: '2', title: '실시간 WebSocket 연결', assignee: '팀원 B', statusId: 'in_progress' },
    { id: '3', title: 'Next.js 레이아웃 구축', assignee: '강현승', statusId: 'done' },
  ]);

  // 입력 폼 상태
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newColLabel, setNewColLabel] = useState('');

  // 수정 모드 상태
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAssignee, setEditAssignee] = useState('');

  // 1. 새 태스크 생성
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || columns.length === 0) return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      assignee: newAssignee.trim() || '미지정',
      statusId: columns[0].id,
    };

    setTasks((prev) => [...prev, newTask]);
    setNewTaskTitle('');
    setNewAssignee('');
  };

  // 2. 태스크 수정 시작 및 완료
  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditAssignee(task.assignee);
  };

  const saveEditing = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title: editTitle, assignee: editAssignee } : t))
    );
    setEditingTaskId(null);
  };

  // 3. 컬럼(상태) 추가
  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColLabel.trim()) return;

    const newCol: Column = {
      id: `col-${Date.now()}`,
      label: newColLabel,
      color: 'border-purple-300 bg-purple-50/50',
    };

    setColumns((prev) => [...prev, newCol]);
    setNewColLabel('');
  };

  // 4. 컬럼(상태) 삭제
  const handleDeleteColumn = (colId: string) => {
    if (columns.length <= 1) {
      alert('최소 1개 이상의 컬럼은 유지되어야 합니다.');
      return;
    }
    setColumns((prev) => prev.filter((col) => col.id !== colId));
    setTasks((prev) => prev.filter((t) => t.statusId !== colId));
  };

  // 5. 태스크 상태 이동
  const handleMoveStatus = (taskId: string, targetStatusId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, statusId: targetStatusId } : t))
    );
  };

  // 6. 태스크 삭제
  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6">
      {/* 태스크 및 컬럼 추가 컨트롤 영역 */}
      <div className="flex flex-col md:flex-row gap-4 pb-4 border-b border-gray-100 justify-between">
        {/* 새 태스크 생성 */}
        <form onSubmit={handleAddTask} className="flex-1 flex gap-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="새 작업 내용 입력..."
            className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
          />
          <input
            type="text"
            value={newAssignee}
            onChange={(e) => setNewAssignee(e.target.value)}
            placeholder="담당자"
            className="w-28 text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="bg-gray-900 hover:bg-black text-white text-xs font-medium px-4 py-2 rounded-lg transition shrink-0 cursor-pointer"
          >
            + 카드 추가
          </button>
        </form>

        {/* 새 칸반 상태(컬럼) 추가 */}
        <form onSubmit={handleAddColumn} className="flex gap-2 shrink-0">
          <input
            type="text"
            value={newColLabel}
            onChange={(e) => setNewColLabel(e.target.value)}
            placeholder="새 상태 이름 (예: 검수 중)"
            className="w-36 text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-medium px-3 py-2 rounded-lg transition border border-gray-200 cursor-pointer"
          >
            + 상태 컬럼 추가
          </button>
        </form>
      </div>

      {/* 동적 칸반 보드 컬럼 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-x-auto">
        {columns.map((col, colIdx) => {
          const colTasks = tasks.filter((t) => t.statusId === col.id);

          return (
            <div
              key={col.id}
              className={`border rounded-xl p-3 flex flex-col gap-3 min-h-[260px] min-w-[220px] ${col.color}`}
            >
              <div className="flex justify-between items-center px-1">
                <span className="font-semibold text-xs text-gray-800">{col.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold bg-white text-gray-500 px-2 py-0.5 rounded-full border border-gray-200">
                    {colTasks.length}
                  </span>
                  <button
                    onClick={() => handleDeleteColumn(col.id)}
                    className="text-gray-400 hover:text-red-500 text-xs px-1"
                    title="상태 컬럼 삭제"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* 태스크 리스트 */}
              <div className="space-y-2 flex-1">
                {colTasks.length === 0 ? (
                  <div className="h-24 flex items-center justify-center text-[11px] text-gray-400 border border-dashed border-gray-200/80 rounded-lg">
                    작업 없음
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs space-y-2 text-xs"
                    >
                      {/* 수정 모드 지원 */}
                      {editingTaskId === task.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full text-xs border border-gray-300 rounded p-1"
                          />
                          <input
                            type="text"
                            value={editAssignee}
                            onChange={(e) => setEditAssignee(e.target.value)}
                            className="w-full text-xs border border-gray-300 rounded p-1"
                          />
                          <button
                            onClick={() => saveEditing(task.id)}
                            className="w-full bg-blue-600 text-white text-[10px] py-1 rounded"
                          >
                            저장
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="font-medium text-gray-800 leading-snug">{task.title}</p>
                          <div className="flex justify-between items-center text-[10px] text-gray-400">
                            <span>👤 {task.assignee}</span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEditing(task)}
                                className="text-gray-500 hover:text-blue-600 transition"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="text-red-400 hover:text-red-600 transition"
                              >
                                삭제
                              </button>
                            </div>
                          </div>

                          {/* 상태 이동 드롭다운 */}
                          <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between text-[10px]">
                            <span className="text-gray-400">상태 변경:</span>
                            <select
                              value={task.statusId}
                              onChange={(e) => handleMoveStatus(task.id, e.target.value)}
                              className="border border-gray-200 rounded px-1.5 py-0.5 bg-gray-50 text-gray-700 outline-none"
                            >
                              {columns.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}