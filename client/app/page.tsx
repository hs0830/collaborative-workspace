'use client';

export default function DashboardPage() {
  // 메인 통계 모의 데이터
  const totalTasks = 12;
  const completedTasks = 5;
  const inProgressTasks = 4;
  const todoTasks = 3;
  const progressPercent = Math.round((completedTasks / totalTasks) * 100);

  const teamDistribution = [
    { name: '강현승', role: 'Full-Stack', tasks: 4, color: 'bg-blue-500' },
    { name: '팀원 A', role: 'Data Eng', tasks: 3, color: 'bg-emerald-500' },
    { name: '팀원 B', role: 'Backend', tasks: 3, color: 'bg-purple-500' },
    { name: '팀원 C', role: 'UX / Doc', tasks: 2, color: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-6">
      <header className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">📊 프로젝트 현황 대시보드</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          팀 전체의 작업 달성률과 마감 임박 일정, 파트별 분담 비율을 확인하세요.
        </p>
      </header>

      {/* 상단 4개 지표 카운터 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">전체 진행률</span>
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-black text-gray-900 dark:text-white">{progressPercent}%</span>
            <span className="text-xs text-blue-600 font-bold">{completedTasks}/{totalTasks} 완료</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-1">
          <span className="text-xs text-amber-600 font-bold">📋 대기 중 카드</span>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{todoTasks}개</p>
          <p className="text-[10px] text-gray-400">우선순위 지정 필요</p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-1">
          <span className="text-xs text-blue-600 font-bold">⚡ 진행 중 카드</span>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{inProgressTasks}개</p>
          <p className="text-[10px] text-gray-400">실시간 진행 작업</p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-1">
          <span className="text-xs text-emerald-600 font-bold">✅ 완료된 카드</span>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{completedTasks}개</p>
          <p className="text-[10px] text-gray-400">목표 달성</p>
        </div>
      </div>

      {/* 팀원별 할당 작업 비중 그래프 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4">
        <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">👥 팀원별 담당 과제 분담 현황</h3>
        <div className="space-y-3">
          {teamDistribution.map((member) => (
            <div key={member.name} className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-800 dark:text-gray-200">{member.name} ({member.role})</span>
                <span className="text-gray-500">{member.tasks}개 할당</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                <div
                  className={`${member.color} h-2.5 rounded-full transition-all duration-500`}
                  style={{ width: `${(member.tasks / totalTasks) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}