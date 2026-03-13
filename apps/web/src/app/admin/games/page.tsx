'use client';

import { useEffect, useState } from 'react';
import { gamesApi, Game } from '@/lib/api';
import Link from 'next/link';

export default function AdminGamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', iconUrl: '' });
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      const data = await gamesApi.getAll({ limit: 100 });
      setGames(data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await gamesApi.update(editingId, { name: form.name, iconUrl: form.iconUrl });
      } else {
        await gamesApi.create(form);
      }
      setForm({ name: '', slug: '', iconUrl: '' });
      setEditingId(null);
      setShowForm(false);
      loadGames();
    } catch (err) {
      alert('Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa game này?')) return;
    try {
      await gamesApi.delete(id);
      loadGames();
    } catch (err) {
      alert('Có lỗi xảy ra');
    }
  };

  const handleEdit = (game: Game) => {
    setForm({ name: game.name, slug: game.slug, iconUrl: game.iconUrl || '' });
    setEditingId(game.id);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1118] flex items-center justify-center">
        <div className="text-white/50">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1118]">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Quản lý Games</h1>
            <p className="text-white/50">Thêm, sửa, xóa games và cập nhật schema</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/schema-builder" className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors">
              Schema Builder
            </Link>
            <button
              onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ name: '', slug: '', iconUrl: '' }); }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
            >
              {showForm ? 'Hủy' : 'Thêm Game'}
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-[#1e2330] border border-white/[0.08] rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">{editingId ? 'Sửa Game' : 'Thêm Game Mới'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-white/70 text-sm mb-1">Tên Game</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 bg-[#151821] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  className="w-full px-4 py-2 bg-[#151821] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Icon URL</label>
                <input
                  type="text"
                  value={form.iconUrl}
                  onChange={(e) => setForm({ ...form, iconUrl: e.target.value })}
                  className="w-full px-4 py-2 bg-[#151821] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  placeholder="https://..."
                />
              </div>
            </div>
            <button type="submit" className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg">
              {editingId ? 'Lưu' : 'Thêm'}
            </button>
          </form>
        )}

        <div className="bg-[#1e2330] border border-white/[0.08] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-white/[0.08]">
              <tr>
                <th className="text-left px-6 py-4 text-white/50 font-medium">Game</th>
                <th className="text-left px-6 py-4 text-white/50 font-medium">Slug</th>
                <th className="text-left px-6 py-4 text-white/50 font-medium">Schema</th>
                <th className="text-left px-6 py-4 text-white/50 font-medium">Trạng thái</th>
                <th className="text-right px-6 py-4 text-white/50 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {games.map((game) => (
                <tr key={game.id} className="border-b border-white/[0.08] last:border-0">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#151821] rounded-lg overflow-hidden flex items-center justify-center">
                        {game.iconUrl ? (
                          <img src={game.iconUrl} alt={game.name} className="w-8 h-8 object-contain" />
                        ) : (
                          <span className="text-white/20 text-xs">No img</span>
                        )}
                      </div>
                      <span className="text-white font-medium">{game.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white/50 font-mono text-sm">{game.slug}</td>
                  <td className="px-6 py-4 text-white/50 text-sm">
                    {game.schema && game.schema.length > 0 ? `${game.schema.length} trường` : 'Chưa có'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${game.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {game.isActive ? 'Hoạt động' : 'Ẩn'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleEdit(game)} className="text-indigo-400 hover:text-indigo-300 text-sm mr-3">
                      Sửa
                    </button>
                    <button onClick={() => handleDelete(game.id)} className="text-red-400 hover:text-red-300 text-sm">
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {games.length === 0 && (
            <div className="text-center py-12 text-white/50">
              Chưa có game nào
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
