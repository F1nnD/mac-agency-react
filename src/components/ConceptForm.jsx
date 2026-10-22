import React, { useState } from 'react';
import { dataApi } from '../utils/apiClient';

const STYLE_OPTIONS = [
  'Industrial',
  'Minimalism',
  'Vintage',
  'Retro',
  'Japandi',
  'Modern Classic',
  'Tropical Eco',
  'Scandinavian',
  'Bohemian',
  'Other'
];

const MATERIAL_OPTIONS = [
  'Bê tông',
  'Gỗ tự nhiên',
  'Kim loại',
  'Kính',
  'Đá tự nhiên',
  'Gạch',
  'Thép',
  'Nhựa',
  'Vải',
  'Da'
];

const SPACE_TYPE_OPTIONS = [
  'Nhà Ở',
  'Nhà Phố',
  'Biệt Thự',
  'Quán Kafe',
  'Nhà Hàng',
  'Bar',
  'Văn Phòng',
  'Khách Sạn',
  'Khác'
];

export default function ConceptForm({ floorPlanId, onSuccess, onBack }) {
  const [form, setForm] = useState({
    style: 'Japandi',
    description: '',
    spaceType: 'Nhà Phố',
    estimatedBudget: ''
  });

  const [mainColors, setMainColors] = useState(['#FFFFFF', '#8B7355']);
  const [mainMaterials, setMainMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const addColor = () => {
    setMainColors(prev => [...prev, '#000000']);
  };

  const updateColor = (index, value) => {
    setMainColors(prev => prev.map((c, i) => i === index ? value : c));
  };

  const removeColor = (index) => {
    setMainColors(prev => prev.filter((_, i) => i !== index));
  };

  const toggleMaterial = (mat) => {
    setMainMaterials(prev =>
      prev.includes(mat) ? prev.filter(m => m !== mat) : [...prev, mat]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.style || mainMaterials.length === 0) {
      setError('Vui lòng chọn style và ít nhất 1 chất liệu.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        floorPlanId,
        style: form.style,
        mainColors,
        mainMaterials,
        description: form.description,
        spaceType: form.spaceType,
        estimatedBudget: Number(form.estimatedBudget) || 0
      };

      const result = await dataApi.createConcept(payload);
      if (onSuccess) onSuccess(result.data);
    } catch (err) {
      setError(err.message || 'Lỗi lưu concept.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left">
      <div className="space-y-1">
        <span className="text-[10px] tracking-[0.3em] text-emerald-400 font-mono uppercase block">
          Bước 2 / 3
        </span>
        <h3 className="text-lg font-bold text-white uppercase">Thông Tin Concept</h3>
        <p className="text-xs text-neutral-500">Ý tưởng thiết kế của bạn</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
          Loại công trình *
        </label>
        <select
          value={form.spaceType}
          onChange={(e) => handleChange('spaceType', e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-400/50 cursor-pointer"
        >
          {SPACE_TYPE_OPTIONS.map(opt => (
            <option key={opt} value={opt} className="bg-neutral-900">{opt}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
          Style Concept *
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {STYLE_OPTIONS.map(style => (
            <button
              key={style}
              type="button"
              onClick={() => handleChange('style', style)}
              className={`px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                form.style === style
                  ? 'bg-emerald-400 text-black'
                  : 'bg-black/40 text-gray-400 border border-white/10 hover:border-white/30'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
          Màu sắc chủ đạo
        </label>
        <div className="flex flex-wrap gap-3 items-center">
          {mainColors.map((color, idx) => (
            <div key={idx} className="relative group">
              <input
                type="color"
                value={color}
                onChange={(e) => updateColor(idx, e.target.value)}
                className="w-12 h-12 rounded-xl border border-white/20 cursor-pointer bg-transparent"
              />
              {mainColors.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeColor(idx)}
                  className="absolute -top-2 -right-2 bg-red-600 text-white w-5 h-5 rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  x
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addColor}
            className="w-12 h-12 rounded-xl border border-dashed border-white/20 text-white/40 text-xl hover:border-white/40 hover:text-white/60 transition-all"
          >
            +
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
          Chất liệu chủ đạo * (chọn ít nhất 1)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {MATERIAL_OPTIONS.map(mat => (
            <button
              key={mat}
              type="button"
              onClick={() => toggleMaterial(mat)}
              className={`px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                mainMaterials.includes(mat)
                  ? 'bg-emerald-400 text-black'
                  : 'bg-black/40 text-gray-400 border border-white/10 hover:border-white/30'
              }`}
            >
              {mat}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
          Mô tả sơ bộ ý tưởng
        </label>
        <textarea
          value={form.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows="4"
          placeholder="Ví dụ: Nhà phố 3 tầng, tầng 1 làm khu vực kinh doanh, tầng 2-3 làm phòng ngủ, có sân thượng..."
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-400/50"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
          Ngân sách dự kiến (VNĐ)
        </label>
        <input
          type="number"
          value={form.estimatedBudget}
          onChange={(e) => handleChange('estimatedBudget', e.target.value)}
          placeholder="850000000"
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-400/50"
        />
        {form.estimatedBudget > 0 && (
          <p className="text-[10px] text-neutral-500">
            Tương đương: {Number(form.estimatedBudget).toLocaleString('vi-VN')} đ
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 bg-black/40 hover:bg-black/60 text-white/60 hover:text-white py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border border-white/10"
        >
          Quay lại
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-[2] bg-emerald-400 hover:bg-emerald-300 text-black py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer border-none outline-none"
        >
          {loading ? 'Đang lưu...' : 'Tiếp tục: Nhập Liên Hệ'}
        </button>
      </div>
    </form>
  );
}