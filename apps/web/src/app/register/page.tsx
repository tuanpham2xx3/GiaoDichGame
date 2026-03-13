'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { AxiosError } from 'axios';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', username: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/v1/auth/register', form);
      router.push('/login?registered=1');
    } catch (err) {
      const ax = err as AxiosError<{ message: string | string[] }>;
      const msg = ax.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Đăng ký thất bại'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6
      bg-[radial-gradient(ellipse_at_30%_20%,rgba(99,102,241,.15)_0%,transparent_60%),radial-gradient(ellipse_at_70%_80%,rgba(34,211,238,.1)_0%,transparent_60%),#0f1117]">
      <div className="w-full max-w-md bg-[#1e2330] border border-white/[0.08] rounded-2xl p-10 shadow-2xl animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 font-bold text-xl mb-4">
            <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              GiaoDichGame
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">Tạo tài khoản</h1>
          <p className="text-white/50 text-sm mt-1">Tham gia sàn giao dịch game uy tín</p>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/60 mb-1.5">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              className="w-full px-4 py-3 bg-[#181c27] border border-white/[0.08] rounded-xl text-white placeholder-white/20 text-sm
                focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/60 mb-1.5">Tên hiển thị</label>
            <input
              type="text"
              placeholder="GamerXYZ"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              minLength={3}
              required
              className="w-full px-4 py-3 bg-[#181c27] border border-white/[0.08] rounded-xl text-white placeholder-white/20 text-sm
                focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/60 mb-1.5">Mật khẩu</label>
            <input
              type="password"
              placeholder="Ít nhất 8 ký tự"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              minLength={8}
              required
              className="w-full px-4 py-3 bg-[#181c27] border border-white/[0.08] rounded-xl text-white placeholder-white/20 text-sm
                focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed
              text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:-translate-y-0.5"
          >
            {loading ? 'Đang xử lý...' : 'Đăng ký'}
          </button>
        </form>

        <p className="text-center text-sm text-white/40 mt-6">
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-indigo-400 font-medium hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
