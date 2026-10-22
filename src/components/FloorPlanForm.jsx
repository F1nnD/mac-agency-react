import React, { useState } from 'react';
import { dataApi } from '../utils/apiClient';

export default function FloorPlanForm({ onSuccess, initialData = null }) {
  const [form, setForm] = useState({
    projectName: initialData?.projectName || '',
    width: initialData?.width || '',
    length: initialData?.length || '',
    address: initialData?.address || '',
    city: initialData?.city || 'TP.HCM',
    district: initialData?.district || '',
    siteStatus: initialData?.siteStatus || 'dat-trong',
    notes: initialData?.notes || ''
  });

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (files) => {
    const fileArray = Array.from(files).slice(0, 5);
    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.projectName || !form.width || !form.length || !form.address) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }

    const width = Number(form.width);
    const length = Number(form.length);
    if (width <= 0 || length <= 0) {
      setError('Kích thước phải lớn hơn 0.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...form,
        width,
        length,
        images
      };

      const result = initialData?._id
        ? await dataApi.updateFloorPlan(initialData._id, payload)
        : await dataApi.createFloorPlan(payload);

      if (onSuccess) onSuccess(result.data);
    } catch (err) {
      setError(err.message || 'Lỗi lưu mặt bằng.');
    } finally {
      setLoading(false);
    }
  };

  const totalArea = Number(form.width) * Number(form.length) || 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left">
      <div className="space-y-1">
        <span className="text-[10px] tracking-[0.3em] text-amber-400 font-mono uppercase block">
          Bước 1 / 3
        </span>
        <h3 className="text-lg font-bold text-white uppercase">Thông Tin Mặt Bằng</h3>
        <p className="text-xs text-neutral-500">Nhập thông tin thực tế của miếng đất</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
          Tên dự án *
        </label>
        <input
          type="text"
          value={form.projectName}
          onChange={(e) => handleChange('projectName', e.target.value)}
          placeholder="Ví dụ: Nhà phố Quận 5"
          required
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-400/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
            Ngang (m) *
          </label>
          <input
            type="number"
            value={form.width}
            onChange={(e) => handleChange('width', e.target.value)}
            placeholder="4"
            min="1"
            required
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-amber-400/50"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
            Dài (m) *
          </label>
          <input
            type="number"
            value={form.length}
            onChange={(e) => handleChange('length', e.target.value)}
            placeholder="20"
            min="1"
            required
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-amber-400/50"
          />
        </div>
      </div>

      {totalArea > 0 && (
        <div className="bg-amber-400/5 border border-amber-400/20 rounded-xl px-4 py-3 text-xs">
          <span className="text-neutral-400">Tổng diện tích: </span>
          <span className="text-amber-400 font-bold font-mono">{totalArea} m²</span>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
          Địa chỉ dự án *
        </label>
        <input
          type="text"
          value={form.address}
          onChange={(e) => handleChange('address', e.target.value)}
          placeholder="Số nhà, đường, phường"
          required
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-400/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
            Thành phố
          </label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => handleChange('city', e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-400/50"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
            Quận/Huyện
          </label>
          <input
            type="text"
            value={form.district}
            onChange={(e) => handleChange('district', e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-400/50"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
          Loại mặt bằng *
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleChange('siteStatus', 'dat-trong')}
            className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              form.siteStatus === 'dat-trong'
                ? 'bg-amber-400 text-black border border-amber-400'
                : 'bg-black/40 text-gray-400 border border-white/10 hover:border-white/30'
            }`}
          >
            Đất trống
          </button>
          <button
            type="button"
            onClick={() => handleChange('siteStatus', 'co-nha-tren-dat')}
            className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              form.siteStatus === 'co-nha-tren-dat'
                ? 'bg-amber-400 text-black border border-amber-400'
                : 'bg-black/40 text-gray-400 border border-white/10 hover:border-white/30'
            }`}
          >
            Có nhà trên đất
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
          Hình ảnh dự án (tối đa 5 ảnh)
        </label>
        <label className="block w-full bg-black/40 hover:bg-black/60 border border-dashed border-white/10 rounded-xl px-4 py-4 text-xs text-center text-gray-400 cursor-pointer transition-colors">
          {images.length === 0 ? 'Chọn ảnh từ máy...' : `Đã chọn ${images.length} ảnh`}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleImageUpload(e.target.files)}
          />
        </label>

        {images.length > 0 && (
          <div className="grid grid-cols-5 gap-2 mt-3">
            {images.map((img, idx) => (
              <div key={idx} className="relative group aspect-square bg-neutral-900 rounded-lg overflow-hidden border border-white/10">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 bg-red-900/80 hover:bg-red-800 text-white w-5 h-5 rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
          Ghi chú thêm
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows="3"
          placeholder="Ví dụ: Đất hướng Đông Nam, gần đường lớn..."
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-400/50"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-amber-400 hover:bg-amber-300 text-black py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer border-none outline-none"
      >
        {loading ? 'Đang lưu...' : 'Tiếp tục: Nhập Concept'}
      </button>
    </form>
  );
}