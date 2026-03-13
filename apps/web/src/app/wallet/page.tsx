'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';

interface WalletBalance { available: number; insurance: number; }
interface Transaction {
  id: number;
  amount: string;
  type: string;
  status: string;
  referenceType: string | null;
  note: string | null;
  createdAt: string;
}

const TYPE_LABEL: Record<string, string> = {
  TOPUP: 'Nạp Coin',
  WITHDRAW: 'Rút Coin',
  HOLD: 'Giữ cọc',
  RELEASE: 'Hoàn tiền',
  SETTLE: 'Nhận tiền',
  INSURANCE_LOCK: 'Nạp quỹ BH',
  INSURANCE_UNLOCK: 'Rút quỹ BH',
  VIP_PURCHASE: 'Mua VIP',
  PIN_PURCHASE: 'Mua Pin',
};

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'SUCCESS' ? 'bg-emerald-500/15 text-emerald-400' :
    status === 'PENDING'  ? 'bg-yellow-500/15 text-yellow-400'  :
                            'bg-red-500/15 text-red-400';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{status}</span>;
}

export default function WalletPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get<WalletBalance>('/v1/wallet/balance'),
      api.get<Transaction[]>('/v1/users/me/transactions'),
    ])
      .then(([b, t]) => { setBalance(b.data); setTxs(t.data); })
      .finally(() => setLoadingData(false));
  }, [user]);

  if (isLoading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-white/10 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Ví Coin</h1>
        <p className="text-white/50 text-sm mt-1">Quản lý số dư và giao dịch của bạn</p>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-indigo-600/20 to-cyan-600/10 border border-indigo-500/20 rounded-2xl p-6">
          <p className="text-xs uppercase tracking-widest text-white/50 font-semibold mb-2">Số dư khả dụng</p>
          <p className="text-3xl font-extrabold text-yellow-400">
            {balance ? balance.available.toLocaleString() : '—'}
          </p>
          <p className="text-sm text-white/40 mt-1">Coin</p>
        </div>
        <div className="bg-[#1e2330] border border-white/[0.08] rounded-2xl p-6">
          <p className="text-xs uppercase tracking-widest text-white/50 font-semibold mb-2">Quỹ bảo hiểm</p>
          <p className="text-3xl font-extrabold text-cyan-400">
            {balance ? balance.insurance.toLocaleString() : '—'}
          </p>
          <p className="text-sm text-white/40 mt-1">Coin</p>
        </div>
        <div className="bg-[#1e2330] border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-3">
          <p className="text-xs uppercase tracking-widest text-white/50 font-semibold">Thao tác nhanh</p>
          <Link href="/wallet/topup" className="w-full text-center py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all">
            Nạp Coin
          </Link>
          <Link href="/wallet/withdraw" className="w-full text-center py-2 bg-white/5 hover:bg-white/10 text-white/70 text-sm font-semibold rounded-xl transition-all border border-white/[0.08]">
            Rút Coin
          </Link>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-[#1e2330] border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.08]">
          <h2 className="font-semibold text-white">Lịch sử giao dịch</h2>
        </div>
        {txs.length === 0 ? (
          <div className="py-16 text-center text-white/30 text-sm">Chưa có giao dịch nào</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Loại', 'Số Coin', 'Trạng thái', 'Ghi chú', 'Thời gian'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txs.map((tx) => {
                  const amt = parseFloat(tx.amount);
                  return (
                    <tr key={tx.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-3 text-white/80">{TYPE_LABEL[tx.type] ?? tx.type}</td>
                      <td className={`px-6 py-3 font-semibold ${amt >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {amt >= 0 ? '+' : ''}{amt.toLocaleString()}
                      </td>
                      <td className="px-6 py-3"><StatusBadge status={tx.status} /></td>
                      <td className="px-6 py-3 text-white/40 max-w-xs truncate">{tx.note ?? '—'}</td>
                      <td className="px-6 py-3 text-white/40">{new Date(tx.createdAt).toLocaleString('vi-VN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
