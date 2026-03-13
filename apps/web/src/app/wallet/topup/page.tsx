'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api';
import { AxiosError } from 'axios';

type Tab = 'bank' | 'gateway';

const inputClass = `w-full px-4 py-3 bg-[#0f1117] border border-white/[0.08] rounded-xl text-white placeholder-white/20 text-sm
  focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 transition-all`;

interface BankInfoResponse {
  id: number;
  amountCoin: number;
  reference: string;
  bankInfo: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    content: string;
  };
}

export default function TopupPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('bank');
  const [amount, setAmount] = useState('');
  const [gwMethod, setGwMethod] = useState<'MOMO' | 'VNPAY' | 'ZALOPAY'>('MOMO');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bankInfo, setBankInfo] = useState<BankInfoResponse | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [isLoading, user, router]);

  if (isLoading || !user) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-2 border-white/10 border-t-indigo-500 rounded-full animate-spin" />
    </div>
  );

  const handleBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post<BankInfoResponse>('/v1/wallet/topup/bank', { amountCoin: Number(amount) });
      setBankInfo(data);
    } catch (err) {
      const ax = err as AxiosError<{ message: string }>;
      setError(ax.response?.data?.message ?? 'Lỗi tạo yêu cầu');
    } finally { setLoading(false); }
  };

  const handleGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post<{ redirectUrl: string }>('/v1/wallet/topup/gateway', { amountCoin: Number(amount), method: gwMethod });
      window.open(data.redirectUrl, '_blank');
    } catch (err) {
      const ax = err as AxiosError<{ message: string }>;
      setError(ax.response?.data?.message ?? 'Lỗi tạo yêu cầu');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Nạp Coin</h1>
        <p className="text-white/50 text-sm mt-1">Chọn phương thức nạp tiền phù hợp</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-[#181c27] rounded-xl mb-6">
        {([['bank', 'Chuyển khoản'], ['gateway', 'Ví điện tử']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === k ? 'bg-[#1e2330] text-white shadow' : 'text-white/40 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl">{error}</div>
      )}

      {tab === 'bank' && !bankInfo && (
        <form onSubmit={(e) => void handleBank(e)} className="bg-[#1e2330] border border-white/[0.08] rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/60 mb-1.5">Số Coin muốn nạp</label>
            <input type="number" min={10000} placeholder="VD: 100000" value={amount} onChange={(e) => setAmount(e.target.value)} required className={inputClass} />
            <p className="text-xs text-white/30 mt-1">Tối thiểu 10,000 Coin. 1 Coin = 1 VND</p>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all">
            {loading ? 'Đang tạo...' : 'Tạo lệnh nạp'}
          </button>
        </form>
      )}

      {tab === 'bank' && bankInfo && (
        <div className="bg-[#1e2330] border border-white/[0.08] rounded-2xl p-6 space-y-3">
          <h3 className="font-semibold text-white mb-4">Thông tin chuyển khoản</h3>
          {[
            ['Ngân hàng', bankInfo.bankInfo.bankName],
            ['Số tài khoản', bankInfo.bankInfo.accountNumber],
            ['Chủ tài khoản', bankInfo.bankInfo.accountHolder],
            ['Số tiền', `${bankInfo.amountCoin.toLocaleString()} VND`],
            ['Nội dung CK', bankInfo.bankInfo.content],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-center py-2 border-b border-white/[0.05]">
              <span className="text-sm text-white/50">{label}</span>
              <span className={`text-sm font-semibold ${label === 'Nội dung CK' ? 'text-yellow-400 font-mono' : 'text-cyan-400'}`}>{value}</span>
            </div>
          ))}
          <div className="pt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-300 text-sm">
            Nhập <strong>chính xác nội dung chuyển khoản</strong> để được xác nhận tự động.
          </div>
          <button onClick={() => { setBankInfo(null); setAmount(''); }} className="w-full py-2 bg-white/5 hover:bg-white/10 text-white/60 text-sm rounded-xl border border-white/[0.08] transition-all">
            Tạo lệnh khác
          </button>
        </div>
      )}

      {tab === 'gateway' && (
        <form onSubmit={(e) => void handleGateway(e)} className="bg-[#1e2330] border border-white/[0.08] rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/60 mb-1.5">Phương thức</label>
            <div className="grid grid-cols-3 gap-2">
              {(['MOMO', 'VNPAY', 'ZALOPAY'] as const).map((m) => (
                <button key={m} type="button" onClick={() => setGwMethod(m)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${gwMethod === m ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-[#0f1117] border-white/[0.08] text-white/50 hover:text-white'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/60 mb-1.5">Số Coin</label>
            <input type="number" min={10000} placeholder="VD: 50000" value={amount} onChange={(e) => setAmount(e.target.value)} required className={inputClass} />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all">
            {loading ? 'Đang chuyển hướng...' : `Thanh toán với ${gwMethod}`}
          </button>
        </form>
      )}
    </div>
  );
}
