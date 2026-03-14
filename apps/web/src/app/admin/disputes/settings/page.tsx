'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { disputesApi, DisputeSettings } from '../../../lib/api';

export default function AdminDisputesSettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [settings, setSettings] = useState<DisputeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoRefundHours, setAutoRefundHours] = useState('6');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await disputesApi.getSettings();
      setSettings(data);
      setAutoRefundHours(data.auto_refund_hours);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess('');
    try {
      await disputesApi.updateSettings('auto_refund_hours', autoRefundHours);
      setSuccess('Lưu thành công!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/admin/disputes')}
            className="text-gray-400 hover:text-white"
          >
            ← Quay lại
          </button>
          <h1 className="text-2xl font-bold text-white">Cấu hình tranh chấp</h1>
        </div>

        {/* Settings Form */}
        <div className="bg-[#1e2330] rounded-lg p-6">
          <div className="space-y-6">
            <div>
              <label className="text-white font-medium block mb-2">Thời gian auto refund</label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="1"
                  max="72"
                  value={autoRefundHours}
                  onChange={(e) => setAutoRefundHours(e.target.value)}
                  className="w-32 px-4 py-2 bg-[#0f1117] border border-[#2a3142] rounded-lg text-white"
                />
                <span className="text-gray-400">giờ</span>
              </div>
              <p className="text-gray-500 text-sm mt-2">
                Sau khi mở dispute, nếu Seller không phản hồi trong {autoRefundHours} giờ, hệ thống sẽ tự động hoàn tiền cho Buyer.
              </p>
            </div>

            {success && (
              <div className="bg-green-500/20 border border-green-500 text-green-400 px-4 py-3 rounded-lg">
                {success}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
