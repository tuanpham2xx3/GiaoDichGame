'use client';

import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function Header() {
  const { user, logout, isLoading } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      api.get<{ available: number }>('/v1/wallet/balance')
        .then((r) => setBalance(r.data.available))
        .catch(() => null);
    }
  }, [user]);

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-16 bg-[#0f1117]/80 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-6xl mx-auto px-6 h-full flex items-center gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
          <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            GiaoDichGame
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex gap-1 flex-1">
          <Link href="/" className="px-3 py-1.5 rounded-full text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all">
            Trang chủ
          </Link>
          {user && (
            <Link href="/wallet" className="px-3 py-1.5 rounded-full text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all">
              Ví của tôi
            </Link>
          )}
        </nav>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-3">
          {isLoading ? null : user ? (
            <div className="relative flex items-center gap-3">
              {balance !== null && (
                <span className="flex items-center gap-1.5 bg-[#1e2330] border border-white/[0.08] rounded-full px-3 py-1.5 text-sm font-semibold text-yellow-400">
                  {balance.toLocaleString()} Coin
                </span>
              )}
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
