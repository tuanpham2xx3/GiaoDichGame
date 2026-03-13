'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listingsApi, Listing } from '@/lib/api';

export default function MyListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    listingsApi.getMyListings()
      .then(setListings)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa bài đăng này?')) return;
    
    setDeleting(id);
    try {
      await listingsApi.delete(id);
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      alert(error.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PUBLISHED: 'bg-green-500/20 text-green-400',
      LOCKED: 'bg-yellow-500/20 text-yellow-400',
      DELIVERED: 'bg-blue-500/20 text-blue-400',
      COMPLETED: 'bg-indigo-500/20 text-indigo-400',
      DISPUTED: 'bg-red-500/20 text-red-400',
      DELETED: 'bg-gray-500/20 text-gray-400',
    };
    return styles[status] || 'bg-gray-500/20 text-gray-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1118] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1118] py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="inline-flex items-center text-white/50 hover:text-white mb-2 transition-colors">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Quay lại
            </Link>
            <h1 className="text-3xl font-bold text-white">Quản lý bài đăng</h1>
          </div>
          <Link
            href="/sell"
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors"
          >
            + Đăng bài mới
          </Link>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {listings.length === 0 ? (
          <div className="bg-[#1e2330] rounded-2xl p-12 border border-white/[0.08] text-center">
            <p className="text-white/50 text-lg mb-4">Bạn chưa có bài đăng nào.</p>
            <Link href="/sell" className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl">
              Đăng bài ngay
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="bg-[#1e2330] rounded-xl p-6 border border-white/[0.08] flex items-center gap-6"
              >
                {/* Image */}
                <div className="w-24 h-24 rounded-lg bg-[#151821] flex-shrink-0 overflow-hidden">
                  {listing.listingImages && listing.listingImages.length > 0 ? (
                    <img
                      src={listing.listingImages[0]!.url}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link
                        href={`/listings/${listing.id}`}
                        className="text-lg font-semibold text-white hover:text-indigo-400 transition-colors"
                      >
                        {listing.title}
                      </Link>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(listing.status)}`}>
                          {listing.status}
                        </span>
                        <span className="text-white/50 text-sm">
                          {listing.game?.name || 'Unknown game'}
                        </span>
                        <span className="text-white/50 text-sm">
                          {listing.viewCount} lượt xem
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-indigo-400">
                        {Number(listing.price).toLocaleString('vi-VN')} Coin
                      </p>
                      <p className="text-white/50 text-sm">
                        {new Date(listing.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/listings/${listing.id}`}
                    className="p-2 text-white/50 hover:text-white transition-colors"
                    title="Xem"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </Link>
                  {listing.status === 'PUBLISHED' && (
                    <button
                      onClick={() => handleDelete(listing.id)}
                      disabled={deleting === listing.id}
                      className="p-2 text-white/50 hover:text-red-400 transition-colors disabled:opacity-50"
                      title="Xóa"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
