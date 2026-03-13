'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { ordersApi, Order, listingsApi } from '../../lib/api';

export default function OrderDetailPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const orderId = Number(params.id);

  const [order, setOrder] = useState<Order | null>(null);
  const [listing, setListing] = useState<any>(null);
  const [gameInfo, setGameInfo] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Delivery form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [extraInfo, setExtraInfo] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user && orderId) {
      loadOrder();
    }
  }, [user, orderId]);

  const loadOrder = async () => {
    try {
      const orderData = await ordersApi.getOrder(orderId);
      setOrder(orderData);

      // Load listing info
      if (orderData.listingId) {
        const listingData = await listingsApi.getById(orderData.listingId);
        setListing(listingData);
      }
    } catch (error) {
      console.error('Failed to load order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeliver = async () => {
    setSubmitting(true);
    try {
      await ordersApi.deliverOrder(orderId, {
        username,
        password,
        extra_info: extraInfo ? { note: extraInfo } : undefined,
      });
      await loadOrder();
    } catch (error) {
      console.error('Failed to deliver:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReceipt = async () => {
    setSubmitting(true);
    try {
      await ordersApi.confirmReceipt(orderId);
      await loadOrder();
    } catch (error) {
      console.error('Failed to confirm:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewGameInfo = async () => {
    try {
      const data = await ordersApi.getGameInfo(orderId);
      setGameInfo(data.gameInfo);
    } catch (error) {
      console.error('Failed to load game info:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string }> = {
      PENDING: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
      LOCKED: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
      DELIVERED: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
      COMPLETED: { bg: 'bg-green-500/20', text: 'text-green-400' },
      DISPUTED: { bg: 'bg-red-500/20', text: 'text-red-400' },
      CANCELLED: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
    };
    const style = statusMap[status] || { bg: 'bg-gray-500/20', text: 'text-gray-400' };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
        {status}
      </span>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <p className="text-gray-400">Không tìm thấy đơn hàng</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] py-8">
      <div className="max-w-3xl mx-auto px-4">
        <button
          onClick={() => router.push('/orders')}
          className="text-gray-400 hover:text-white mb-4 flex items-center gap-2"
        >
          ← Quay lại
        </button>

        <h1 className="text-2xl font-bold text-white mb-6">Chi tiết đơn hàng #{order.id}</h1>

        {/* Order Info */}
        <div className="bg-[#1e2330] rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-400 text-sm">Trạng thái</p>
              {getStatusBadge(order.status)}
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">Giá trị</p>
              <p className="text-2xl font-bold text-green-400">
                {parseFloat(order.amount).toLocaleString()} Coin
              </p>
            </div>
          </div>

          {listing && (
            <div className="border-t border-[#2a3142] pt-4 mt-4">
              <p className="text-gray-400 text-sm">Sản phẩm</p>
              <p className="text-white font-medium">{listing.title}</p>
              {listing.game && <p className="text-gray-400 text-sm">{listing.game.name}</p>}
            </div>
          )}

          {/* Countdown */}
          {order.status === 'DELIVERED' && order.autoCompleteAt && (
            <div className="border-t border-[#2a3142] pt-4 mt-4">
              <p className="text-gray-400 text-sm">Tự động hoàn tất sau</p>
              <p className="text-white">
                {new Date(order.autoCompleteAt).toLocaleString('vi-VN')}
              </p>
            </div>
          )}
        </div>

        {/* Timeline */}
        {order.timeline && order.timeline.length > 0 && (
          <div className="bg-[#1e2330] rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Lịch sử</h2>
            <div className="space-y-4">
              {order.timeline.map((item, index) => (
                <div key={index} className="flex gap-4">
                  <div className="w-2 h-2 mt-2 rounded-full bg-green-500 flex-shrink-0"></div>
                  <div>
                    <p className="text-white font-medium">{item.status}</p>
                    {item.note && <p className="text-gray-400 text-sm">{item.note}</p>}
                    <p className="text-gray-500 text-xs">{new Date(item.createdAt).toLocaleString('vi-VN')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Seller: Delivery Form */}
        {order.canDeliver && (
          <div className="bg-[#1e2330] rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Giao thông tin tài khoản</h2>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-2">Tên đăng nhập</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 bg-[#0f1117] border border-[#2a3142] rounded-lg text-white"
                  placeholder="Nhập username"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-2">Mật khẩu</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-[#0f1117] border border-[#2a3142] rounded-lg text-white"
                  placeholder="Nhập mật khẩu"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-2">Thông tin thêm (optional)</label>
                <textarea
                  value={extraInfo}
                  onChange={(e) => setExtraInfo(e.target.value)}
                  className="w-full px-4 py-2 bg-[#0f1117] border border-[#2a3142] rounded-lg text-white"
                  placeholder="Email, số điện thoại,..."
                  rows={3}
                />
              </div>
              <button
                onClick={handleDeliver}
                disabled={submitting || !username || !password}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Đang giao...' : 'Giao hàng'}
              </button>
            </div>
          </div>
        )}

        {/* Buyer: View Game Info */}
        {order.status === 'DELIVERED' && order.isBuyer && (
          <div className="bg-[#1e2330] rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Thông tin tài khoản game</h2>

            {!gameInfo ? (
              <button
                onClick={handleViewGameInfo}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Xem thông tin
              </button>
            ) : (
              <div className="space-y-2">
                {Object.entries(gameInfo).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-400">{key}:</span>
                    <span className="text-white font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Buyer: Confirm Receipt */}
        {order.canConfirm && (
          <button
            onClick={handleConfirmReceipt}
            disabled={submitting}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Đang xác nhận...' : 'Xác nhận đã nhận hàng'}
          </button>
        )}
      </div>
    </div>
  );
}
