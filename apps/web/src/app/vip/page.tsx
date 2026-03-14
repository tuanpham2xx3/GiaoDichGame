'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { AxiosError } from 'axios';

interface VipPackage {
  id: number;
  name: string;
  priceCoin: string;
  durationDays: number;
  benefits: {
    nameColor?: string;
    avatarBorder?: string;
    discountPercent?: number;
    maxListings?: number;
    badge?: string;
  }[];
  isActive: boolean;
}

interface MyVip {
  id: number;
  packageId: number;
  expiresAt: string;
}

export default function VipPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [packages, setPackages] = useState<VipPackage[]>([]);
  const [myVip, setMyVip] = useState<MyVip | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      fetchPackages();
      fetchMyVip();
    }
  }, [user]);

  const fetchPackages = async () => {
    try {
      const res = await api.get<{ data: VipPackage[] }>('/vip/packages');
      setPackages(res.data.data || res.data);
    } catch (err) {
      console.error('Failed to fetch packages:', err);
    }
  };

  const fetchMyVip = async () => {
    try {
      const res = await api.get<{ vip: MyVip }>('/vip/my-vip');
      setMyVip(res.data.vip);
    } catch (err) {
      console.error('Failed to fetch VIP:', err);
    }
  };

  const handlePurchase = async (packageId: number) => {
    setError('');
    setSuccess('');
    setPurchasing(packageId);
    try {
      await api.post('/vip/purchase', { packageId });
      setSuccess('Mua VIP thành công!');
      fetchMyVip();
    } catch (err) {
      const ax = err as AxiosError<{ message: string | string[] }>;
      const msg = ax.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Mua VIP thất bại'));
    } finally {
      setPurchasing(null);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-white/10 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  const currentVip = packages.find(p => p.id === myVip?.packageId);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Nâng cấp VIP</h1>
        <p className="text-white/60">Trở thành VIP để hưởng nhiều đặc quyền</p>
      </div>

      {myVip && (
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-2xl">
              ⭐
            </div>
            <div>
              <h3 className="text-xl font-bold text-amber-400">
                {currentVip?.name || 'VIP Member'}
              </h3>
              <p className="text-white/70">
                Hết hạn: {new Date(myVip.expiresAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl mb-6">
          {success}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {packages.map((pkg) => {
          const benefits = pkg.benefits as any;
          const isActive = myVip?.packageId === pkg.id;

          return (
            <div
              key={pkg.id}
              className={`bg-[#0f1117] border rounded-2xl p-6 ${
                isActive
                  ? 'border-amber-500/50 ring-2 ring-amber-500/25'
                  : 'border-white/[0.08] hover:border-white/[0.15]'
              } transition-all`}
            >
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">{pkg.name}</h3>
                <div className="text-3xl font-bold text-amber-400">
                  {pkg.priceCoin}
                  <span className="text-sm text-white/60 ml-1">Coin</span>
                </div>
                <p className="text-white/50 text-sm mt-1">{pkg.durationDays} ngày</p>
              </div>

              <ul className="space-y-3 mb-6">
                {benefits?.badge && (
                  <li className="flex items-center gap-2 text-white/80 text-sm">
                    <span className="text-amber-400">✓</span>
                    Badge: {benefits.badge}
                  </li>
                )}
                {benefits?.nameColor && (
                  <li className="flex items-center gap-2 text-white/80 text-sm">
                    <span className="text-amber-400">✓</span>
                    Màu tên: <span style={{ color: benefits.nameColor }}>{benefits.nameColor}</span>
                  </li>
                )}
                {benefits?.discountPercent > 0 && (
                  <li className="flex items-center gap-2 text-white/80 text-sm">
                    <span className="text-amber-400">✓</span>
                    Giảm {benefits.discountPercent}% mua Pin
                  </li>
                )}
                {benefits?.maxListings && (
                  <li className="flex items-center gap-2 text-white/80 text-sm">
                    <span className="text-amber-400">✓</span>
                    Tối đa {benefits.maxListings} bài đăng
                  </li>
                )}
              </ul>

              <button
                onClick={() => handlePurchase(pkg.id)}
                disabled={purchasing === pkg.id || isActive}
                className={`w-full py-3 rounded-xl font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-400 cursor-default'
                    : purchasing === pkg.id
                    ? 'bg-indigo-500/50 text-white/50 cursor-wait'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400'
                }`}
              >
                {isActive ? 'Đang sử dụng' : purchasing === pkg.id ? 'Đang xử lý...' : 'Mua ngay'}
              </button>
            </div>
          );
        })}
      </div>

      {packages.length === 0 && (
        <div className="text-center py-12 text-white/50">
          Chưa có gói VIP nào được cung cấp
        </div>
      )}
    </div>
  );
}
