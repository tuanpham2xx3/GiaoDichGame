'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { AxiosError } from 'axios';

interface VipBenefits {
  isVip: boolean;
  nameColor?: string;
  avatarBorder?: string;
  discountPercent: number;
  badge?: string;
}

export default function VipProfilePage() {
  const { user, isLoading, refresh } = useAuth();
  const router = useRouter();
  const [benefits, setBenefits] = useState<VipBenefits | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    displayName: '',
    avatarUrl: '',
    nameColor: '#000000',
    bio: '',
  });

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      fetchBenefits();
    }
  }, [user]);

  const fetchBenefits = async () => {
    try {
      const res = await api.get<{ benefits: VipBenefits }>('/vip/my-vip');
      setBenefits(res.data.benefits);
      if (!res.data.benefits?.isVip) {
        router.push('/vip');
      }
    } catch (err) {
      console.error('Failed to fetch VIP:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.patch('/v1/users/me/vip-profile', form);
      await refresh();
      setSuccess('Cập nhật hồ sơ VIP thành công!');
    } catch (err) {
      const ax = err as AxiosError<{ message: string | string[] }>;
      const msg = ax.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Cập nhật thất bại'));
    } finally {
      setLoading(false);
    }
  };

  const colorPresets = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  ];

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-white/10 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!benefits?.isVip) {
    return (
      <div className="max-w-xl mx-auto px-6 py-10 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-white mb-2">Cần VIP để sử dụng</h2>
        <p className="text-white/60 mb-6">Bạn cần mua VIP để sử dụng tính năng này</p>
        <button
          onClick={() => router.push('/vip')}
          className="px-6 py-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-400 transition-colors"
        >
          Mua VIP ngay
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Chỉnh sửa hồ sơ VIP</h1>
        <p className="text-white/60">Tùy chỉnh hiển thị của bạn</p>
      </div>

      {benefits.badge && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
          <span className="text-2xl">⭐</span>
          <span className="text-amber-400 font-medium">{benefits.badge}</span>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Tên hiển thị</label>
          <input
            type="text"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            placeholder="Nhập tên hiển thị"
            className="w-full px-4 py-3 bg-[#0f1117] border border-white/[0.08] rounded-xl text-white placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500"
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">URL Avatar</label>
          <input
            type="url"
            value={form.avatarUrl}
            onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
            placeholder="https://example.com/avatar.jpg"
            className="w-full px-4 py-3 bg-[#0f1117] border border-white/[0.08] rounded-xl text-white placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Màu tên</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.nameColor}
              onChange={(e) => setForm({ ...form, nameColor: e.target.value })}
              className="w-12 h-12 rounded-lg cursor-pointer border-0"
            />
            <div className="flex gap-2">
              {colorPresets.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, nameColor: color })}
                  className={`w-8 h-8 rounded-full border-2 ${
                    form.nameColor === color ? 'border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <p className="text-white/50 text-sm mt-2">
            Xem trước: <span style={{ color: form.nameColor }}>Tên của bạn</span>
          </p>
        </div>

        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Giới thiệu</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="Viết giới thiệu về bạn..."
            rows={4}
            className="w-full px-4 py-3 bg-[#0f1117] border border-white/[0.08] rounded-xl text-white placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500 resize-none"
            maxLength={500}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-xl font-medium transition-all ${
            loading
              ? 'bg-indigo-500/50 text-white/50 cursor-wait'
              : 'bg-indigo-500 text-white hover:bg-indigo-400'
          }`}
        >
          {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </form>
    </div>
  );
}
