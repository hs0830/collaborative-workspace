'use client';

import { useState } from 'react';
import { useCurrentUser, type Member } from '../../lib/auth';
import { emitAction, useSynced } from '../../lib/socket';
import { doneColumnId, useKanban } from '../../lib/useKanban';
import { daysUntil } from '../../lib/date';
import type { KanbanTask, TeamAction } from '../../lib/types';

const inputCls =
  'w-full border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 rounded-lg p-2.5 outline-none focus:border-blue-500';

export default function TeamPage() {
  const me = useCurrentUser();
  const members = useSynced<Member[]>('team', 'team:state');
  const { state: kanban } = useKanban();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const columns = kanban?.columns ?? [];
  const doneId = doneColumnId(columns);
  const firstId = columns[0]?.id;
  const tasksOf = (m: Member) => (kanban?.tasks ?? []).filter((t) => t.assignee === m.name);
  const statusLabel = (t: KanbanTask) => columns.find((c) => c.id === t.statusId)?.label ?? '';

  const selected = members?.find((m) => m.id === selectedId) ?? null;

  const run = async (action: TeamAction) => {
    const res = await emitAction('team:action', action);
    if (!res.ok) alert(res.error || '처리하지 못했습니다.');
    return res.ok;
  };

  return (
    <div className="space-y-6">
      <header className="border-b border-gray-200 dark:border-slate-800 pb-4 flex flex-wrap gap-3 justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">👥 프로젝트 팀원 관리</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            팀원 카드를 클릭하면 역할과 담당 업무를 볼 수 있어요. 담당 업무는 칸반 카드의 담당자 이름으로 자동 연결됩니다.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-gray-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition cursor-pointer shadow-xs"
        >
          + 팀원 추가하기
        </button>
      </header>

      {!members ? (
        <p className="text-xs text-gray-400">불러오는 중...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {members.map((member) => {
            const tasks = tasksOf(member);
            const inProgress = tasks.filter((t) => t.statusId !== doneId && t.statusId !== firstId).length;
            const todo = tasks.filter((t) => t.statusId === firstId && firstId !== doneId).length;
            const done = tasks.filter((t) => t.statusId === doneId).length;

            return (
              <button
                key={member.id}
                onClick={() => setSelectedId(member.id)}
                className="text-left bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 hover:border-blue-500 hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3 w-full">
                  <div className="flex items-center gap-3">
                    <Avatar member={member} size="md" />
                    <div className="overflow-hidden">
                      <h2 className="font-bold text-sm text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition truncate">
                        {member.name} {member.id === me?.id && <span className="text-[10px] text-blue-500">(나)</span>}
                      </h2>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{member.role || '역할 미지정'}</p>
                    </div>
                  </div>
                  <div className="text-[11px] text-gray-400 border-t border-gray-100 dark:border-slate-800 pt-2 truncate">
                    ✉️ {member.email || '이메일 미등록'}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  <Badge color="amber">대기 {todo}</Badge>
                  <Badge color="blue">진행 {inProgress}</Badge>
                  <Badge color="emerald">완료 {done}</Badge>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <MemberModal
          member={selected}
          isMe={selected.id === me?.id}
          tasks={tasksOf(selected)}
          statusLabel={statusLabel}
          doneId={doneId}
          onClose={() => setSelectedId(null)}
          onSave={(patch) => run({ type: 'member:update', payload: { id: selected.id, ...patch } })}
          onDelete={async () => {
            if (!confirm(`'${selected.name}' 팀원을 삭제할까요?\n칸반 카드의 담당자 이름은 그대로 남습니다.`)) return;
            if (await run({ type: 'member:delete', payload: { id: selected.id } })) setSelectedId(null);
          }}
        />
      )}

      {isAddModalOpen && (
        <AddMemberModal
          onClose={() => setIsAddModalOpen(false)}
          onAdd={async (data) => {
            if (await run({ type: 'member:add', payload: data })) setIsAddModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function Avatar({ member, size }: { member: Member; size: 'md' | 'lg' }) {
  return (
    <div
      className={`rounded-full text-white font-bold flex items-center justify-center shrink-0 ${
        size === 'lg' ? 'w-14 h-14 text-lg' : 'w-11 h-11 text-sm'
      }`}
      style={{ backgroundColor: member.color }}
    >
      {member.name.substring(0, 2)}
    </div>
  );
}

const BADGE = {
  amber: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  blue: 'bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
};
const Badge = ({ color, children }: { color: keyof typeof BADGE; children: React.ReactNode }) => (
  <span className={`px-2 py-1 rounded-md border font-medium ${BADGE[color]}`}>{children}</span>
);

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-lg cursor-pointer px-2" aria-label="닫기">
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}

function MemberModal({
  member,
  isMe,
  tasks,
  statusLabel,
  doneId,
  onClose,
  onSave,
  onDelete,
}: {
  member: Member;
  isMe: boolean;
  tasks: KanbanTask[];
  statusLabel: (t: KanbanTask) => string;
  doneId: string | undefined;
  onClose: () => void;
  onSave: (patch: { name: string; role: string; email: string }) => Promise<boolean>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(member.name);
  const [role, setRole] = useState(member.role);
  const [email, setEmail] = useState(member.email);

  const sorted = [...tasks].sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center gap-4 pb-4 border-b border-gray-100 dark:border-slate-800">
        <Avatar member={member} size="lg" />
        {editing ? (
          <form
            className="flex-1 space-y-2 text-xs pr-6"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await onSave({ name, role, email })) setEditing(false);
            }}
          >
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={20} placeholder="이름" className={inputCls} />
            <input value={role} onChange={(e) => setRole(e.target.value)} maxLength={60} placeholder="역할 / 파트" className={inputCls} />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" className={inputCls} />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 font-semibold cursor-pointer">
                저장
              </button>
              <button type="button" onClick={() => setEditing(false)} className="flex-1 bg-gray-100 dark:bg-slate-800 rounded-lg py-2 cursor-pointer">
                취소
              </button>
            </div>
            {isMe && <p className="text-[10px] text-gray-400">이름을 바꾸면 다음 로그인부터 새 이름으로 입장하세요.</p>}
          </form>
        ) : (
          <div className="min-w-0">
            <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">{member.name}</h3>
            <p className="text-xs font-semibold text-blue-600 mt-0.5">{member.role || '역할 미지정'}</p>
            <p className="text-[11px] text-gray-400 mt-1">📧 {member.email || '이메일 미등록'}</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">📌 담당 업무 ({tasks.length})</h4>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {sorted.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center border border-dashed dark:border-slate-700 rounded-lg">
              칸반에서 담당자를 &apos;{member.name}&apos;(으)로 지정하면 여기에 표시됩니다.
            </p>
          ) : (
            sorted.map((task) => {
              const d = task.dueDate ? daysUntil(task.dueDate) : null;
              const done = task.statusId === doneId;
              return (
                <div
                  key={task.id}
                  className="p-3 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl flex justify-between items-center gap-2 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <p className={`font-semibold leading-snug ${done ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-100'}`}>{task.title}</p>
                    <p className={`text-[10px] ${!done && d !== null && d < 0 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                      📅 {task.dueDate ? `마감 ${task.dueDate}${!done && d !== null && d < 0 ? ' (지남)' : ''}` : '마감일 없음'}
                    </p>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full font-bold border bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 shrink-0">
                    {statusLabel(task)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {!editing && (
        <div className="pt-2 flex justify-between gap-2">
          {!isMe ? (
            <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-600 cursor-pointer">
              팀원 삭제
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setName(member.name);
                setRole(member.role);
                setEmail(member.email);
                setEditing(true);
              }}
              className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-100 text-xs font-medium px-4 py-2 rounded-lg transition cursor-pointer"
            >
              정보 수정
            </button>
            <button onClick={onClose} className="bg-gray-900 dark:bg-blue-600 text-white text-xs font-medium px-4 py-2 rounded-lg cursor-pointer">
              닫기
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function AddMemberModal({ onClose, onAdd }: { onClose: () => void; onAdd: (d: { name: string; role: string; email: string }) => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');

  return (
    <Modal onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onAdd({ name, role, email });
        }}
        className="space-y-4"
      >
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">➕ 새 팀원 추가</h3>
          <p className="text-[11px] text-gray-400 mt-1">미리 등록해 두면, 그 팀원이 같은 이름으로 로그인할 때 이 프로필로 연결됩니다.</p>
        </div>

        <div className="space-y-3 text-xs">
          <label className="block space-y-1">
            <span className="font-semibold text-gray-700 dark:text-gray-300">팀원 이름</span>
            <input required maxLength={20} value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 홍길동" className={inputCls} />
          </label>
          <label className="block space-y-1">
            <span className="font-semibold text-gray-700 dark:text-gray-300">역할 / 파트</span>
            <input maxLength={60} value={role} onChange={(e) => setRole(e.target.value)} placeholder="예: AI 모델링 / 프론트엔드" className={inputCls} />
          </label>
          <label className="block space-y-1">
            <span className="font-semibold text-gray-700 dark:text-gray-300">이메일 주소</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" className={inputCls} />
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-gray-200 text-xs rounded-lg transition cursor-pointer">
            취소
          </button>
          <button type="submit" className="px-4 py-2 bg-gray-900 dark:bg-blue-600 hover:bg-black text-white text-xs rounded-lg transition cursor-pointer font-medium">
            추가 완료
          </button>
        </div>
      </form>
    </Modal>
  );
}
