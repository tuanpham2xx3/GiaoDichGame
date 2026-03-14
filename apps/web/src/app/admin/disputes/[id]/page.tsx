'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { disputesApi, Dispute } from '../../../lib/api';

export default function AdminDisputeDetailPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const disputeId = Number(params.id);

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [judging, setJudging] = useState(false);
  const [decision, setDecision] = useState<'REFUND' | 'RELEASE' | ''>('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user && disputeId) {
      loadDispute();
    }
  }, [user, disputeId]);

  const loadDispute = async () => {
    try {
      const data = await disputesApi.getDispute(disputeId);
      setDispute(data);
    } catch (error) {
      console.error('Failed to load dispute:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJudge = async () => {
    if (!decision) return;
    setJudging(true);
    try {
      await disputesApi.judgeDispute(disputeId, {
        decision: decision as 'REFUND' | 'RELEASE',
        note: note || undefined,
      });
      await loadDispute();
    } catch (error) {
      console.error('Failed to judge:', error);
    } finally {
      setJudging(false);
    }
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
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {status}
      </span>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-white">Dispute not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/disputes/list')}
              className="text-gray-400 hover:text-white"
            >
              ← Quay lại
            </button>
            <h1 className="text-2xl font-bold text-white">Chi tiết tranh chấp #{dispute.id}</h1>
          </div>
          {getStatusBadge(dispute.status)}
        </div>

        {/* Dispute Info */}
        <div className="bg-[#1e2330] rounded-lg p-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Mã tranh chấp</p>
              <p className="text-white font-medium">#{dispute.id}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Mã đơn hàng</p>
              <p className="text-white font-medium">#{dispute.orderId}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Lý do</p>
              <p className="text-white font-medium">{getReasonLabel(dispute.reason)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Người mua</p>
              <p className="text-white font-medium">#{dispute.buyerId}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Người bán</p>
              <p className="text-white font-medium">#{dispute.sellerId}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Hạn phản hồi</p>
              <p className="text-white font-medium">
                {dispute.sellerDeadline ? new Date(dispute.sellerDeadline).toLocaleString('vi-VN') : 'N/A'}
              </p>
            </div>
            {dispute.order && (
              <>
                <div>
                  <p className="text-gray-400 text-sm">Sản phẩm</p>
                  <p className="text-white font-medium">{dispute.order.listingTitle}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Giá trị</p>
                  <p className="text-white font-medium">{dispute.order.amount} Coin</p>
                </div>
              </>
            )}
            {dispute.resolution && (
              <div className="col-span-2">
                <p className="text-gray-400 text-sm">Quyết định</p>
                <p className="text-white font-medium">
                  {dispute.resolution === 'REFUND' ? 'Hoàn tiền cho người mua' : 'Giải ngân cho người bán'}
                </p>
                {dispute.resolutionNote && (
                  <p className="text-gray-400 text-sm mt-1">{dispute.resolutionNote}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="bg-[#1e2330] rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Tin nhắn</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {dispute.messages && dispute.messages.length > 0 ? (
              dispute.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg ${
                    msg.senderId === dispute.buyerId
                      ? 'bg-purple-600/20 ml-8'
                      : msg.senderId === dispute.sellerId
                      ? 'bg-blue-600/20 mr-8'
                      : 'bg-red-600/20 mr-8'
                  }`}
                >
                  <p className="text-white text-sm">{msg.message}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {msg.senderId === dispute.buyerId
                      ? 'Người mua'
                      : msg.senderId === dispute.sellerId
                      ? 'Người bán'
                      : 'Admin'}{' '}
                    - {new Date(msg.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center">Chưa có tin nhắn</p>
            )}
          </div>
        </div>

        {/* Judge Form - Only if not resolved */}
        {dispute.status !== 'RESOLVED' && dispute.status !== 'WITHDRAWN' && (
          <div className="bg-[#1e2330] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Phán quyết</h2>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-2">Quyết định</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-white">
                    <input
                      type="radio"
                      name="decision"
                      value="REFUND"
                      checked={decision === 'REFUND'}
                      onChange={(e) => setDecision(e.target.value as 'REFUND')}
                    />
                    Hoàn tiền cho người mua
                  </label>
                  <label className="flex items-center gap-2 text-white">
                    <input
                      type="radio"
                      name="decision"
                      value="RELEASE"
                      checked={decision === 'RELEASE'}
                      onChange={(e) => setDecision(e.target.value as 'RELEASE')}
                    />
                    Giải ngân cho người bán
                  </label>
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-2">Ghi chú (optional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-4 py-2 bg-[#0f1117] border border-[#2a3142] rounded-lg text-white"
                  rows={3}
                  placeholder="Nhập ghi chú..."
                />
              </div>
              <button
                onClick={handleJudge}
                disabled={judging || !decision}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {judging ? 'Đang xử lý...' : 'Phán quyết'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
