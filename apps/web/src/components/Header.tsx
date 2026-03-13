'use client';

import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { api, notificationsApi } from '../lib/api';

export function Header() {
  const { user, logout, isLoading } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      api.get<{ available: number }>('/v1/wallet/balance')
        .then((r) => setBalance(r.data.available))
        .catch(() => null);

      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const data = await notificationsApi.getNotifications({ limit: 5 });
      setNotifications(data.items);
      const unread = await notificationsApi.getUnreadCount();
      setUnreadCount(unread.count);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-16 bg-[#0f1117]/80 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-6xl mx-auto px-6 h-full flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
          <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            GiaoDichGame
          </span>
        </Link>

        <nav className="flex gap-1 flex-1">
          <Link href="/" className="px-3 py-1.5 rounded-full text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all">
            Trang chủ
          </Link>
          {user && (
            <>
              <Link href="/orders" className="px-3 py-1.5 rounded-full text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all">
                Đơn hàng
              </Link>
              <Link href="/wallet" className="px-3 py-1.5 rounded-full text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all">
                Ví của tôi
              </Link>
              {user.permissions?.includes('listing:create') && (
                <>
                  <Link href="/sell" className="px-3 py-1.5 rounded-full text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all">
                    Đăng bài
                  </Link>
                  <Link href="/my-listings" className="px-3 py-1.5 rounded-full text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all">
                    Bài của tôi
                  </Link>
                </>
              )}
            </>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {isLoading ? null : user ? (
            <div className="relative flex items-center gap-3">
              {balance !== null && (
                <span className="flex items-center gap-1.5 bg-[#1e2330] border border-white/[0.08] rounded-full px-3 py-1.5 text-sm font-semibold text-yellow-400">
                  {balance.toLocaleString()} Coin
                </span>
              )}

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="w-9 h-9 rounded-full bg-[#1e2330] border border-white/[0.08] flex items-center justify-center hover:bg-white/5 transition-colors relative"
                >
                  <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute top-[calc(100%+12px)] right-0 w-80 bg-[#1e2330] border border-white/[0.08] rounded-xl p-2 shadow-2xl z-50">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.08]">
                      <span className="text-white font-medium">Thông báo</span>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} className="text-xs text-indigo-400 hover:text-indigo-300">
                          Đánh dấu đã đọc
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-center text-white/40 py-4 text-sm">Không có thông báo</p>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer ${!notif.isRead ? 'bg-indigo-500/10' : ''}`}
                          >
                            <p className="text-white text-sm font-medium">{notif.title}</p>
                            {notif.content && <p className="text-white/50 text-xs mt-0.5">{notif.content}</p>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-white font-bold text-sm flex items-center justify-center hover:scale-105 transition-transform"
              >
                {user.username[0]?.toUpperCase()}
              </button>

              {menuOpen && (
                <div className="absolute top-[calc(100%+12px)] right-0 w-48 bg-[#1e2330] border border-white/[0.08] rounded-xl p-2 shadow-2xl animate-fade-in z-50">
                  <Link href="/profile" onClick={() => setMenuOpen(false)} className="block w-full px-3 py-2 rounded-lg text-sm text-white/60 hover:bg-white/5 hover:text-white transition-all">
                    Hồ sơ
                  </Link>
                  <Link href="/wallet" onClick={() => setMenuOpen(false)} className="block w-full px-3 py-2 rounded-lg text-sm text-white/60 hover:bg-white/5 hover:text-white transition-all">
                    Ví Coin
                  </Link>
                  {user.permissions.includes('topup:confirm') && (
                    <Link href="/admin/topup-requests" onClick={() => setMenuOpen(false)} className="block w-full px-3 py-2 rounded-lg text-sm text-white/60 hover:bg-white/5 hover:text-white transition-all">
                      Admin Panel
                    </Link>
                  )}
                  <div className="my-1 border-t border-white/[0.08]" />
                  <button
                    onClick={() => { setMenuOpen(false); void logout(); }}
                    className="block w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <Link href="/login" className="px-4 py-1.5 rounded-full text-sm font-medium text-white/60 border border-white/[0.08] hover:bg-white/5 hover:text-white transition-all">
                Đăng nhập
              </Link>
              <Link href="/register" className="px-4 py-1.5 rounded-full text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition-all">
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
