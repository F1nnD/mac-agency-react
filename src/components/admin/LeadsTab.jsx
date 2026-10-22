import React, { useEffect, useState } from 'react';
import { leadsApi } from '../../utils/apiClient';
import LeadDetailModal from './LeadDetailModal';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'new', label: 'Mới' },
  { value: 'contacted', label: 'Đã liên hệ' },
  { value: 'qualified', label: 'Tiềm năng' },
  { value: 'converted', label: 'Đã chốt' },
  { value: 'lost', label: 'Mất' }
];

const STATUS_LABEL = {
  new: 'Mới',
  contacted: 'Đã liên hệ',
  qualified: 'Tiềm năng',
  converted: 'Đã chốt',
  lost: 'Mất'
};

const STATUS_COLOR = {
  new: 'text-amber-400 border-amber-400/40 bg-amber-400/10',
  contacted: 'text-cyan-400 border-cyan-400/40 bg-cyan-400/10',
  qualified: 'text-emerald-400 border-emerald-400/40 bg-emerald-400/10',
  converted: 'text-green-400 border-green-400/40 bg-green-400/10',
  lost: 'text-red-400 border-red-400/40 bg-red-400/10'
};

const SERVICE_LABEL = {
  'thiet-ke': 'Chỉ thiết kế',
  'thi-cong': 'Chỉ thi công',
  'tron-goi': 'Trọn gói',
  'noi-that': 'Nội thất',
  'khac': 'Khác'
};

export default function LeadsTab() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);

  const fetchLeads = async () => {
    setLoading(true);
    setError('');
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await leadsApi.getAll(params);
      setLeads(res.data || []);
    } catch (err) {
      setError(err.message || 'Lỗi tải danh sách leads.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter]);

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await leadsApi.update(leadId, { status: newStatus });
      await fetchLeads();
    } catch (err) {
      alert(err.message || 'Lỗi cập nhật status.');
    }
  };

  // Thống kê nhanh
  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    converted: leads.filter(l => l.status === 'converted').length
  };

  // Filter theo search
  const filteredLeads = leads.filter(l => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (l.fullName || '').toLowerCase().includes(term) ||
      (l.phone || '').includes(term) ||
      (l.email || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="tab-content-anim space-y-8 w-full">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-white/5 pb-5">
        <div>
          <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase font-semibold">
            Lead Management
          </span>
          <h1 className="text-2xl font-light text-white uppercase mt-1">
            Quản lý khách hàng tiềm năng
          </h1>
        </div>
        <button
          onClick={fetchLeads}
          className="border border-white/10 bg-black/20 text-[10px] font-bold uppercase tracking-widest px-5 py-3 rounded-xl hover:border-white transition-all cursor-pointer"
        >
          Tải lại
        </button>
      </div>

      {/* THỐNG KÊ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/20 border border-white/5 p-5 rounded-2xl">
          <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Tổng</p>
          <p className="text-2xl font-bold text-white font-mono mt-2">{stats.total}</p>
        </div>
        <div className="bg-amber-400/5 border border-amber-400/20 p-5 rounded-2xl">
          <p className="text-[10px] uppercase tracking-widest text-amber-400/60 font-bold">Mới</p>
          <p className="text-2xl font-bold text-amber-400 font-mono mt-2">{stats.new}</p>
        </div>
        <div className="bg-cyan-400/5 border border-cyan-400/20 p-5 rounded-2xl">
          <p className="text-[10px] uppercase tracking-widest text-cyan-400/60 font-bold">Đã liên hệ</p>
          <p className="text-2xl font-bold text-cyan-400 font-mono mt-2">{stats.contacted}</p>
        </div>
        <div className="bg-green-400/5 border border-green-400/20 p-5 rounded-2xl">
          <p className="text-[10px] uppercase tracking-widest text-green-400/60 font-bold">Đã chốt</p>
          <p className="text-2xl font-bold text-green-400 font-mono mt-2">{stats.converted}</p>
        </div>
      </div>

      {/* FILTER */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên, SĐT, email..."
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white/30"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                statusFilter === opt.value
                  ? 'bg-white text-black'
                  : 'bg-black/40 text-gray-400 border border-white/10 hover:border-white/30'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* LOADING */}
      {loading ? (
        <div className="text-center py-20 text-white/30 text-xs tracking-widest uppercase">
          Đang tải danh sách...
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900/20 border border-dashed border-white/10 rounded-2xl">
          <p className="text-white/40 text-sm">Chưa có lead nào</p>
          <p className="text-white/20 text-xs mt-2">Khách hàng điền form AI Studio sẽ xuất hiện ở đây</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLeads.map(lead => (
            <div
              key={lead._id}
              className="bg-zinc-900/20 border border-white/5 p-5 rounded-2xl hover:border-white/20 transition-all"
            >
              {/* HEADER */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white uppercase truncate">
                    {lead.fullName}
                  </h3>
                  <p className="text-[10px] text-gray-500 font-mono mt-1">
                    {lead.phone}
                  </p>
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border shrink-0 ${STATUS_COLOR[lead.status] || ''}`}>
                  {STATUS_LABEL[lead.status] || lead.status}
                </span>
              </div>

              {/* INFO */}
              <div className="space-y-2 text-[11px] border-t border-white/5 pt-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Dịch vụ:</span>
                  <span className="text-white">{SERVICE_LABEL[lead.interestedService] || lead.interestedService}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Điểm quan tâm:</span>
                  <span className="text-amber-400 font-bold font-mono">
                    {lead.engagement?.score || 0}/100
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ngày tạo:</span>
                  <span className="text-white font-mono">
                    {new Date(lead.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex gap-2 pt-4 mt-4 border-t border-white/5">
                <button
                  onClick={() => setSelectedLead(lead)}
                  className="flex-1 border border-white/10 bg-black/20 text-[10px] font-bold uppercase py-2 rounded-lg hover:bg-white hover:text-black transition-all"
                >
                  Xem chi tiết
                </button>
                <a
                  href={`tel:${lead.phone}`}
                  className="border border-cyan-500/40 bg-cyan-500/10 text-[10px] font-bold uppercase text-cyan-400 px-3 py-2 rounded-lg hover:bg-cyan-500 hover:text-black transition-all"
                >
                  Gọi
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={fetchLeads}
        />
      )}
    </div>
  );
}