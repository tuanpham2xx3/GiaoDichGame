'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api';
import { AxiosError } from 'axios';

const inputClass = `w-full px-4 py-3 bg-[#0f1117] border border-white/[0.08] rounded-xl text-white placeholder-white/20 text-sm
  focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 transition-all`;

export default function WithdrawPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ amountCoin: '', bankName: '', bankAccount: '', bankHolder: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!user) { router.push('/login'); return null; }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const { data } = await api.post<{ status: string; amountCoin: number }>('/v1/wallet/withdraw', {
        amountCoin: Number(form.amountCoin),
        bankName: form.bankName,
        bankAccount: form.bankAccount,
        bankHolder: form.bankHolder,
      });
      setSuccess(`Rút ${data.amountCoin.toLocaleString()} Coin thành công!`);
      setForm({ amountCoin: '', bankName: '', bankAccount: '', bankHolder: '' });
    } catch (err) {
      const ax = err as AxiosError<{ message: string }>;
      setError(ax.response?.data?.message ?? 'Lỗi rút Coin');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Rút Coin</h1>
        <p className="text-white/50 text-sm mt-1">Chuyển Coin về tài khoản ngân hàng của bạn</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl">{error}</div>}
      {success && <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm rounded-xl">{success}</div>}

      <form onSubmit={(e) => void handleSubmit(e)} className="bg-[#1e2330] border border-white/[0.08] rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/60 mb-1.5">Số Coin muốn rút</label>
          <input type="number" min={10000} placeholder="VD: 50000" value={form.amountCoin}
            onChange={(e) => setForm((f) => ({ ...f, amountCoin: e.target.value }))} required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/60 mb-1.5">Ngân hàng</label>
          <input type="text" placeholder="VD: Vietcombank" value={form.bankName}
            onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/60 mb-1.5">Số tài khoản</label>
          <input type="text" placeholder="VD: 1234567890" value={form.bankAccount}
            onChange={(e) => setForm((f) => ({ ...f, bankAccount: e.target.value }))} required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/60 mb-1.5">Chủ tài khoản</label>
          <input type="text" placeholder="VD: NGUYEN VAN A" value={form.bankHolder}
            onChange={(e) => setForm((f) => ({ ...f, bankHolder: e.target.value }))} required className={inputClass} />
        </div>
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-300 text-xs">
          Coin sẽ được chuyển trong vòng 5–15 phút sau khi xác nhận.
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all">
          {loading ? 'Đang xử lý...' : 'Xác nhận rút Coin'}
        </button>
      </form>

      <Link href="/wallet" className="block text-center text-sm text-white/40 hover:text-white/60 mt-4 transition-colors">
        Quay lại ví
      </Link>
    </div>
  );
}
