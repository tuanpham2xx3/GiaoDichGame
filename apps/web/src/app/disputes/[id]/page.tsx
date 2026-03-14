'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { disputesApi, Dispute } from '../../lib/api';

export default function DisputeDetailPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const disputeId = Number(params.id);

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user && disputeId) {
      loadDispute();
      // Poll for new messages every 5 seconds
      const interval = setInterval(loadDispute, 5000);
      return () => clearInterval(interval);
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

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await disputesApi.sendMessage(disputeId, { message });
      setMessage('');
      await loadDispute();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await disputesApi.uploadEvidence(disputeId, file);
      await loadDispute();
    } catch (error) {
      console.error('Failed to upload evidence:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!confirm('Bạn có chắc muốn rút tranh chấp này?')) return;

    try {
      await disputesApi.withdrawDispute(disputeId);
      router.push('/orders');
    } catch (error) {
      console.error('Failed to withdraw:', error);
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
          <h1 className="text-2xl font-bold text-white">Chi tiết tranh chấp</h1>
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

          {/* Withdraw Button - Only for Buyer and when not resolved */}
          {dispute.isBuyer && dispute.status !== 'RESOLVED' && dispute.status !== 'WITHDRAWN' && (
            <button
              onClick={handleWithdraw}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Rút tranh chấp
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="bg-[#1e2330] rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Tin nhắn</h2>
          <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
            {dispute.messages && dispute.messages.length > 0 ? (
              dispute.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg ${
                    msg.senderId === user?.id
                      ? 'bg-purple-600/20 ml-8'
                      : msg.senderId === dispute.sellerId
                      ? 'bg-blue-600/20 mr-8'
                      : 'bg-red-600/20 mr-8'
                  }`}
                >
                  <p className="text-white text-sm">{msg.message}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(msg.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center">Chưa có tin nhắn</p>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Send Message Form - Only if not resolved */}
          {dispute.status !== 'RESOLVED' && dispute.status !== 'WITHDRAWN' && (
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Nhập tin nhắn..."
                className="flex-1 px-4 py-2 bg-[#0f1117] border border-[#2a3142] rounded-lg text-white"
                disabled={sending}
              />
              <button
                onClick={handleSendMessage}
                disabled={sending || !message.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {sending ? '...' : 'Gửi'}
              </button>
            </div>
          )}
        </div>

        {/* Upload Evidence */}
        {dispute.status !== 'RESOLVED' && dispute.status !== 'WITHDRAWN' && (
          <div className="bg-[#1e2330] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Bằng chứng</h2>
            <input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={handleUploadEvidence}
              className="text-white"
              disabled={uploading}
            />
            <p className="text-gray-500 text-xs mt-2">Cho phép: jpg, png, pdf. Tối đa 5MB</p>
          </div>
        )}
      </div>
    </div>
  );
}
