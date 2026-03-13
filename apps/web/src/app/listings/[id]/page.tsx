'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { listingsApi, Listing } from '@/lib/api';
import { PurchaseModal } from '@/components/PurchaseModal';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = Number(params.id);
  
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [balance, setBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(false);

  useEffect(() => {
    if (!id) return;

    listingsApi.getById(id)
      .then(setListing)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load listing'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (user && showPurchaseModal) {
      loadBalance();
    }
  }, [user, showPurchaseModal]);

  const loadBalance = async () => {
    setLoadingBalance(true);
    try {
      const { data } = await api.get('/v1/wallet/balance');
      setBalance(data.available || 0);
    } catch (err) {
      console.error('Failed to load balance:', err);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleBuyClick = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (listing && user.id === listing.sellerId) {
      return; // Can't buy own listing
    }
    setShowPurchaseModal(true);
  };

  const handlePurchaseSuccess = (orderId: number) => {
    setShowPurchaseModal(false);
    router.push(`/orders/${orderId}`);
  };

  if (loading || loadingBalance) {
    return (
      <div className="min-h-screen bg-[#0f1118] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-[#0f1118] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error || 'Listing not found'}</p>
          <Link href="/" className="text-indigo-400 hover:underline">← Back to home</Link>
        </div>
      </div>
    );
  }

  const isOwner = user && user.id === listing.sellerId;

  return (
    <div className="min-h-screen bg-[#0f1118] py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <Link href="/" className="inline-flex items-center text-white/50 hover:text-white mb-6 transition-colors">
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Quay lại
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            <div className="bg-[#1e2330] rounded-2xl overflow-hidden border border-white/[0.08]">
              <div className="aspect-video bg-[#151821]">
                {listing.listingImages && listing.listingImages.length > 0 ? (
                  <img
                    src={listing.listingImages[0]!.url}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20">
                    <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              {listing.listingImages && listing.listingImages.length > 1 && (
                <div className="flex gap-2 p-4 overflow-x-auto">
                  {listing.listingImages.map((img, idx) => (
                    <button
                      key={img.id}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                        idx === 0 ? 'border-indigo-500' : 'border-transparent'
                      }`}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="bg-[#1e2330] rounded-2xl p-6 border border-white/[0.08]">
              <h1 className="text-2xl font-bold text-white mb-4">{listing.title}</h1>
              
              {listing.description && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-white/50 mb-2">Mô tả</h3>
                  <p className="text-white/70 whitespace-pre-wrap">{listing.description}</p>
                </div>
              )}

              {listing.gameAttributes && Object.keys(listing.gameAttributes).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-white/50 mb-3">Thông tin tài khoản</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(listing.gameAttributes).map(([key, value]) => (
                      <div key={key} className="bg-[#151821] rounded-lg px-4 py-3">
                        <span className="text-white/50 text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                        <p className="text-white font-medium">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price & Buy */}
            <div className="bg-[#1e2330] rounded-2xl p-6 border border-white/[0.08] sticky top-24">
              <div className="mb-6">
                <p className="text-white/50 text-sm">Giá bán</p>
                <p className="text-4xl font-bold text-indigo-400">
                  {Number(listing.price).toLocaleString('vi-VN')} Coin
                </p>
              </div>

              {!isOwner ? (
                <button 
                  onClick={handleBuyClick}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-lg transition-colors mb-3"
                >
                  Mua ngay
                </button>
              ) : (
                <button 
                  disabled
                  className="w-full py-4 bg-gray-600 text-white font-bold rounded-xl text-lg mb-3 cursor-not-allowed"
                >
                  Đây là sản phẩm của bạn
                </button>
              )}

              <p className="text-center text-white/40 text-sm">
                Bạn sẽ được bảo vệ bởi hệ thống Escrow
              </p>
            </div>

            {/* Seller Info */}
            <div className="bg-[#1e2330] rounded-2xl p-6 border border-white/[0.08]">
              <h3 className="text-sm font-medium text-white/50 mb-4">Người bán</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                  {listing.seller?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-white font-medium">{listing.seller?.username || 'Unknown'}</p>
                  <p className="text-white/50 text-sm">Người bán</p>
                </div>
              </div>
            </div>

            {/* Game Info */}
            {listing.game && (
              <div className="bg-[#1e2330] rounded-2xl p-6 border border-white/[0.08]">
                <h3 className="text-sm font-medium text-white/50 mb-4">Game</h3>
                <div className="flex items-center gap-3">
                  {listing.game.iconUrl ? (
                    <img src={listing.game.iconUrl} alt={listing.game.name} className="w-12 h-12 rounded-lg" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-indigo-600/30 flex items-center justify-center">
                      <span className="text-indigo-400 font-bold">{listing.game.name[0]}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-white font-medium">{listing.game.name}</p>
                    <Link href={`/games/${listing.game.slug}`} className="text-indigo-400 text-sm hover:underline">
                      Xem game khác
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="bg-[#1e2330] rounded-2xl p-6 border border-white/[0.08]">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Lượt xem</span>
                <span className="text-white">{listing.viewCount}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-white/50">Đăng ngày</span>
                <span className="text-white">{new Date(listing.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Modal */}
        <PurchaseModal
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          listing={listing}
          userBalance={balance}
          onSuccess={handlePurchaseSuccess}
        />
      </div>
    </div>
  );
}
