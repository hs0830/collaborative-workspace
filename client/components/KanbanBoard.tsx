'use client';

import { useState } from 'react';

type TaskStatus = 'todo' | 'in_progress' | 'done';

interface Task {
  id: string;
  title: string;
  assignee: string;
  status: TaskStatus;
}

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: '데이터셋 전처리 및 정제', assignee: '팀원 A', status: 'todo' },
    { id: '2', title: '실시간 WebSocket 연결', assignee: '팀원 B', status: 'in_progress' },
    { id: '3', title: 'Next.js 레이아웃 구축', assignee: '나', status: 'done' },
  ]);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('');

  // 새 작업 추가
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      assignee: newAssignee.trim() || '미지정',
      status: 'todo',
    };

    setTasks((prev) => [...prev, newTask]);
    setNewTaskTitle('');
    setNewAssignee('');
  };

  // 작업 상태 변경 (이동)
  const handleMoveStatus = (id: string, nextStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, status: nextStatus } : task))
    );
  };

  // 작업 삭제
  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const columns: { key: TaskStatus; label: string; color: string }[] = [
    { key: 'todo', label: '📋 할 일', color: 'border-amber-300 bg-amber-50/50' },
    { key: 'in_progress', label: '⚡ 진행 중', color: 'border-blue-300 bg-blue-50/50' },
    { key: 'done', label: '✅ 완료', color: 'border-emerald-300 bg-emerald-50/50' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6">
      {/* 새 작업 생성 폼 */}
      <form onSubmit={handleAddTask} className="flex flex-col sm:flex-row gap-2 pb-4 border-b border-gray-100">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="새로운 작업 제목 입력..."
          className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition"
        />
        <input
          type="text"
          value={newAssignee}
          onChange={(e) => setNewAssignee(e.target.value)}
          placeholder="담당자 (선택)"
          className="w-full sm:w-32 text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition"
        />
        <button
          type="submit"
          className="bg-gray-900 hover:bg-black text-white text-xs font-medium px-4 py-2 rounded-lg transition shrink-0 cursor-pointer"
        >
          + 카드 추가
        </button>
      </form>

      {/* 3컬럼 칸반 보드 레이아웃 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((col) => {
          const colTasks = tasks.filter((task) => task.status === col.key);

          return (
            <div key={col.key} className={`border rounded-xl p-3 flex flex-col gap-3 min-h-[220px] ${col.color}`}>
              <div className="flex justify-between items-center px-1">
                <span className="font-semibold text-xs text-gray-700">{col.label}</span>
                <span className="text-[10px] font-bold bg-white text-gray-500 px-2 py-0.5 rounded-full border border-gray-200">
                  {colTasks.length}
                </span>
              </div>

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
                      <p className="font-medium text-gray-800 leading-snug">{task.title}</p>
                      <div className="flex justify-between items-center text-[10px] text-gray-400">
                        <span>👤 {task.assignee}</span>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-red-400 hover:text-red-600 transition"
                          title="삭제"
                        >
                          삭제
                        </button>
                      </div>

                      {/* 상태 이동 버튼 */}
                      <div className="flex gap-1 pt-1 border-t border-gray-50">
                        {col.key !== 'todo' && (
                          <button
                            onClick={() =>
                              handleMoveStatus(
                                task.id,
                                col.key === 'done' ? 'in_progress' : 'todo'
                              )
                            }
                            className="flex-1 py-1 text-[10px] bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-gray-600 transition"
                          >
                            ◀ 이전
                          </button>
                        )}
                        {col.key !== 'done' && (
                          <button
                            onClick={() =>
                              handleMoveStatus(
                                task.id,
                                col.key === 'todo' ? 'in_progress' : 'done'
                              )
                            }
                            className="flex-1 py-1 text-[10px] bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-gray-600 transition"
                          >
                            다음 ▶
                          </button>
                        )}
                      </div>
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