'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { disputesApi, ordersApi } from '../../lib/api';

export default function CreateDisputePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get('orderId');

  const [orderId, setOrderId] = useState(orderIdParam || '');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const orderData = await ordersApi.getOrder(Number(orderId));
      setOrder(orderData);
    } catch (err) {
      console.error('Failed to load order:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await disputesApi.createDispute({
        orderId,
        reason: reason as any,
        description,
      });
      router.push(`/disputes/${result.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create dispute');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-white mb-6">Mở tranh chấp</h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order ID */}
          <div>
            <label className="text-gray-400 text-sm block mb-2">Mã đơn hàng</label>
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="w-full px-4 py-2 bg-[#1e2330] border border-[#2a3142] rounded-lg text-white"
              placeholder="Nhập mã đơn hàng"
              required
            />
          </div>

          {/* Order Info */}
          {order && (
            <div className="bg-[#1e2330] rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Thông tin đơn hàng</h3>
              <p className="text-gray-400 text-sm">Mã đơn: #{order.id}</p>
              <p className="text-gray-400 text-sm">Giá trị: {order.amount} Coin</p>
              <p className="text-gray-400 text-sm">Trạng thái: {order.status}</p>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="text-gray-400 text-sm block mb-2">Lý do tranh chấp</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2 bg-[#1e2330] border border-[#2a3142] rounded-lg text-white"
              required
            >
              <option value="">Chọn lý do</option>
              <option value="account_not_received">Chưa nhận được tài khoản</option>
              <option value="account_invalid">Tài khoản không hợp lệ</option>
              <option value="account_not_as_described">Tài khoản không đúng như mô tả</option>
              <option value="other">Lý do khác</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-gray-400 text-sm block mb-2">
              Mô tả chi tiết (tối thiểu 20 ký tự)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 bg-[#1e2330] border border-[#2a3142] rounded-lg text-white"
              placeholder="Mô tả chi tiết vấn đề của bạn..."
              rows={5}
              minLength={20}
              required
            />
            <p className="text-gray-500 text-xs mt-1">{description.length} / 2000 ký tự</p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !orderId || !reason || description.length < 20}
            className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </button>
        </form>
      </div>
    </div>
  );
}
