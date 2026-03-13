'use client';

import { useEffect, useState } from 'react';
import { gamesApi, Game } from '@/lib/api';
import Link from 'next/link';

interface SchemaField {
  field: string;
  label: string;
  type: 'text' | 'number' | 'select';
  required: boolean;
  options?: string[];
}

export default function SchemaBuilderPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<number | null>(null);
  const [schema, setSchema] = useState<SchemaField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      const data = await gamesApi.getAll({ limit: 100 });
      setGames(data.items);
      if (data.items.length > 0) {
        const firstGame = data.items[0]!;
        setSelectedGame(firstGame.id);
        setSchema(firstGame.schema || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGameChange = (gameId: number) => {
    const game = games.find(g => g.id === gameId);
    setSelectedGame(gameId);
    setSchema(game?.schema || []);
  };

  const addField = () => {
    setSchema([...schema, { field: '', label: '', type: 'text', required: false, options: [] }]);
  };

  const updateField = (index: number, updates: Partial<SchemaField>) => {
    const newSchema = [...schema];
    const currentField = newSchema[index];
    if (currentField) {
      newSchema[index] = {
        ...currentField,
        ...updates,
        field: updates.field ?? currentField.field,
        label: updates.label ?? currentField.label,
        type: updates.type ?? currentField.type,
        required: updates.required ?? currentField.required,
        options: updates.options ?? currentField.options,
      };
    }
    setSchema(newSchema);
  };

  const removeField = (index: number) => {
    setSchema(schema.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedGame) return;
    setSaving(true);
    try {
      await gamesApi.updateSchema(selectedGame, schema);
      alert('Lưu schema thành công!');
    } catch (err) {
      alert('Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
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
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin/games" className="text-indigo-400 hover:text-indigo-300 text-sm mb-2 inline-block">
              ← Quay lại
            </Link>
            <h1 className="text-3xl font-bold text-white mb-2">Schema Builder</h1>
            <p className="text-white/50">Định nghĩa các trường thông tin cho từng game</p>
          </div>
        </div>

        <div className="bg-[#1e2330] border border-white/[0.08] rounded-xl p-6 mb-6">
          <label className="block text-white/70 text-sm mb-2">Chọn Game</label>
          <select
            value={selectedGame || ''}
            onChange={(e) => handleGameChange(Number(e.target.value))}
            className="w-full px-4 py-2 bg-[#151821] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-indigo-500"
          >
            {games.map((game) => (
              <option key={game.id} value={game.id}>{game.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-4 mb-6">
          {schema.map((field, index) => (
            <div key={index} className="bg-[#1e2330] border border-white/[0.08] rounded-xl p-4">
              <div className="flex items-start gap-4">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-white/50 text-xs mb-1">Field Name</label>
                    <input
                      type="text"
                      value={field.field}
                      onChange={(e) => updateField(index, { field: e.target.value })}
                      className="w-full px-3 py-2 bg-[#151821] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                      placeholder="rank"
                    />
                  </div>
                  <div>
                    <label className="block text-white/50 text-xs mb-1">Label</label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(index, { label: e.target.value })}
                      className="w-full px-3 py-2 bg-[#151821] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                      placeholder="Rank"
                    />
                  </div>
                  <div>
                    <label className="block text-white/50 text-xs mb-1">Type</label>
                    <select
                      value={field.type}
                      onChange={(e) => updateField(index, { type: e.target.value as SchemaField['type'], options: e.target.value === 'select' ? [] : undefined })}
                      className="w-full px-3 py-2 bg-[#151821] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="select">Select</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => removeField(index)}
                  className="p-2 text-red-400 hover:text-red-300"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              {field.type === 'select' && (
                <div className="mt-4 ml-4">
                  <label className="block text-white/50 text-xs mb-1">Options (comma separated)</label>
                  <input
                    type="text"
                    value={field.options?.join(', ') || ''}
                    onChange={(e) => updateField(index, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    className="w-full px-3 py-2 bg-[#151821] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Đồng, Bạc, Vàng, Kim Cương"
                  />
                </div>
              )}
              <div className="mt-4 ml-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => updateField(index, { required: e.target.checked })}
                  className="w-4 h-4 rounded border-white/[0.08] bg-[#151821]"
                  id={`required-${index}`}
                />
                <label htmlFor={`required-${index}`} className="text-white/50 text-sm">Bắt buộc</label>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button
            onClick={addField}
            className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg border border-white/[0.08] transition-colors"
          >
            + Thêm trường
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving ? 'Đang lưu...' : 'Lưu Schema'}
          </button>
        </div>
      </div>
    </div>
  );
}
