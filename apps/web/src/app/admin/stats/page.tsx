'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api';

interface Stats {
  totalUsers: number;
  totalOrders: number;
  totalDisputes: number;
  totalRevenue: number;
  totalListings: number;
  activeListings: number;
}

export default function AdminStatsPage() {
  const { user, isLoading, hasPermission } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user && hasPermission('stats:view')) {
      fetchStats();
    }
  }, [user, hasPermission]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: Stats }>('/v1/admin/stats');
      setStats(res.data.data || res.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-white/10 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasPermission('stats:view')) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-white mb-2">Không có quyền truy cập</h2>
        <p className="text-white/60">Bạn cần quyền xem thống kê để xem trang này</p>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Tổng người dùng',
      value: stats?.totalUsers ?? 0,
      icon: '👥',
      color: 'blue',
    },
    {
      label: 'Tổng đơn hàng',
      value: stats?.totalOrders ?? 0,
      icon: '📦',
      color: 'green',
    },
    {
      label: 'Tổng tranh chấp',
      value: stats?.totalDisputes ?? 0,
      icon: '⚖️',
      color: 'red',
    },
    {
      label: 'Doanh thu',
      value: stats ? `${stats.totalRevenue.toLocaleString()} Coin` : '0',
      icon: '💰',
      color: 'amber',
    },
    {
      label: 'Tổng bài đăng',
      value: stats?.totalListings ?? 0,
      icon: '📝',
      color: 'purple',
    },
    {
      label: 'Bài đăng hoạt động',
      value: stats?.activeListings ?? 0,
      icon: '✅',
      color: 'teal',
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
    red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
    teal: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Thống kê hệ thống</h1>
          <p className="text-white/60">Tổng quan về hệ thống</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-400 transition-colors disabled:opacity-50"
        >
          {loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-white/10 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat, idx) => {
            const colors = colorClasses[stat.color];
            if (!colors) return null;
            return (
              <div
                key={idx}
                className={`${colors.bg} border ${colors.border} rounded-2xl p-6`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">{stat.icon}</span>
                </div>
                <div className={`text-3xl font-bold ${colors.text} mb-1`}>
                  {stat.value}
                </div>
                <div className="text-white/60 text-sm">{stat.label}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 bg-[#0f1117] border border-white/[0.08] rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Biểu đồ hoạt động</h2>
        <div className="h-64 flex items-center justify-center text-white/40">
          <div className="text-center">
            <p className="text-4xl mb-2">📊</p>
            <p>Biểu đồ sẽ được hiển thị ở đây</p>
          </div>
        </div>
      </div>
    </div>
  );
}
