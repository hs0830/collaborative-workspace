'use client';

import Link from 'next/link';

export default function DashboardPage() {
  // 예시 데이터: 팀원별 진행상황 및 역할
  const teamMembers = [
    { name: '강현승', role: '메인 개발 / 파이프라인 구축', progress: 85 },
    { name: '팀원 A', role: '데이터셋 정제 및 전처리', progress: 60 },
    { name: '팀원 B', role: 'UI/UX 디자인 및 프론트엔드', progress: 40 },
  ];

  const totalProgress = Math.round(
    teamMembers.reduce((acc, cur) => acc + cur.progress, 0) / teamMembers.length
  );

  return (
    <div className="space-y-8">
      <header className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-extrabold text-gray-900">📊 프로젝트 대시보드</h1>
        <p className="text-xs text-gray-500 mt-1">
          전체 프로젝트 진행률과 팀원별 달성 상황을 한눈에 점검하세요.
        </p>
      </header>

      {/* 전체 프로젝트 진행률 바 */}
      <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-gray-800 text-sm">팀 전체 프로젝트 진행률</h2>
          <span className="text-lg font-extrabold text-blue-600">{totalProgress}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${totalProgress}%` }}
          />
        </div>
      </section>

      {/* 팀원별 역할 및 진행률 카드 */}
      <section className="space-y-3">
        <h2 className="font-bold text-gray-800 text-sm">👥 팀원별 역할 및 진행 현황</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {teamMembers.map((member, idx) => (
            <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">{member.name}</h3>
                  <p className="text-[11px] text-gray-500">{member.role}</p>
                </div>
                <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                  {member.progress}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full"
                  style={{ width: `${member.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Link 영역 */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/editor" className="p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition">
          <h3 className="font-bold text-xs text-gray-800">📝 실시간 문서 작업 진행</h3>
          <p className="text-[11px] text-gray-400 mt-1">Tiptap 에디터로 회의록 및 사양서 편집</p>
        </Link>
        <Link href="/kanban" className="p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition">
          <h3 className="font-bold text-xs text-gray-800">📋 칸반 보드로 업무 할당</h3>
          <p className="text-[11px] text-gray-400 mt-1">새로운 태스크 생성 및 담당자 부여</p>
        </Link>
      </section>
    </div>
  );
}