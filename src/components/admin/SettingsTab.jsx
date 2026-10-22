import React, { useEffect, useState } from 'react';
import { api } from '../../utils/apiClient';

const DEFAULT_SETTINGS = {
  companyName: 'MAC CONCEPT',
  slogan: 'More Artistic Concept',
  hotline: '0375075975',
  email: 'maconcept.asia@gmail.com',
  address: '44 Nguyễn Văn Dung, Phường 6, Gò Vấp, TP. Hồ Chí Minh',
  zaloLink: 'https://zalo.me/0375075975',
  facebookLink: 'https://facebook.com'
};

export default function SettingsTab() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.get('/api/settings');
        // Hợp nhất dữ liệu từ DB với default (phòng trường hợp DB trống)
        setSettings(prev => ({ ...prev, ...res.data }));
      } catch (err) {
        console.error('Lỗi tải cài đặt:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await api.put('/api/settings', settings);
      setMessage({ type: 'success', text: 'Đã lưu cấu hình thành công!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Lỗi lưu cấu hình.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-white/30 text-xs uppercase">Đang tải cấu hình...</div>;
  }

  return (
    <div className="tab-content-anim space-y-8 w-full">
      <div className="flex items-center justify-between border-b border-white/5 pb-5">
        <div>
          <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase font-semibold">
            System Settings
          </span>
          <h1 className="text-2xl font-light text-white uppercase mt-1">
            Cài đặt chung
          </h1>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-xs font-bold ${
          message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* THÔNG TIN CƠ BẢN */}
        <div className="bg-zinc-900/20 border border-white/5 p-6 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white border-b border-white/5 pb-2">Thông tin thương hiệu</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Tên công ty</label>
              <input type="text" value={settings.companyName} onChange={e => handleChange('companyName', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white/30" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Slogan</label>
              <input type="text" value={settings.slogan} onChange={e => handleChange('slogan', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white/30" />
            </div>
          </div>
        </div>

        {/* LIÊN HỆ */}
        <div className="bg-zinc-900/20 border border-white/5 p-6 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white border-b border-white/5 pb-2">Thông tin liên hệ</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Hotline / Số điện thoại</label>
              <input type="text" value={settings.hotline} onChange={e => handleChange('hotline', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white/30 font-mono" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Email</label>
              <input type="email" value={settings.email} onChange={e => handleChange('email', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white/30 font-mono" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Địa chỉ</label>
              <input type="text" value={settings.address} onChange={e => handleChange('address', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white/30" />
            </div>
          </div>
        </div>

        {/* MẠNG XÃ HỘI */}
        <div className="bg-zinc-900/20 border border-white/5 p-6 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white border-b border-white/5 pb-2">Mạng xã hội</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Link Zalo</label>
              <input type="url" value={settings.zaloLink} onChange={e => handleChange('zaloLink', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white/30" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Link Facebook</label>
              <input type="url" value={settings.facebookLink} onChange={e => handleChange('facebookLink', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white/30" />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-white/5">
          <button type="submit" disabled={saving} className="bg-white text-black px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-neutral-200 transition-all disabled:opacity-50">
            {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </div>

      </form>
    </div>
  );
}