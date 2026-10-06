'use client';

import { useState } from 'react';

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  avatarColor: string;
  tasks: { title: string; status: '할 일' | '진행 중' | '완료'; dueDate: string }[];
}

export default function TeamPage() {
  // 초기 4명 팀원 데이터
  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: '강현승',
      role: '팀장 / Full-Stack & AI Engine',
      email: 'hyeonseung@example.com',
      avatarColor: 'bg-blue-600',
      tasks: [
        { title: 'Next.js & Tailwind v4 프론트엔드 구축', status: '완료', dueDate: '2026-09-05' },
        { title: 'Render/Vercel 서버 및 WebSocket 연동', status: '진행 중', dueDate: '2026-09-10' },
        { title: '중간 모델 학습 및 성능 평가', status: '할 일', dueDate: '2026-09-22' },
      ],
    },
    {
      id: '2',
      name: '팀원 A',
      role: 'Data Engineer / 전처리 담당',
      email: 'memberA@example.com',
      avatarColor: 'bg-emerald-600',
      tasks: [
        { title: '데이터셋 1차 수집 및 DICOM 정제', status: '진행 중', dueDate: '2026-09-15' },
        { title: '대용량 데이터셋 라벨링 검수', status: '할 일', dueDate: '2026-09-18' },
      ],
    },
    {
      id: '3',
      name: '팀원 B',
      role: 'Backend & Cloud Infrastructure',
      email: 'memberB@example.com',
      avatarColor: 'bg-purple-600',
      tasks: [
        { title: 'Yjs 실시간 동기화 WebSocket 채널 개설', status: '완료', dueDate: '2026-09-02' },
        { title: '대용량 파일 업로드 API 테스트', status: '진행 중', dueDate: '2026-09-12' },
      ],
    },
    {
      id: '4',
      name: '팀원 C',
      role: 'UI/UX & Document Specialist',
      email: 'memberC@example.com',
      avatarColor: 'bg-amber-600',
      tasks: [
        { title: '팀 프로젝트 요구사항 정의서 작성', status: '완료', dueDate: '2026-09-01' },
        { title: '칸반 및 캘린더 피드백 문서 정리', status: '진행 중', dueDate: '2026-09-08' },
      ],
    },
  ]);

  // 상세 팝업 모달 상태
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // 팀원 추가 폼 상태
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newEmail, setNewEmail] = useState('');

  // 새 팀원 추가
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newRole.trim()) return;

    const colors = ['bg-rose-600', 'bg-indigo-600', 'bg-teal-600', 'bg-orange-600'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: newName,
      role: newRole,
      email: newEmail.trim() || 'member@example.com',
      avatarColor: randomColor,
      tasks: [],
    };

    setMembers((prev) => [...prev, newMember]);
    setNewName('');
    setNewRole('');
    setNewEmail('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <header className="border-b border-gray-200 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">👥 프로젝트 팀원 관리</h1>
          <p className="text-xs text-gray-500 mt-1">
            팀 카드를 클릭하여 해당 팀원의 역할, 담당 업무 및 일정을 한눈에 확인하세요.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-gray-900 hover:bg-black text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition cursor-pointer shadow-xs"
        >
          + 팀원 추가하기
        </button>
      </header>

      {/* 팀원 그리드 카드 목록 (기본 4명) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {members.map((member) => {
          const inProgressCount = member.tasks.filter((t) => t.status === '진행 중').length;
          const todoCount = member.tasks.filter((t) => t.status === '할 일').length;

          return (
            <div
              key={member.id}
              onClick={() => setSelectedMember(member)}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-500 hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-full text-white font-bold text-sm flex items-center justify-center shrink-0 ${member.avatarColor}`}
                  >
                    {member.name.substring(0, 2)}
                  </div>
                  <div className="overflow-hidden">
                    <h2 className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition truncate">
                      {member.name}
                    </h2>
                    <p className="text-[11px] text-gray-500 truncate">{member.role}</p>
                  </div>
                </div>

                <div className="text-[11px] text-gray-400 border-t border-gray-100 pt-2 truncate">
                  ✉️ {member.email}
                </div>
              </div>

              {/* 일정 요약 태그 */}
              <div className="flex gap-2 pt-2 text-[10px]">
                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-200/60 font-medium">
                  진행 중 {inProgressCount}개
                </span>
                <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-md border border-amber-200/60 font-medium">
                  대기 {todoCount}개
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 팀원 상세 클릭 팝업 (모달) */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-lg cursor-pointer px-2"
            >
              ✕
            </button>

            {/* 프로필 헤더 */}
            <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
              <div
                className={`w-14 h-14 rounded-full text-white font-extrabold text-lg flex items-center justify-center shrink-0 ${selectedMember.avatarColor}`}
              >
                {selectedMember.name.substring(0, 2)}
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-gray-900">{selectedMember.name}</h3>
                <p className="text-xs font-semibold text-blue-600 mt-0.5">{selectedMember.role}</p>
                <p className="text-[11px] text-gray-400 mt-1">📧 {selectedMember.email}</p>
              </div>
            </div>

            {/* 담당 업무 & 과제 리스트 */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                📌 현재 할 당된 업무 및 일정 ({selectedMember.tasks.length})
              </h4>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedMember.tasks.length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center border border-dashed rounded-lg">
                    현재 할당된 과제 및 일정이 없습니다.
                  </p>
                ) : (
                  selectedMember.tasks.map((task, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex justify-between items-center text-xs"
                    >
                      <div className="space-y-1 max-w-[70%]">
                        <p className="font-semibold text-gray-800 leading-snug">{task.title}</p>
                        <p className="text-[10px] text-gray-400">📅 마감일: {task.dueDate}</p>
                      </div>
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${
                          task.status === '완료'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : task.status === '진행 중'
                            ? 'bg-blue-50 text-blue-600 border-blue-200'
                            : 'bg-amber-50 text-amber-600 border-amber-200'
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedMember(null)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-medium px-4 py-2 rounded-lg transition cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 팀원 추가 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleAddMember}
            className="bg-white border border-gray-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl relative"
          >
            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
              ➕ 새 팀원 추가
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">팀원 이름</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="예: 홍길동"
                  className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">역할 / 파트</label>
                <input
                  type="text"
                  required
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="예: AI 모델링 / 프론트엔드"
                  className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">이메일 주소</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs rounded-lg transition cursor-pointer font-medium"
              >
                추가 완료
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}