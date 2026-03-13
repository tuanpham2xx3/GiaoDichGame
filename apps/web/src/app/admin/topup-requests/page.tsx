'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api';

interface TopupRequest {
  id: number; userId: number; amountCoin: string;
  method: string; gatewayRef: string | null; createdAt: string;
}

export default function AdminTopupPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<TopupRequest[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [confirming, setConfirming] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!user || !user.permissions.includes('topup:confirm')) {
        router.push('/');
      }
    }
  }, [isLoading, user, router]);

  const load = () => {
    setLoadingData(true);
    api.get<TopupRequest[]>('/v1/admin/topup-requests')
      .then((r) => setRequests(r.data))
      .finally(() => setLoadingData(false));
  };

  useEffect(() => { if (user) load(); }, [user]);

  const confirm = async (id: number) => {
    setConfirming(id);
    try {
      await api.patch(`/v1/admin/topup-requests/${id}/confirm`);
      load();
    } finally { setConfirming(null); }
  };

  if (isLoading || loadingData) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-2 border-white/10 border-t-indigo-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin – Duyệt Nạp Coin</h1>
          <p className="text-white/50 text-sm mt-1">{requests.length} yêu cầu đang chờ xử lý</p>
        </div>
        <button onClick={load} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 text-sm rounded-xl border border-white/[0.08] transition-all">
          Làm mới
        </button>
      </div>

      <div className="bg-[#1e2330] border border-white/[0.08] rounded-2xl overflow-hidden">
        {requests.length === 0 ? (
          <div className="py-20 text-center text-white/30">
            <p className="text-4xl mb-3">—</p>
            <p>Không có yêu cầu nào đang chờ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['ID', 'User ID', 'Số Coin', 'Phương thức', 'Mã tham chiếu', 'Thời gian', 'Thao tác'].map((h) => (
                    <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4 text-white/60">#{r.id}</td>
                    <td className="px-5 py-4 text-white/60">{r.userId}</td>
                    <td className="px-5 py-4 font-semibold text-yellow-400">{Number(r.amountCoin).toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 bg-indigo-500/15 text-indigo-300 text-xs rounded-full">{r.method}</span>
                    </td>
                    <td className="px-5 py-4 font-mono text-cyan-400 text-xs">{r.gatewayRef ?? '—'}</td>
                    <td className="px-5 py-4 text-white/40 text-xs">{new Date(r.createdAt).toLocaleString('vi-VN')}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => void confirm(r.id)}
                        disabled={confirming === r.id}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-all"
                      >
                        {confirming === r.id ? 'Đang xử lý...' : 'Xác nhận'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
