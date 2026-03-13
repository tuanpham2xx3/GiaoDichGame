'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { gamesApi, listingsApi, Game } from '@/lib/api';

interface FormData {
  gameId: number | '';
  title: string;
  description: string;
  price: string;
  gameAttributes: Record<string, string>;
}

export default function SellPage() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    gameId: '',
    title: '',
    description: '',
    price: '',
    gameAttributes: {},
  });

  useEffect(() => {
    gamesApi.getAll({ limit: 100 })
      .then((data) => setGames(data.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleGameChange = (gameId: number) => {
    const game = games.find((g) => g.id === gameId) || null;
    setSelectedGame(game);
    setFormData((prev) => ({
      ...prev,
      gameId,
      gameAttributes: {},
    }));
  };

  const handleAttributeChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      gameAttributes: {
        ...prev.gameAttributes,
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await listingsApi.create({
        gameId: Number(formData.gameId),
        title: formData.title,
        description: formData.description,
        price: Number(formData.price),
        gameAttributes: formData.gameAttributes,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push('/my-listings');
      }, 2000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1118] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0f1118] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Đăng bài thành công!</h2>
          <p className="text-white/50 mb-4">Chuyển hướng đến trang quản lý...</p>
          <Link href="/my-listings" className="text-indigo-400 hover:underline">
            Xem danh sách →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1118] py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center text-white/50 hover:text-white mb-6 transition-colors">
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Quay lại
        </Link>

        <h1 className="text-3xl font-bold text-white mb-8">Đăng bán tài khoản game</h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Game Selection */}
          <div className="bg-[#1e2330] rounded-2xl p-6 border border-white/[0.08]">
            <h2 className="text-lg font-semibold text-white mb-4">Chọn Game</h2>
            <select
              value={formData.gameId}
              onChange={(e) => handleGameChange(Number(e.target.value))}
              className="w-full px-4 py-3 bg-[#151821] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-indigo-500"
              required
            >
              <option value="">-- Chọn game --</option>
              {games.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
          </div>

          {/* Basic Info */}
          <div className="bg-[#1e2330] rounded-2xl p-6 border border-white/[0.08]">
            <h2 className="text-lg font-semibold text-white mb-4">Thông tin cơ bản</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Tiêu đề</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#151821] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Ví dụ: Bán acc Liên Quân Rank Vàng"
                  required
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#151821] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-indigo-500 h-32 resize-none"
                  placeholder="Mô tả chi tiết về tài khoản..."
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Giá bán (Coin)</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#151821] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Nhập số Coin"
                  min="1000"
                  step="1000"
                  required
                />
                <p className="text-white/40 text-sm mt-1">Tối thiểu: 1,000 Coin</p>
              </div>
            </div>
          </div>

          {/* Dynamic Attributes */}
          {selectedGame && selectedGame.schema && selectedGame.schema.length > 0 && (
            <div className="bg-[#1e2330] rounded-2xl p-6 border border-white/[0.08]">
              <h2 className="text-lg font-semibold text-white mb-4">Thông tin tài khoản game</h2>
              
              <div className="space-y-4">
                {selectedGame.schema.map((field) => (
                  <div key={field.field}>
                    <label className="block text-white/70 text-sm mb-2">
                      {field.label}
                      {field.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    
                    {field.type === 'select' && field.options ? (
                      <select
                        value={formData.gameAttributes[field.field] || ''}
                        onChange={(e) => handleAttributeChange(field.field, e.target.value)}
                        className="w-full px-4 py-3 bg-[#151821] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                        required={field.required}
                      >
                        <option value="">-- Chọn {field.label} --</option>
                        {field.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'number' ? (
                      <input
                        type="number"
                        value={formData.gameAttributes[field.field] || ''}
                        onChange={(e) => handleAttributeChange(field.field, e.target.value)}
                        className="w-full px-4 py-3 bg-[#151821] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                        required={field.required}
                      />
                    ) : (
                      <input
                        type="text"
                        value={formData.gameAttributes[field.field] || ''}
                        onChange={(e) => handleAttributeChange(field.field, e.target.value)}
                        className="w-full px-4 py-3 bg-[#151821] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-lg transition-colors"
          >
            {submitting ? 'Đang đăng bài...' : 'Đăng bài ngay'}
          </button>
        </form>
      </div>
    </div>
  );
}
