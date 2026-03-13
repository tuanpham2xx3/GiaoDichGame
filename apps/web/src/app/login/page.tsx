'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { AxiosError } from 'axios';

const inputClass = `w-full px-4 py-3 bg-[#181c27] border border-white/[0.08] rounded-xl text-white placeholder-white/20 text-sm
  focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 transition-all`;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login, user } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.replace('/wallet');
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      router.push('/wallet');
    } catch (err) {
      const ax = err as AxiosError<{ message: string }>;
      setError(ax.response?.data?.message ?? 'Email hoặc mật khẩu không đúng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {params?.get('registered') && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm rounded-xl">
          Đăng ký thành công! Hãy đăng nhập.
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl">
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
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/60 mb-1.5">Mật khẩu</label>
          <input
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed
            text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:-translate-y-0.5"
        >
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>

      <p className="text-center text-sm text-white/40 mt-6">
        Chưa có tài khoản?{' '}
        <Link href="/register" className="text-indigo-400 font-medium hover:underline">
          Đăng ký ngay
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6
      bg-[radial-gradient(ellipse_at_30%_20%,rgba(99,102,241,.15)_0%,transparent_60%),radial-gradient(ellipse_at_70%_80%,rgba(34,211,238,.1)_0%,transparent_60%),#0f1117]">
      <div className="w-full max-w-md bg-[#1e2330] border border-white/[0.08] rounded-2xl p-10 shadow-2xl animate-slide-up">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 font-bold text-xl mb-4">
            <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              GiaoDichGame
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">Đăng nhập</h1>
          <p className="text-white/50 text-sm mt-1">Chào mừng bạn quay lại!</p>
        </div>

        <Suspense fallback={<div className="h-4" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
