'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { AxiosError } from 'axios';

const inputClass = `w-full px-4 py-3 bg-[#0f1117] border border-white/[0.08] rounded-xl text-white placeholder-white/20 text-sm
  focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 transition-all`;

export default function ProfilePage() {
  const { user, refresh, isLoading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ username: '', avatarUrl: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
    if (user) setForm({ username: user.username, avatarUrl: user.avatarUrl ?? '' });
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const payload: Record<string, string> = { username: form.username };
      if (form.avatarUrl.trim()) payload.avatarUrl = form.avatarUrl.trim();
      await api.patch('/v1/users/me', payload);
      await refresh();
      setSuccess('Cập nhật hồ sơ thành công!');
    } catch (err) {
      const ax = err as AxiosError<{ message: string | string[] }>;
      const msg = ax.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Cập nhật thất bại'));
    } finally { setLoading(false); }
  };

  if (isLoading || !user) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-2 border-white/10 border-t-indigo-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Hồ sơ cá nhân</h1>
        <p className="text-white/50 text-sm mt-1">Cập nhật thông tin hiển thị của bạn</p>
      </div>

      {/* Avatar card */}
      <div className="flex items-center gap-4 mb-8 p-5 bg-[#1e2330] border border-white/[0.08] rounded-2xl">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white shrink-0">
          {user.username[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-white text-lg">{user.username}</p>
          <p className="text-white/40 text-sm">{user.email}</p>
          <div className="flex gap-1 flex-wrap mt-1">
            {user.permissions.slice(0, 3).map((p) => (
              <span key={p} className="px-2 py-0.5 bg-indigo-500/15 text-indigo-300 text-xs rounded-full">{p}</span>
            ))}
            {user.permissions.length > 3 && (
              <span className="px-2 py-0.5 bg-white/5 text-white/40 text-xs rounded-full">+{user.permissions.length - 3}</span>
            )}
          </div>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl">{error}</div>}
      {success && <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm rounded-xl">{success}</div>}

      <form onSubmit={(e) => void handleSubmit(e)} className="bg-[#1e2330] border border-white/[0.08] rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/60 mb-1.5">Tên hiển thị</label>
          <input type="text" value={form.username} placeholder="Username"
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            minLength={3} maxLength={50} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/60 mb-1.5">URL Avatar (tuỳ chọn)</label>
          <input type="url" value={form.avatarUrl} placeholder="https://..."
            onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
            className={inputClass} />
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all">
          {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </form>
    </div>
  );
}
