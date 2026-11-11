import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { leadsApi, getCurrentUser } from '../../utils/apiClient';
import { crmApi, zaloUrl, toLocalInput, fromLocalInput, formatDateTimeVN, isOverdue } from '../../utils/apiCrm';

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

export default function LeadDetailModal({ lead: leadProp, onClose, onUpdate }) {
  const [lead, setLead] = useState(leadProp);
  const [status, setStatus] = useState(leadProp.status);
  const [staff, setStaff] = useState([]);
  const [followAt, setFollowAt] = useState(toLocalInput(leadProp.followUpAt));
  const [followNote, setFollowNote] = useState(leadProp.followUpNote || '');
  const [callNote, setCallNote] = useState('');
  const [crmBusy, setCrmBusy] = useState(false);
  const [crmMsg, setCrmMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const me = getCurrentUser();
  const ownerId = String(lead.assignedTo?._id || lead.assignedTo || '');
  const canEdit = me?.role === 'admin' || !ownerId || ownerId === String(me?.userId || '');

  useEffect(() => {
    crmApi.staff().then(res => setStaff(res.data || [])).catch(() => setStaff([]));
  }, []);

  // Gộp dữ liệu lead mới từ API CRM vào bản đang xem
  const applyLead = (data) => {
    if (!data) return;
    setLead(prev => ({ ...prev, ...data, aiSummary: prev.aiSummary }));
    if (data.status) setStatus(data.status);
    setFollowAt(toLocalInput(data.followUpAt));
    setFollowNote(data.followUpNote || '');
    if (onUpdate) onUpdate();
  };

  const runCrm = async (fn, okMsg) => {
    setCrmBusy(true); setCrmMsg(''); setError('');
    try {
      const res = await fn();
      applyLead(res.data);
      if (okMsg) setCrmMsg(okMsg);
    } catch (err) {
      setError(err.message || 'Thao tác không thành công.');
    } finally {
      setCrmBusy(false);
    }
  };

  const handleAssign = (userId) => runCrm(() => crmApi.assign(lead._id, userId), 'Đã cập nhật người phụ trách.');
  const handleSaveFollowUp = () => runCrm(() => crmApi.followUp(lead._id, fromLocalInput(followAt), followNote), followAt ? 'Đã đặt lịch gọi lại.' : 'Đã xoá lịch gọi lại.');
  const handleCalled = async () => {
    await runCrm(
      () => crmApi.contact(lead._id, { note: callNote.trim() || undefined, followUpAt: fromLocalInput(followAt) && new Date(fromLocalInput(followAt)) > new Date() ? fromLocalInput(followAt) : undefined }),
      'Đã ghi nhận cuộc gọi.'
    );
    setCallNote('');
  };

  const handleCopyScript = async () => {
    const text = aiSummary?.openingScript;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* bỏ qua */ }
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [aiSummary, setAiSummary] = useState(lead.aiSummary || null);
  const [summarizing, setSummarizing] = useState(false);

  const handleSummarize = async () => {
    setSummarizing(true);
    setError('');
    try {
      const res = await leadsApi.summarize(lead._id);
      setAiSummary(res.data);
    } catch (err) {
      setError(err.message || 'Không tạo được tóm tắt.');
    } finally {
      setSummarizing(false);
    }
  };

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
      const res = await leadsApi.addNote(lead._id, note.trim());
      if (res?.data?.salesNotes) setLead(prev => ({ ...prev, salesNotes: res.data.salesNotes }));
      setNote('');
      if (onUpdate) onUpdate();
      alert('Đã thêm ghi chú.');
    } catch (err) {
      setError(err.message || 'Lỗi thêm ghi chú.');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/80 z-50 md:flex md:items-center md:justify-center md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-950 md:border border-white/10 md:rounded-2xl md:max-w-2xl w-full h-full md:h-auto md:max-h-[90vh] overflow-y-auto"
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
            aria-label="Đóng"
            className="text-white/40 hover:text-white w-11 h-11 shrink-0 flex items-center justify-center rounded-lg border border-white/10 hover:border-white/30 transition-all text-lg"
          >
            ×
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-6 text-left">

          {/* LIÊN LẠC NHANH */}
          <div className="grid grid-cols-3 gap-2">
            <a href={`tel:${lead.phone}`} className="min-h-[44px] flex items-center justify-center border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-cyan-500 hover:text-black transition-all">Gọi</a>
            <a href={zaloUrl(lead.phone)} target="_blank" rel="noopener noreferrer" className="min-h-[44px] flex items-center justify-center border border-blue-400/40 bg-blue-400/10 text-blue-400 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-blue-400 hover:text-black transition-all">Zalo</a>
            <button
              onClick={handleCopyScript}
              disabled={!aiSummary?.openingScript}
              title={aiSummary?.openingScript ? 'Sao chép lời mở đầu cuộc gọi' : 'Cần tạo tóm tắt AI trước'}
              className="min-h-[44px] border border-amber-400/40 bg-amber-400/10 text-amber-400 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-amber-400 hover:text-black transition-all disabled:opacity-40"
            >
              {copied ? 'Đã chép' : 'Chép lời mở'}
            </button>
          </div>

          {/* PHỤ TRÁCH & GỌI LẠI */}
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3">Phụ trách và lịch gọi lại</h3>
            <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-4 space-y-3">
              {!canEdit && (
                <p className="text-[11px] text-amber-400">Lead này do {lead.assignedTo?.fullName || lead.assignedTo?.username || 'đồng nghiệp'} phụ trách; bạn chỉ xem.</p>
              )}
              <label className="block">
                <span className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Người phụ trách</span>
                <select
                  value={ownerId}
                  disabled={!canEdit || crmBusy}
                  onChange={e => handleAssign(e.target.value)}
                  className="mt-1 w-full min-h-[44px] bg-black/40 border border-white/10 rounded-xl px-4 text-xs text-white focus:outline-none focus:border-white/30 disabled:opacity-50"
                >
                  <option value="">Chưa giao</option>
                  {staff.map(u => <option key={u.id} value={u.id}>{u.name}{u.role === 'admin' ? ' (admin)' : ''}</option>)}
                  {ownerId && !staff.some(u => u.id === ownerId) && <option value={ownerId}>{lead.assignedTo?.fullName || lead.assignedTo?.username || 'Nhân viên khác'}</option>}
                </select>
              </label>

              <label className="block">
                <span className="text-[9px] uppercase tracking-widest text-white/30 font-bold">
                  Ngày giờ gọi lại (giờ VN){isOverdue(lead) ? ' · ĐÃ QUÁ HẠN' : ''}
                </span>
                <input
                  type="datetime-local"
                  value={followAt}
                  disabled={!canEdit || crmBusy}
                  onChange={e => setFollowAt(e.target.value)}
                  className={`mt-1 w-full min-h-[44px] bg-black/40 border rounded-xl px-4 text-xs text-white focus:outline-none disabled:opacity-50 ${isOverdue(lead) ? 'border-red-400/50' : 'border-white/10 focus:border-white/30'}`}
                />
              </label>
              <input
                type="text"
                value={followNote}
                disabled={!canEdit || crmBusy}
                onChange={e => setFollowNote(e.target.value)}
                maxLength={500}
                placeholder="Việc cần làm khi gọi lại (không bắt buộc)"
                className="w-full min-h-[44px] bg-black/40 border border-white/10 rounded-xl px-4 text-xs text-white focus:outline-none focus:border-white/30 disabled:opacity-50"
              />
              <button
                onClick={handleSaveFollowUp}
                disabled={!canEdit || crmBusy}
                className="w-full min-h-[44px] border border-white/10 bg-black/20 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:border-white transition-all disabled:opacity-40"
              >
                {followAt ? 'Lưu lịch gọi lại' : 'Xoá lịch gọi lại'}
              </button>

              <div className="border-t border-white/5 pt-3 space-y-2">
                <input
                  type="text"
                  value={callNote}
                  disabled={!canEdit || crmBusy}
                  onChange={e => setCallNote(e.target.value)}
                  placeholder="Ghi chú nhanh sau cuộc gọi (không bắt buộc)"
                  className="w-full min-h-[44px] bg-black/40 border border-white/10 rounded-xl px-4 text-xs text-white focus:outline-none focus:border-emerald-400/50 disabled:opacity-50"
                />
                <button
                  onClick={handleCalled}
                  disabled={!canEdit || crmBusy}
                  className="w-full min-h-[44px] bg-emerald-400 hover:bg-emerald-300 text-black text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-40"
                >
                  {crmBusy ? 'Đang lưu...' : 'Đã gọi'}
                </button>
                <p className="text-[10px] text-gray-600">
                  {lead.lastContactAt ? `Liên hệ gần nhất: ${formatDateTimeVN(lead.lastContactAt)}. ` : 'Chưa ghi nhận cuộc gọi nào. '}
                  Bấm "Đã gọi" sẽ xoá lịch gọi lại đã tới hạn; muốn hẹn tiếp, chọn giờ mới ở trên rồi bấm "Đã gọi".
                </p>
              </div>
              {crmMsg && <p className="text-[11px] text-emerald-400">{crmMsg}</p>}
              {error && <p className="text-[11px] text-red-400">{error}</p>}
            </div>
          </div>

          {/* TÓM TẮT AI CHO TELESALE */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Tóm tắt AI cho telesale</h3>
              <button
                onClick={handleSummarize}
                disabled={summarizing}
                className="text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-400/30 px-3 py-1.5 rounded-lg hover:bg-amber-400/10 transition-all disabled:opacity-50"
              >
                {summarizing ? 'Đang tạo...' : aiSummary ? 'Làm mới' : 'Tạo tóm tắt'}
              </button>
            </div>
            {aiSummary ? (
              <div className="bg-amber-400/5 border border-amber-400/20 rounded-xl p-4 space-y-3 text-xs">
                <p className="text-neutral-200 leading-relaxed">{aiSummary.summary}</p>
                {aiSummary.talkingPoints?.length > 0 && (
                  <ul className="space-y-1.5">
                    {aiSummary.talkingPoints.map((t, i) => (
                      <li key={i} className="text-neutral-400 leading-relaxed">• {t}</li>
                    ))}
                  </ul>
                )}
                {aiSummary.openingScript && (
                  <div className="bg-black/40 border border-white/5 rounded-lg p-3">
                    <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold mb-1">Gợi ý mở đầu cuộc gọi</p>
                    <p className="text-neutral-300 italic leading-relaxed">"{aiSummary.openingScript}"</p>
                  </div>
                )}
                {aiSummary.nextAction && (
                  <p className="text-emerald-400 font-semibold">Việc tiếp theo: {aiSummary.nextAction}</p>
                )}
                <p className="text-[9px] text-gray-600">
                  {aiSummary.source === 'gemini' ? 'Tạo bởi AI' : 'Tạo theo quy tắc từ dữ liệu khách'}
                  {aiSummary.generatedAt && ` · ${new Date(aiSummary.generatedAt).toLocaleString('vi-VN')}`}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-gray-600">Chưa có tóm tắt. Nhấn "Tạo tóm tắt" để AI gom thông tin mặt bằng, concept, ngân sách của khách.</p>
            )}
          </div>

          {/* LIÊN HỆ */}
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3">
              Thông tin liên hệ
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-500">Số điện thoại:</span>
                <a href={`tel:${lead.phone}`} className="text-cyan-400 font-mono hover:text-cyan-300 py-1">
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
                  className={`min-h-[44px] px-4 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
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
    </div>,
    document.body
  );
}
