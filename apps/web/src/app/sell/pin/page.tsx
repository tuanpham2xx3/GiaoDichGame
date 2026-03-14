'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { AxiosError } from 'axios';

interface Listing {
  id: number;
  title: string;
  price: string;
  isPinned: boolean;
  pinExpiresAt: string | null;
  game?: { name: string };
}

interface PinConfig {
  pricePerDay: string;
  maxActivePins: number;
}

interface PriceCalculation {
  originalPrice: number;
  discountedPrice: number;
  discountPercent: number;
}

export default function PinPurchasePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingId = searchParams.get('listingId');

  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [config, setConfig] = useState<PinConfig | null>(null);
  const [price, setPrice] = useState<PriceCalculation | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      fetchMyListings();
      fetchConfig();
    }
  }, [user]);

  useEffect(() => {
    if (listingId && listings.length > 0) {
      const listing = listings.find(l => l.id === parseInt(listingId));
      if (listing) setSelectedListing(listing);
    }
  }, [listingId, listings]);

  useEffect(() => {
    if (user && days > 0) {
      fetchPrice();
    }
  }, [user, days]);

  const fetchMyListings = async () => {
    try {
      const res = await api.get<{ data: Listing[] }>('/listings/my-listings');
      setListings(res.data.data || res.data);
    } catch (err) {
      console.error('Failed to fetch listings:', err);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await api.get<{ data: PinConfig }>('/pin/admin/config');
      setConfig(res.data.data || res.data);
    } catch (err) {
      console.error('Failed to fetch config:', err);
    }
  };

  const fetchPrice = async () => {
    try {
      const res = await api.get<{ data: PriceCalculation }>(`/pin/calculate-price?days=${days}`);
      setPrice(res.data.data || res.data);
    } catch (err) {
      console.error('Failed to fetch price:', err);
    }
  };

  const handlePurchase = async () => {
    if (!selectedListing) return;
    setError('');
    setSuccess('');
    setPurchasing(true);
    try {
      await api.post('/pin/purchase', {
        listingId: selectedListing.id,
        days,
      });
      setSuccess('Mua Pin thành công! Bài đăng đã được ghim lên đầu.');
      fetchMyListings();
    } catch (err) {
      const ax = err as AxiosError<{ message: string | string[] }>;
      const msg = ax.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Mua Pin thất bại'));
    } finally {
      setPurchasing(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-white/10 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Mua Pin bài đăng</h1>
        <p className="text-white/60">Ghim bài đăng lên đầu danh sách để tăng visibility</p>
      </div>

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

      <div className="space-y-6">
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Chọn bài đăng</label>
          <select
            value={selectedListing?.id || ''}
            onChange={(e) => {
              const listing = listings.find(l => l.id === parseInt(e.target.value));
              setSelectedListing(listing || null);
            }}
            className="w-full px-4 py-3 bg-[#0f1117] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">-- Chọn bài đăng --</option>
            {listings.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {listing.title} {listing.isPinned ? '(Đang ghim)' : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedListing && (
          <>
            <div className="bg-[#0f1117] border border-white/[0.08] rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-white">{selectedListing.title}</h3>
                  <p className="text-white/50 text-sm">{selectedListing.price} Coin</p>
                </div>
                {selectedListing.isPinned && (
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                    Đang ghim
                  </span>
                )}
              </div>
              {selectedListing.pinExpiresAt && (
                <p className="text-white/50 text-sm mt-2">
                  Hết hạn: {new Date(selectedListing.pinExpiresAt).toLocaleDateString('vi-VN')}
                </p>
              )}
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Số ngày ghim
              </label>
              <div className="flex gap-3">
                {[1, 3, 7, 14, 30].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      days === d
                        ? 'bg-indigo-500 text-white'
                        : 'bg-[#0f1117] text-white/70 hover:bg-[#1a1d26]'
                    }`}
                  >
                    {d} ngày
                  </button>
                ))}
              </div>
            </div>

            {price && (
              <div className="bg-[#0f1117] border border-white/[0.08] rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white/70">Giá mỗi ngày</span>
                  <span className="text-white">{config?.pricePerDay || '?'} Coin</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white/70">Số ngày</span>
                  <span className="text-white">x {days}</span>
                </div>
                {price.discountPercent > 0 && (
                  <div className="flex justify-between items-center mb-2 text-green-400">
                    <span>Giảm giá VIP</span>
                    <span>-{price.discountPercent}%</span>
                  </div>
                )}
                <div className="border-t border-white/[0.08] pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">Tổng cộng</span>
                    <span className="text-xl font-bold text-indigo-400">
                      {price.discountedPrice.toFixed(0)} Coin
                    </span>
                  </div>
                  {price.discountPercent > 0 && (
                    <div className="text-right text-white/50 text-sm">
                      <span className="line-through">{price.originalPrice.toFixed(0)} Coin</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handlePurchase}
              disabled={purchasing || selectedListing.isPinned}
              className={`w-full py-3 rounded-xl font-medium transition-all ${
                purchasing
                  ? 'bg-indigo-500/50 text-white/50 cursor-wait'
                  : selectedListing.isPinned
                  ? 'bg-green-500/20 text-green-400 cursor-default'
                  : 'bg-indigo-500 text-white hover:bg-indigo-400'
              }`}
            >
              {purchasing
                ? 'Đang xử lý...'
                : selectedListing.isPinned
                ? 'Bài đã được ghim'
                : 'Mua Pin'}
            </button>
          </>
        )}

        {listings.length === 0 && (
          <div className="text-center py-12 text-white/50">
            Bạn chưa có bài đăng nào
          </div>
        )}
      </div>
    </div>
  );
}
