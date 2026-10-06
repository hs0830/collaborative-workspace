'use client';

import { useState } from 'react';

interface Task {
  id: string;
  title: string;
  assignee: string;
  tag: string;
  statusId: string;
}

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: '데이터셋 전처리 및 정제', assignee: '팀원 A', tag: 'AI', statusId: 'todo' },
    { id: '2', title: '실시간 WebSocket 연결', assignee: '팀원 B', tag: '백엔드', statusId: 'in_progress' },
    { id: '3', title: 'Next.js 레이아웃 구축', assignee: '강현승', tag: '프론트엔드', statusId: 'done' },
  ]);

  const [selectedTag, setSelectedTag] = useState('전체');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newTag, setNewTag] = useState('AI');

  const tags = ['전체', 'AI', '프론트엔드', '백엔드', '문서'];

  const columns = [
    { id: 'todo', label: '📋 할 일', color: 'border-amber-300 bg-amber-50/50 dark:bg-amber-900/20' },
    { id: 'in_progress', label: '⚡ 진행 중', color: 'border-blue-300 bg-blue-50/50 dark:bg-blue-900/20' },
    { id: 'done', label: '✅ 완료', color: 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/20' },
  ];

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setTasks((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        title: newTaskTitle,
        assignee: newAssignee.trim() || '미지정',
        tag: newTag,
        statusId: 'todo',
      },
    ]);
    setNewTaskTitle('');
    setNewAssignee('');
  };

  const filteredTasks = selectedTag === '전체' ? tasks : tasks.filter((t) => t.tag === selectedTag);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-6">
      {/* 필터버튼 & 추가 폼 */}
      <div className="flex flex-col md:flex-row justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
        {/* 태그 필터 */}
        <div className="flex gap-1.5 items-center">
          <span className="text-xs font-bold text-gray-500 mr-2">🏷️ 태그 필터:</span>
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTag(t)}
              className={`px-2.5 py-1 text-xs rounded-lg transition cursor-pointer ${
                selectedTag === t
                  ? 'bg-gray-900 text-white font-bold dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* 태그 포함 카드 추가 */}
        <form onSubmit={handleAddTask} className="flex gap-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="작업 제목..."
            className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 outline-none bg-transparent"
          />
          <input
            type="text"
            value={newAssignee}
            onChange={(e) => setNewAssignee(e.target.value)}
            placeholder="담당자"
            className="w-24 text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 outline-none bg-transparent"
          />
          <select
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-transparent"
          >
            <option value="AI">AI</option>
            <option value="프론트엔드">프론트엔드</option>
            <option value="백엔드">백엔드</option>
            <option value="문서">문서</option>
          </select>
          <button type="submit" className="bg-gray-900 dark:bg-white dark:text-gray-900 text-white text-xs px-3 py-1.5 rounded-lg">
            + 추가
          </button>
        </form>
      </div>

      {/* 칸반 컬럼 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.statusId === col.id);
          return (
            <div key={col.id} className={`border rounded-xl p-4 space-y-3 ${col.color}`}>
              <div className="flex justify-between items-center font-bold text-xs">
                <span>{col.label}</span>
                <span className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full text-[10px]">
                  {colTasks.length}
                </span>
              </div>
              <div className="space-y-2">
                {colTasks.map((task) => (
                  <div key={task.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2 text-xs">
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{task.title}</p>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">{task.tag}</span>
                      <span className="text-gray-400">👤 {task.assignee}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}