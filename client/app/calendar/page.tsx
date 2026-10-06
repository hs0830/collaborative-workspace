'use client';

import { useState } from 'react';

interface Event {
  id: string;
  title: string;
  date: string;
  assignee: string;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 1));
  const [selectedDate, setSelectedDate] = useState('2026-09-15');
  const [events, setEvents] = useState<Event[]>([
    { id: '1', title: '데이터셋 1차 정제 마감', date: '2026-09-15', assignee: '팀원 A' },
    { id: '2', title: '중간 모델 학습 및 평가', date: '2026-09-22', assignee: '강현승' },
  ]);

  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !selectedDate) return;

    setEvents((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        title: newTitle,
        date: selectedDate,
        assignee: newAssignee.trim() || '미지정',
      },
    ]);
    setNewTitle('');
    setNewAssignee('');
  };

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="space-y-6">
      <header className="border-b border-gray-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">📅 팀 프로젝트 캘린더</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          달력에서 날짜를 클릭해 마일스톤과 데드라인을 등록 관리하세요.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 달력 판 */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-slate-800">
            <h2 className="font-bold text-gray-800 dark:text-gray-100 text-base">
              {year}년 {month + 1}월
            </h2>
            <div className="flex gap-1">
              <button
                onClick={handlePrevMonth}
                className="px-2.5 py-1 text-xs border border-gray-200 dark:border-slate-700 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300"
              >
                ◀ 이전달
              </button>
              <button
                onClick={handleNextMonth}
                className="px-2.5 py-1 text-xs border border-gray-200 dark:border-slate-700 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300"
              >
                다음달 ▶
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {dayNames.map((day, idx) => (
              <div
                key={day}
                className={`text-xs font-bold py-1.5 ${
                  idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {day}
              </div>
            ))}

            {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-16 bg-gray-50/50 dark:bg-slate-800/30 rounded-lg" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(
                dayNum
              ).padStart(2, '0')}`;
              const dayEvents = events.filter((e) => e.date === formattedDate);
              const isSelected = selectedDate === formattedDate;

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDate(formattedDate)}
                  className={`h-16 p-1.5 rounded-lg border text-left transition flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/50 font-bold'
                      : 'border-gray-100 dark:border-slate-800/80 hover:border-gray-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  <span className={`text-xs ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {dayNum}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-md truncate w-full">
                      {dayEvents[0].title}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 오른쪽 선택 날짜 일정 추가 박스 */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm border-b border-gray-100 dark:border-slate-800 pb-2">
            📌 {selectedDate} 일정 등록
          </h3>

          <form onSubmit={handleAddEvent} className="space-y-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="일정 제목..."
              className="w-full text-xs border border-gray-200 dark:border-slate-700 dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            />
            <input
              type="text"
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
              placeholder="담당자 (선택)"
              className="w-full text-xs border border-gray-200 dark:border-slate-700 dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="w-full bg-gray-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 text-white text-xs font-medium py-2 rounded-lg transition cursor-pointer"
            >
              + 일정 추가
            </button>
          </form>

          <div className="pt-2 border-t border-gray-100 dark:border-slate-800 space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              선택한 날짜 일정 ({events.filter((e) => e.date === selectedDate).length})
            </h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {events
                .filter((e) => e.date === selectedDate)
                .map((evt) => (
                  <div key={evt.id} className="p-2.5 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-lg text-xs">
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{evt.title}</p>
                    <p className="text-[10px] text-gray-400">👤 {evt.assignee}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}