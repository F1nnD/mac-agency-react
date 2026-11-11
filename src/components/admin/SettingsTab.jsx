import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../utils/apiClient';
import { TableSkeleton, ErrorState, useToast } from './AdminTable';

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
  const [loadError, setLoadError] = useState('');
  const { toast, node: toastNode } = useToast();

  async function loadSettings() {
    setLoading(true);
    setLoadError('');
    try {
      const res = await api.get('/api/settings');
      // Hợp nhất dữ liệu từ DB với default (phòng trường hợp DB trống)
      setSettings(prev => ({ ...prev, ...res.data }));
    } catch (err) {
      console.error('Lỗi tải cài đặt:', err);
      setLoadError(err.message || 'Không tải được cấu hình. Đang hiển thị giá trị mặc định.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.put('/api/settings', settings);
      toast('Đã lưu cấu hình thành công!');
    } catch (err) {
      toast(err.message || 'Lỗi lưu cấu hình.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="w-full"><TableSkeleton rows={3} /></div>;
  }

  return (
    <div className="tab-content-anim space-y-6 md:space-y-8 w-full pb-24 md:pb-0">
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

      <ErrorState message={loadError} onRetry={loadSettings} />

      <form id="settings-form" onSubmit={handleSave} className="space-y-6">
        
        {/* THÔNG TIN CƠ BẢN */}
        <div className="bg-zinc-900/20 border border-white/5 p-4 md:p-6 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white border-b border-white/5 pb-2">Thông tin thương hiệu</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Tên công ty</label>
              <input type="text" value={settings.companyName} onChange={e => handleChange('companyName', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 min-h-11 py-2 text-base md:text-xs text-white focus:outline-none focus:border-white/30" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Slogan</label>
              <input type="text" value={settings.slogan} onChange={e => handleChange('slogan', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 min-h-11 py-2 text-base md:text-xs text-white focus:outline-none focus:border-white/30" />
            </div>
          </div>
        </div>

        {/* LIÊN HỆ */}
        <div className="bg-zinc-900/20 border border-white/5 p-4 md:p-6 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white border-b border-white/5 pb-2">Thông tin liên hệ</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Hotline / Số điện thoại</label>
              <input type="text" value={settings.hotline} onChange={e => handleChange('hotline', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 min-h-11 py-2 text-base md:text-xs text-white focus:outline-none focus:border-white/30 font-mono" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Email</label>
              <input type="email" value={settings.email} onChange={e => handleChange('email', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 min-h-11 py-2 text-base md:text-xs text-white focus:outline-none focus:border-white/30 font-mono" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Địa chỉ</label>
              <input type="text" value={settings.address} onChange={e => handleChange('address', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 min-h-11 py-2 text-base md:text-xs text-white focus:outline-none focus:border-white/30" />
            </div>
          </div>
        </div>

        {/* MẠNG XÃ HỘI */}
        <div className="bg-zinc-900/20 border border-white/5 p-4 md:p-6 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white border-b border-white/5 pb-2">Mạng xã hội</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Link Zalo</label>
              <input type="url" value={settings.zaloLink} onChange={e => handleChange('zaloLink', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 min-h-11 py-2 text-base md:text-xs text-white focus:outline-none focus:border-white/30" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Link Facebook</label>
              <input type="url" value={settings.facebookLink} onChange={e => handleChange('facebookLink', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 min-h-11 py-2 text-base md:text-xs text-white focus:outline-none focus:border-white/30" />
            </div>
          </div>
        </div>

        {/* Nút lưu: dính đáy màn hình trên điện thoại, nằm cuối form từ md */}
        {createPortal(
          <div className="md:hidden fixed inset-x-0 bottom-0 z-30 bg-black border-t border-white/10 p-3">
            <button type="submit" form="settings-form" disabled={saving} className="w-full min-h-11 bg-amber-400 text-black rounded-xl text-xs font-bold uppercase tracking-widest disabled:opacity-50 cursor-pointer">
              {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </div>,
          document.body
        )}
        <div className="hidden md:flex justify-end pt-4 border-t border-white/5">
          <button type="submit" disabled={saving} className="min-h-11 bg-white text-black px-8 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-neutral-200 transition-all disabled:opacity-50 cursor-pointer">
            {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </div>

      </form>
      {toastNode}
    </div>
  );
}