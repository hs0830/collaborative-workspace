'use client';

import { useState } from 'react';
import { login } from '../../lib/auth';

export default function LoginPage() {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const err = await login(code, name);
    setLoading(false);
    if (err) setError(err);
    // 성공하면 AppShell 이 자동으로 대시보드로 이동
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm p-7 space-y-5"
      >
        <div className="space-y-1">
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">🚀 팀 워크스페이스</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">팀장에게 받은 초대 코드와 이름을 입력하세요.</p>
        </div>

        <div className="space-y-3 text-xs">
          <label className="block space-y-1">
            <span className="font-semibold text-gray-700 dark:text-gray-300">초대 코드</span>
            <input
              type="password"
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 rounded-lg p-2.5 outline-none focus:border-blue-500"
            />
          </label>
          <label className="block space-y-1">
            <span className="font-semibold text-gray-700 dark:text-gray-300">이름</span>
            <input
              required
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 강현승"
              className="w-full border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 rounded-lg p-2.5 outline-none focus:border-blue-500"
            />
            <span className="block text-[11px] text-gray-400">처음이면 팀원으로 자동 등록되고, 같은 이름으로 다시 들어오면 내 계정으로 로그인됩니다.</span>
          </label>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-lg transition cursor-pointer disabled:opacity-60"
        >
          {loading ? '확인 중...' : '입장하기'}
        </button>
      </form>
    </div>
  );
}
