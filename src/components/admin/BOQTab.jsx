import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { dataApi } from '../../utils/apiClient';
import AdminTable, { TableSkeleton, EmptyState, ErrorState, useToast } from './AdminTable';

const STATUS = {
  draft: { label: 'Nháp AI', cls: 'text-gray-300 border-white/10 bg-white/5' },
  reviewing: { label: 'Đang xem xét', cls: 'text-amber-400 border-amber-400/30 bg-amber-400/10' },
  approved: { label: 'Đã duyệt', cls: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  rejected: { label: 'Từ chối', cls: 'text-red-400 border-red-500/30 bg-red-500/10' }
};
const CONFIDENCE = { cao: 'Cao', 'trung-binh': 'Trung bình', thap: 'Thấp' };
const SOURCE = { 'ai-generated': 'AI tạo', manual: 'Nhập tay', 'staff-edited': 'Nhân viên đã chỉnh' };
const vnd = n => `${Math.round(Number(n) || 0).toLocaleString('vi-VN')} đ`;
const numCls = 'w-32 min-h-11 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-sm md:text-xs text-white font-mono text-right focus:outline-none focus:border-amber-400/50';

// Cùng công thức với backend (calcTotals) để xem trước tổng khi đang sửa
function previewTotals(items, contingencyPct, vatPct) {
  const subtotal = items.reduce((s, it) => s + Math.round((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)), 0);
  const contingency = Math.round(subtotal * ((Number(contingencyPct) || 0) / 100));
  const vat = Math.round((subtotal + contingency) * ((Number(vatPct) || 0) / 100));
  return { subtotal, contingency, vat, total: subtotal + contingency + vat };
}

export default function BOQTab() {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [items, setItems] = useState([]);
  const [contingencyPct, setContingencyPct] = useState(5);
  const [vatPct, setVatPct] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast, node: toastNode } = useToast();

  const fetchList = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await dataApi.getBOQs(filter ? `?status=${filter}` : '');
      setList(res.data || []);
    } catch (err) {
      setError(err.message || 'Không tải được danh sách dự toán.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const open = async (id) => {
    setError('');
    try {
      const res = await dataApi.getBOQ(id);
      const b = res.data;
      setDetail(b);
      setItems((b.items || []).map(i => ({ ...i })));
      setContingencyPct(b.contingencyPct ?? 5);
      setVatPct(b.vatPct ?? 0);
      setDirty(false);
    } catch (err) {
      setError(err.message || 'Không mở được dự toán.');
    }
  };

  const editItem = (idx, field, value) => {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
    setDirty(true);
  };

  const removeItem = (idx) => {
    if (!window.confirm('Xoá hạng mục này khỏi dự toán? (Chỉ có hiệu lực sau khi bấm Lưu)')) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await dataApi.updateBOQ(detail._id, {
        items: items.map(i => ({
          materialId: i.materialId,
          materialName: i.materialName,
          unit: i.unit,
          quantity: Number(i.quantity) || 0,
          unitPrice: Number(i.unitPrice) || 0,
          notes: i.notes
        })),
        contingencyPct: Number(contingencyPct) || 0,
        vatPct: Number(vatPct) || 0
      });
      setDetail(res.data);
      setItems((res.data.items || []).map(i => ({ ...i })));
      setDirty(false);
      fetchList();
      toast('Đã lưu chỉnh sửa dự toán.');
    } catch (err) {
      setError(err.message || 'Không lưu được dự toán.');
      toast(err.message || 'Không lưu được dự toán.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status) => {
    if (dirty && !window.confirm('Bạn có chỉnh sửa chưa lưu. Đổi trạng thái sẽ bỏ các chỉnh sửa này. Tiếp tục?')) return;
    if (status === 'approved' && !window.confirm('Duyệt dự toán này? Sau khi duyệt, dự toán bị khoá chỉnh sửa (chỉ mở lại được bằng nút "Mở lại để chỉnh").')) return;
    if (status === 'rejected' && !window.confirm('Từ chối dự toán này?')) return;
    setBusy(true);
    setError('');
    try {
      await dataApi.setBOQStatus(detail._id, status);
      await open(detail._id);
      fetchList();
      toast(`Đã chuyển trạng thái: ${STATUS[status]?.label || status}.`);
    } catch (err) {
      setError(err.message || 'Không đổi được trạng thái.');
      toast(err.message || 'Không đổi được trạng thái.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const totals = previewTotals(items, contingencyPct, vatPct);
  const locked = detail?.status === 'approved';

  const closeDetail = () => {
    if (dirty && !window.confirm('Bạn có chỉnh sửa chưa lưu. Quay lại danh sách sẽ bỏ các chỉnh sửa này. Tiếp tục?')) return;
    setDetail(null);
    setDirty(false);
  };

  const itemColumns = [
    {
      key: 'name', label: 'Vật tư', primary: true,
      render: it => (
        <div>
          <span className="font-semibold">{it.materialName}</span>
          {it.notes && <p className="text-[10px] text-gray-500 font-normal mt-0.5">{it.notes}</p>}
        </div>
      )
    },
    { key: 'unit', label: 'ĐVT', render: it => <span className="font-mono text-gray-400">{it.unit}</span> },
    {
      key: 'quantity', label: 'Khối lượng', align: 'right',
      render: (it, idx) => (locked ? <span className="font-mono">{it.quantity}</span> : (
        <input type="number" inputMode="decimal" min="0" step="any" aria-label={`Khối lượng ${it.materialName}`} value={it.quantity} onChange={e => editItem(idx, 'quantity', e.target.value)} className={numCls} />
      ))
    },
    {
      key: 'unitPrice', label: 'Đơn giá', align: 'right',
      render: (it, idx) => (locked ? <span className="font-mono">{Math.round(it.unitPrice).toLocaleString('vi-VN')}</span> : (
        <input type="number" inputMode="decimal" min="0" step="any" aria-label={`Đơn giá ${it.materialName}`} value={it.unitPrice} onChange={e => editItem(idx, 'unitPrice', e.target.value)} className={numCls} />
      ))
    },
    {
      key: 'amount', label: 'Thành tiền', align: 'right',
      render: it => <span className="font-mono text-emerald-400">{Math.round((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)).toLocaleString('vi-VN')}</span>
    }
  ];

  const stickyBar = detail && createPortal(
    <div className="xl:hidden fixed inset-x-0 bottom-0 z-30 bg-black border-t border-white/10 px-4 py-3 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Tổng cộng{dirty ? ' (chưa lưu)' : ''}</p>
        <p className="text-base font-mono font-bold text-emerald-400 truncate">{vnd(totals.total)}</p>
      </div>
      {!locked && (
        <button type="button" onClick={save} disabled={busy || !dirty} className="min-h-11 shrink-0 bg-white text-black text-[10px] font-bold uppercase tracking-widest px-5 rounded-xl disabled:opacity-40">
          {busy ? 'Đang lưu...' : dirty ? 'Lưu' : 'Đã lưu'}
        </button>
      )}
    </div>,
    document.body
  );

  const btn = 'min-h-11 text-[10px] font-bold uppercase tracking-widest px-6 rounded-xl transition-all disabled:opacity-40';

  return (
    <div className={`tab-content-anim space-y-6 md:space-y-8 w-full ${detail ? 'pb-24 xl:pb-0' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase font-semibold">Cost Estimation</span>
          <h1 className="text-2xl font-light text-white uppercase mt-1">Dự Toán Sơ Bộ (BOQ)</h1>
          <p className="text-[11px] text-gray-500 mt-2 max-w-xl">
            AI tạo bản nháp từ mặt bằng, concept, định mức và giá thị trường. Nhân viên kiểm tra, chỉnh khối lượng/đơn giá rồi duyệt.
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <select value={filter} onChange={e => setFilter(e.target.value)} className="flex-1 sm:flex-none min-h-11 bg-black/40 border border-white/10 rounded-xl px-4 text-xs text-white focus:outline-none cursor-pointer">
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={fetchList} className="min-h-11 border border-white/10 bg-black/20 text-[10px] font-bold uppercase tracking-widest px-5 rounded-xl hover:border-white transition-all cursor-pointer">Tải lại</button>
        </div>
      </div>

      <ErrorState message={error} onRetry={detail ? undefined : fetchList} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8">
        {/* DANH SÁCH (ẩn trên điện thoại khi đang xem chi tiết) */}
        <div className={`xl:col-span-1 space-y-3 ${detail ? 'hidden xl:block' : ''}`}>
          {loading ? (
            <TableSkeleton rows={3} />
          ) : list.length === 0 ? (
            <EmptyState>Chưa có dự toán. Dự toán xuất hiện khi khách dùng AI Studio và kho vật tư đã có định mức + báo giá.</EmptyState>
          ) : (
            list.map(b => (
              <button
                key={b._id}
                onClick={() => open(b._id)}
                className={`w-full text-left bg-zinc-900/20 border p-4 rounded-2xl transition-all cursor-pointer ${detail?._id === b._id ? 'border-amber-400/40' : 'border-white/5 hover:border-white/20'}`}
              >
                <div className="flex justify-between items-start gap-2">
                  <p className="text-xs font-bold text-white break-words min-w-0">{b.floorPlanId?.projectName || b.title}</p>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border shrink-0 ${STATUS[b.status]?.cls || ''}`}>
                    {STATUS[b.status]?.label || b.status}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  {b.floorPlanId?.totalArea ? `${b.floorPlanId.totalArea} m² · ` : ''}{new Date(b.createdAt).toLocaleDateString('vi-VN')}
                </p>
                <p className="text-sm font-mono text-emerald-400 mt-2">{vnd(b.total)}</p>
              </button>
            ))
          )}
        </div>

        {/* CHI TIẾT */}
        <div className={`xl:col-span-2 min-w-0 ${detail ? '' : 'hidden xl:block'}`}>
          {!detail ? (
            <div className="text-center py-24 border border-dashed border-white/10 rounded-2xl text-white/30 text-sm">Chọn một dự toán để xem chi tiết</div>
          ) : (
            <div className="bg-zinc-900/20 border border-white/5 rounded-2xl p-4 md:p-6 space-y-6">
              <button type="button" onClick={closeDetail} className="xl:hidden min-h-11 -mt-1 text-[10px] font-bold uppercase tracking-widest text-amber-400 cursor-pointer">
                ← Danh sách dự toán
              </button>

              <div className="flex flex-wrap justify-between items-start gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white break-words">{detail.title}</h3>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {SOURCE[detail.source] || detail.source}
                    {detail.confidence && ` · Độ tin cậy: ${CONFIDENCE[detail.confidence] || detail.confidence}`}
                    {detail.approvedBy?.username && ` · Duyệt bởi ${detail.approvedBy.username}`}
                  </p>
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${STATUS[detail.status]?.cls || ''}`}>
                  {STATUS[detail.status]?.label || detail.status}
                </span>
              </div>

              {detail.rangeLow > 0 && (
                <div className="bg-black/30 border border-white/5 rounded-xl p-4 text-xs">
                  <span className="text-gray-500">Khoảng giá AI ước lượng: </span>
                  <span className="text-amber-400 font-mono">{vnd(detail.rangeLow)} – {vnd(detail.rangeHigh)}</span>
                </div>
              )}

              <AdminTable
                columns={itemColumns}
                rows={items}
                rowKey={(it, idx) => it._id || idx}
                emptyText="Dự toán chưa có hạng mục nào"
                actionsLabel=""
                actions={locked ? undefined : (it, idx) => (
                  <button type="button" onClick={() => removeItem(idx)} className="min-h-11 min-w-11 px-3 border border-red-900/40 bg-red-950/20 text-red-400 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-red-900 hover:text-white cursor-pointer" aria-label={`Xoá hạng mục ${it.materialName}`}>
                    <span className="md:hidden">Xoá hạng mục</span><span className="hidden md:inline text-base leading-none">×</span>
                  </button>
                )}
              />

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3 text-xs">
                  <label className="flex items-center justify-between gap-3 text-gray-400">
                    Dự phòng (%)
                    <input type="number" inputMode="decimal" min="0" step="any" disabled={locked} value={contingencyPct} onChange={e => { setContingencyPct(e.target.value); setDirty(true); }} className={numCls} />
                  </label>
                  <label className="flex items-center justify-between gap-3 text-gray-400">
                    VAT (%)
                    <input type="number" inputMode="decimal" min="0" step="any" disabled={locked} value={vatPct} onChange={e => { setVatPct(e.target.value); setDirty(true); }} className={numCls} />
                  </label>
                </div>
                <div className="space-y-2 text-xs bg-black/30 border border-white/5 rounded-xl p-4">
                  <div className="flex justify-between"><span className="text-gray-500">Cộng hạng mục</span><span className="font-mono text-white">{vnd(totals.subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Dự phòng</span><span className="font-mono text-white">{vnd(totals.contingency)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">VAT</span><span className="font-mono text-white">{vnd(totals.vat)}</span></div>
                  <div className="flex justify-between border-t border-white/10 pt-2"><span className="text-gray-300 font-bold">Tổng cộng</span><span className="font-mono text-emerald-400 font-bold">{vnd(totals.total)}</span></div>
                </div>
              </div>

              {detail.assumptions?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">Giả định của AI</p>
                  <ul className="space-y-1">
                    {detail.assumptions.map((a, i) => <li key={i} className="text-[11px] text-gray-500">• {a}</li>)}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-3 pt-4 border-t border-white/5">
                {!locked && (
                  <button onClick={save} disabled={busy || !dirty} className={`${btn} bg-white text-black hover:bg-neutral-200`}>
                    {busy ? 'Đang lưu...' : dirty ? 'Lưu chỉnh sửa' : 'Đã lưu'}
                  </button>
                )}
                {detail.status !== 'reviewing' && !locked && (
                  <button onClick={() => setStatus('reviewing')} disabled={busy} className={`${btn} border border-amber-400/30 text-amber-400 hover:bg-amber-400/10`}>Chuyển xem xét</button>
                )}
                {!locked && (
                  <button onClick={() => setStatus('approved')} disabled={busy || dirty} title={dirty ? 'Hãy lưu chỉnh sửa trước' : ''} className={`${btn} bg-emerald-400 text-black hover:bg-emerald-300`}>
                    {dirty ? 'Duyệt (lưu trước)' : 'Duyệt dự toán'}
                  </button>
                )}
                {!locked && detail.status !== 'rejected' && (
                  <button onClick={() => setStatus('rejected')} disabled={busy} className={`${btn} border border-red-500/30 text-red-400 hover:bg-red-500/10`}>Từ chối</button>
                )}
                {locked && (
                  <button onClick={() => setStatus('reviewing')} disabled={busy} className={`${btn} border border-white/10 text-gray-300 hover:border-white`}>Mở lại để chỉnh</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {stickyBar}
      {toastNode}
    </div>
  );
}
