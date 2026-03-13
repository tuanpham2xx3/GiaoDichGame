export interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: {
    id: number;
    title: string;
    price: string;
    seller?: { id: number; username: string };
    game?: { name: string };
  };
  userBalance: number;
  onSuccess: (orderId: number) => void;
}

'use client';
import { useState } from 'react';
import { ordersApi } from '../lib/api';

export function PurchaseModal({ isOpen, onClose, listing, userBalance, onSuccess }: PurchaseModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const price = parseFloat(listing.price);
  const canAfford = userBalance >= price;

  const handleConfirm = async () => {
    setIsLoading(true);
    setError('');

    try {
      const order = await ordersApi.createOrder(listing.id);
      onSuccess(order.id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create order');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1e2330] rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold mb-4 text-white">Xác nhận mua hàng</h2>

        <div className="mb-4 p-4 bg-[#0f1117] rounded-lg">
          <p className="text-gray-400 text-sm">Sản phẩm</p>
          <p className="text-white font-medium">{listing.title}</p>
          {listing.game && <p className="text-gray-400 text-sm">{listing.game.name}</p>}
        </div>

        <div className="mb-4 p-4 bg-[#0f1117] rounded-lg">
          <p className="text-gray-400 text-sm">Giá</p>
          <p className="text-2xl font-bold text-green-400">{parseFloat(listing.price).toLocaleString()} Coin</p>
        </div>

        <div className="mb-4 p-4 bg-[#0f1117] rounded-lg">
          <p className="text-gray-400 text-sm">Số dư khả dụng</p>
          <p className={`text-xl font-semibold ${canAfford ? 'text-white' : 'text-red-400'}`}>
            {userBalance.toLocaleString()} Coin
          </p>
        </div>

        {!canAfford && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">Số dư không đủ. Vui lòng nạp thêm Coin.</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-[#2a3142] text-white rounded-lg hover:bg-[#3a4152] transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canAfford || isLoading}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              'Xác nhận thanh toán'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
