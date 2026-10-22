import React, { useState } from 'react';
import { leadsApi } from '../../utils/apiClient';

const STATUS_OPTIONS = [
  { value: 'new', label: 'Mới' },
  { value: 'contacted', label: 'Đã liên hệ' },
  { value: 'qualified', label: 'Tiềm năng' },
  { value: 'converted', label: 'Đã chốt' },
  { value: 'lost', label: 'Mất' }
];

const SERVICE_LABEL = {
  'thiet-ke': 'Chỉ thiết kế',
  'thi-cong': 'Chỉ thi công',
  'tron-goi': 'Trọn gói',
  'noi-that': 'Nội thất',
  'khac': 'Khác'
};

export default function LeadDetailModal({ lead, onClose, onUpdate }) {
  const [status, setStatus] = useState(lead.status);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleStatusChange = async (newStatus) => {
    try {
      await leadsApi.update(lead._id, { status: newStatus });
      setStatus(newStatus);
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.message || 'Lỗi cập nhật status.');
    }
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    setError('');
    try {
      await leadsApi.addNote(lead._id, note.trim());
      setNote('');
      if (onUpdate) onUpdate();
      alert('Đã thêm ghi chú.');
    } catch (err) {
      setError(err.message || 'Lỗi thêm ghi chú.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-950 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="sticky top-0 bg-zinc-950 border-b border-white/5 p-6 flex justify-between items-start z-10">
          <div>
            <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase font-semibold">
              Chi tiết Lead
            </span>
            <h2 className="text-xl font-bold text-white uppercase mt-1">
              {lead.fullName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 hover:border-white/30 transition-all text-lg"
          >
            ×
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-6 text-left">

          {/* LIÊN HỆ */}
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3">
              Thông tin liên hệ
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-500">Số điện thoại:</span>
                <a href={`tel:${lead.phone}`} className="text-cyan-400 font-mono hover:text-cyan-300">
                  {lead.phone}
                </a>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-500">Email:</span>
                <span className="text-white">{lead.email || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-500">Dịch vụ quan tâm:</span>
                <span className="text-white">{SERVICE_LABEL[lead.interestedService] || lead.interestedService}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Ngày tạo:</span>
                <span className="text-white font-mono">
                  {new Date(lead.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>
            </div>
          </div>

          {/* LỜI NHẮN */}
          {lead.message && (
            <div>
              <h3 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3">
                Lời nhắn
              </h3>
              <p className="text-xs text-neutral-400 bg-black/40 border border-white/5 rounded-xl p-4 leading-relaxed">
                "{lead.message}"
              </p>
            </div>
          )}

          {/* ĐIỂM QUAN TÂM */}
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3">
              Mức độ quan tâm
            </h3>
            <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Điểm tổng:</span>
                <span className="text-2xl font-bold text-amber-400 font-mono">
                  {lead.engagement?.score || 0}/100
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-[10px]">
                <div className="text-center bg-black/40 rounded-lg p-3">
                  <p className="text-white/40 uppercase tracking-wider mb-1">Login</p>
                  <p className="text-white font-bold font-mono text-base">{lead.engagement?.loginCount || 0}</p>
                </div>
                <div className="text-center bg-black/40 rounded-lg p-3">
                  <p className="text-white/40 uppercase tracking-wider mb-1">Render</p>
                  <p className="text-white font-bold font-mono text-base">{lead.engagement?.renderCount || 0}</p>
                </div>
                <div className="text-center bg-black/40 rounded-lg p-3">
                  <p className="text-white/40 uppercase tracking-wider mb-1">Lần cuối</p>
                  <p className="text-white font-bold font-mono text-[10px]">
                    {lead.engagement?.lastActiveAt
                      ? new Date(lead.engagement.lastActiveAt).toLocaleDateString('vi-VN')
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* TRẠNG THÁI */}
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3">
              Trạng thái chăm sóc
            </h3>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleStatusChange(opt.value)}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                    status === opt.value
                      ? 'bg-emerald-400 text-black'
                      : 'bg-black/40 text-gray-400 border border-white/10 hover:border-white/30'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* GHI CHÚ */}
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3">
              Ghi chú của telesale
            </h3>

            {lead.salesNotes && lead.salesNotes.length > 0 && (
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {lead.salesNotes.map((n, i) => (
                  <div key={i} className="bg-black/40 border border-white/5 rounded-xl p-3">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <span className="text-[10px] text-emerald-400 font-bold uppercase">
                        {n.author}
                      </span>
                      <span className="text-[9px] text-gray-600 font-mono">
                        {new Date(n.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300">{n.note}</p>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] px-3 py-2 rounded-lg mb-3">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows="3"
                placeholder="Nhập ghi chú về cuộc gọi, nhu cầu của khách..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-400/50"
              />
              <button
                onClick={handleAddNote}
                disabled={saving || !note.trim()}
                className="w-full bg-emerald-400 hover:bg-emerald-300 text-black py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : 'Thêm ghi chú'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}