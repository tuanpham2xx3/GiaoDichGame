'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { disputesApi, Dispute } from '../../lib/api';

export default function DisputesListPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      loadDisputes();
    }
  }, [user, statusFilter]);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const data = await disputesApi.getDisputes(statusFilter || undefined);
      setDisputes(data);
    } catch (error) {
      console.error('Failed to load disputes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string }> = {
      OPEN: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
      PENDING: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
      UNDER_REVIEW: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
      RESOLVED: { bg: 'bg-green-500/20', text: 'text-green-400' },
      WITHDRAWN: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
    };
    const style = statusMap[status] || { bg: 'bg-gray-500/20', text: 'text-gray-400' };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${style.bg} ${style.text}`}>
        {status}
      </span>
    );
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      account_not_received: 'Chưa nhận được tài khoản',
      account_invalid: 'Tài khoản không hợp lệ',
      account_not_as_described: 'Tài khoản không đúng như mô tả',
      other: 'Lý do khác',
    };
    return labels[reason] || reason;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-white mb-6">Danh sách tranh chấp</h1>

        {/* Filter */}
        <div className="mb-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-[#1e2330] border border-[#2a3142] rounded-lg text-white"
          >
            <option value="">Tất cả</option>
            <option value="OPEN">Mở</option>
            <option value="UNDER_REVIEW">Đang xem xét</option>
            <option value="RESOLVED">Đã giải quyết</option>
            <option value="WITHDRAWN">Đã rút</option>
          </select>
        </div>

        {/* Disputes List */}
        {disputes.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p>Chưa có tranh chấp nào</p>
          </div>
        ) : (
          <div className="space-y-4">
            {disputes.map((dispute) => (
              <div
                key={dispute.id}
                className="bg-[#1e2330] rounded-lg p-4 cursor-pointer hover:bg-[#252a3a] transition-colors"
                onClick={() => router.push(`/disputes/${dispute.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">
                      #{dispute.id} - {getReasonLabel(dispute.reason)}
                    </p>
                    <p className="text-gray-400 text-sm">Đơn hàng: #{dispute.orderId}</p>
                    <p className="text-gray-500 text-xs">
                      {new Date(dispute.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  {getStatusBadge(dispute.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
