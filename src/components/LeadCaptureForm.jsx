import React, { useState } from 'react';
import { dataApi } from '../utils/apiClient';

export default function LeadCaptureForm({ floorPlanId, onSuccess, onBack }) {
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    interestedService: 'tron-goi',
    message: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.fullName || !form.phone) {
      setError('Vui lòng nhập họ tên và số điện thoại.');
      return;
    }

    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(form.phone.replace(/\s/g, ''))) {
      setError('Số điện thoại không hợp lệ (10-11 số).');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...form,
        floorPlanId
      };

      const result = await dataApi.createLead(payload);
      if (onSuccess) onSuccess(result.data);
    } catch (err) {
      setError(err.message || 'Lỗi gửi thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left">
      <div className="space-y-1">
        <span className="text-[10px] tracking-[0.3em] text-cyan-400 font-mono uppercase block">
          Bước 3 / 3
        </span>
        <h3 className="text-lg font-bold text-white uppercase">Thông Tin Liên Hệ</h3>
        <p className="text-xs text-neutral-500">
          Chúng tôi sẽ liên hệ tư vấn chi tiết cho bạn
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
          Họ và tên *
        </label>
        <input
          type="text"
          value={form.fullName}
          onChange={(e) => handleChange('fullName', e.target.value)}
          placeholder="Nguyễn Văn A"
          required
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-400/50"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
          Số điện thoại *
        </label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          placeholder="0901234567"
          required
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-cyan-400/50"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
          Email
        </label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="email@example.com"
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-400/50"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
          Dịch vụ quan tâm *
        </label>
        <select
          value={form.interestedService}
          onChange={(e) => handleChange('interestedService', e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-400/50 cursor-pointer"
        >
          <option value="thiet-ke" className="bg-neutral-900">Chỉ thiết kế</option>
          <option value="thi-cong" className="bg-neutral-900">Chỉ thi công</option>
          <option value="tron-goi" className="bg-neutral-900">Thiết kế + Thi công trọn gói</option>
          <option value="noi-that" className="bg-neutral-900">Nội thất</option>
          <option value="khac" className="bg-neutral-900">Khác</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
          Lời nhắn
        </label>
        <textarea
          value={form.message}
          onChange={(e) => handleChange('message', e.target.value)}
          rows="3"
          placeholder="Mô tả thêm về nhu cầu của bạn..."
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-400/50"
        />
      </div>

      <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl px-4 py-3 text-[10px] text-neutral-400 leading-relaxed">
        Bằng cách gửi thông tin, bạn đồng ý để MAC liên hệ tư vấn. Chúng tôi cam kết bảo mật thông tin cá nhân.
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
          className="flex-[2] bg-cyan-400 hover:bg-cyan-300 text-black py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer border-none outline-none"
        >
          {loading ? 'Đang gửi...' : 'Hoàn Tất & Render AI'}
        </button>
      </div>
    </form>
  );
}