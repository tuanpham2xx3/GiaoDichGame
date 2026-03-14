'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ordersApi, Order } from '@/lib/api';

export default function OrdersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    try {
      const data = await ordersApi.getOrders();
      setOrders(data.items);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => activeTab === 'buy' ? order.isBuyer : !order.isBuyer);

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
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
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

  return (
    <div className="min-h-screen bg-[#0f1117] py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-white mb-6">Quản lý đơn hàng</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-[#2a3142]">
          <button
            onClick={() => setActiveTab('buy')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'buy'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Đơn mua
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'sell'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Đơn bán
          </button>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-[#1e2330] rounded-lg p-8 text-center">
            <p className="text-gray-400">Chưa có đơn hàng nào</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map(order => (
              <div
                key={order.id}
                className="bg-[#1e2330] rounded-lg p-4 hover:bg-[#252a3d] transition-colors cursor-pointer"
                onClick={() => router.push(`/orders/${order.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">
                      Đơn hàng #{order.id}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {activeTab === 'buy' ? 'Người bán' : 'Người mua'}: {order.isBuyer ? order.sellerId : order.buyerId}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-semibold">
                      {parseFloat(order.amount).toLocaleString()} Coin
                    </p>
                    {getStatusBadge(order.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
