'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api';

interface User {
  id: number;
  email: string;
  username: string;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  const { user, isLoading, hasPermission } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user && hasPermission('user:manage')) {
      fetchUsers();
    }
  }, [user, pagination.page, hasPermission]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      if (search) params.append('search', search);

      const res = await api.get<{ data: User[]; pagination: Pagination }>(`/v1/admin/users?${params}`);
      setUsers(res.data.data || res.data);
      if (res.data.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (userId: number) => {
    setActionLoading(userId);
    try {
      await api.patch(`/v1/admin/users/${userId}/ban`);
      fetchUsers();
    } catch (err) {
      console.error('Failed to ban user:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnban = async (userId: number) => {
    setActionLoading(userId);
    try {
      await api.patch(`/v1/admin/users/${userId}/unban`);
      fetchUsers();
    } catch (err) {
      console.error('Failed to unban user:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 });
    fetchUsers();
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-white/10 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasPermission('user:manage')) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-white mb-2">Không có quyền truy cập</h2>
        <p className="text-white/60">Bạn cần quản lý người dùng để xem trang này</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Quản lý người dùng</h1>
        <p className="text-white/60">Danh sách và quản lý người dùng</p>
      </div>

      <form onSubmit={handleSearch} className="mb-6 flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm theo tên hoặc email..."
          className="flex-1 px-4 py-3 bg-[#0f1117] border border-white/[0.08] rounded-xl text-white placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          className="px-6 py-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-400 transition-colors"
        >
          Tìm kiếm
        </button>
      </form>

      <div className="bg-[#0f1117] border border-white/[0.08] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="text-left px-6 py-4 text-white/60 text-sm font-medium">ID</th>
              <th className="text-left px-6 py-4 text-white/60 text-sm font-medium">Username</th>
              <th className="text-left px-6 py-4 text-white/60 text-sm font-medium">Email</th>
              <th className="text-left px-6 py-4 text-white/60 text-sm font-medium">Trạng thái</th>
              <th className="text-left px-6 py-4 text-white/60 text-sm font-medium">Ngày tạo</th>
              <th className="text-left px-6 py-4 text-white/60 text-sm font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-white/10 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-white/50">
                  Không có người dùng nào
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-white/[0.05] hover:bg-white/[0.02]">
                  <td className="px-6 py-4 text-white/70 text-sm">{u.id}</td>
                  <td className="px-6 py-4 text-white text-sm font-medium">{u.username}</td>
                  <td className="px-6 py-4 text-white/70 text-sm">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      u.isActive
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {u.isActive ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white/70 text-sm">
                    {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-6 py-4">
                    {actionLoading === u.id ? (
                      <div className="w-5 h-5 border-2 border-white/10 border-t-indigo-500 rounded-full animate-spin" />
                    ) : u.isActive ? (
                      <button
                        onClick={() => handleBan(u.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Khóa
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUnban(u.id)}
                        className="text-green-400 hover:text-green-300 text-sm"
                      >
                        Mở khóa
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setPagination({ ...pagination, page })}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                pagination.page === page
                  ? 'bg-indigo-500 text-white'
                  : 'bg-[#0f1117] text-white/70 hover:bg-[#1a1d26]'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
