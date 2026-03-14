'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { disputesApi, DisputeStats } from '../../../lib/api';

export default function AdminDisputesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<DisputeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await disputesApi.getDisputeStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
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
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-white mb-6">Quản lý tranh chấp</h1>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#1e2330] rounded-lg p-4">
              <p className="text-gray-400 text-sm">Tổng số</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="bg-[#1e2330] rounded-lg p-4">
              <p className="text-gray-400 text-sm">Chờ xử lý</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.open}</p>
            </div>
            <div className="bg-[#1e2330] rounded-lg p-4">
              <p className="text-gray-400 text-sm">Đang xem xét</p>
              <p className="text-2xl font-bold text-blue-400">{stats.underReview}</p>
            </div>
            <div className="bg-[#1e2330] rounded-lg p-4">
              <p className="text-gray-400 text-sm">Đã giải quyết</p>
              <p className="text-2xl font-bold text-green-400">{stats.resolved}</p>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-4">
          <div
            className="bg-[#1e2330] rounded-lg p-6 cursor-pointer hover:bg-[#252a3a] transition-colors"
            onClick={() => router.push('/admin/disputes/list')}
          >
            <h2 className="text-lg font-semibold text-white mb-2">Danh sách tranh chấp</h2>
            <p className="text-gray-400 text-sm">Xem và xử lý tất cả tranh chấp</p>
          </div>
          <div
            className="bg-[#1e2330] rounded-lg p-6 cursor-pointer hover:bg-[#252a3a] transition-colors"
            onClick={() => router.push('/admin/disputes/settings')}
          >
            <h2 className="text-lg font-semibold text-white mb-2">Cấu hình</h2>
            <p className="text-gray-400 text-sm">Cài đặt thời gian auto refund</p>
          </div>
        </div>
      </div>
    </div>
  );
}
