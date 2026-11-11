import React, { useCallback, useEffect, useState } from 'react';
import { studioApi } from '../utils/apiClient';
import { EstimateCard, AnalysisSections } from './RenderResult';
import ShareActions from './ShareActions';

const TIER_LABEL = { free: 'Free', pro: 'Pro', staff: 'Nhân viên', admin: 'Quản trị' };
const formatBillion = (n) => {
  const v = Number(n) || 0;
  return v >= 1_000_000_000 ? `${(v / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '')} tỷ` : `${Math.round(v / 1_000_000)} triệu`;
};
const fmtDate = (d) => new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
const idOf = (v) => (v && typeof v === 'object' ? v._id : v);

function Thumb({ src, alt }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-600 uppercase tracking-widest">Chưa tải được ảnh</div>;
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="w-full h-full object-cover" />;
}

function DetailModal({ id, onClose, onChanged, onRerender }) {
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    studioApi.getRender(id).then(r => alive && setItem(r.data)).catch(e => alive && setError(e.message || 'Không mở được bản này.'));
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const remove = async () => {
    if (!window.confirm('Xoá bản diễn hoạ này khỏi lịch sử? Lượt đã dùng sẽ không được hoàn lại.')) return;
    setBusy(true);
    try {
      await studioApi.deleteRender(id);
      onChanged();
      onClose();
    } catch (e) {
      setError(e.message || 'Không xoá được.');
      setBusy(false);
    }
  };

  const canRedo = item && item.source !== 'quick' && idOf(item.floorPlanId) && idOf(item.conceptId);
  const redo = async () => {
    if (!window.confirm('Diễn hoạ lại với cùng mặt bằng và concept sẽ dùng thêm 1 lượt. Tiếp tục?')) return;
    setBusy(true);
    setError('');
    try {
      const res = await studioApi.render({ floorPlanId: idOf(item.floorPlanId), conceptId: idOf(item.conceptId) });
      onRerender(res.data?.renderId);
    } catch (e) {
      setError(e.message || 'Không diễn hoạ lại được.');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 overflow-y-auto" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="min-h-full flex items-start justify-center p-3 md:p-8">
        <div className="relative w-full max-w-3xl bg-[#0b0b0b] border border-white/10 rounded-2xl p-4 md:p-8 space-y-6" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center text-white/60 hover:text-white bg-transparent border-none cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          {!item && !error && <div className="py-20 text-center text-xs text-white/30 uppercase tracking-widest">Đang mở...</div>}
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl mr-10">{error}</div>}

          {item && (
            <>
              <div className="pr-10 space-y-1">
                <span className="text-[10px] tracking-[0.3em] text-emerald-400 font-mono uppercase block">
                  {item.source === 'quick' ? 'Diễn hoạ nhanh' : 'AI Studio'} · {TIER_LABEL[item.tier] || 'Free'}
                </span>
                <h3 className="text-lg font-bold text-white uppercase break-words">{item.title || item.floorPlanId?.projectName || 'Bản diễn hoạ'}</h3>
                <p className="text-[11px] text-neutral-500">{fmtDate(item.createdAt)}</p>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-[4/3]">
                <Thumb src={item.imageUrl} alt={item.title} />
              </div>

              {item.analysis?.summary && (
                <p className="text-sm text-neutral-200 leading-relaxed border-l-2 border-amber-400 pl-4">{item.analysis.summary}</p>
              )}

              <EstimateCard estimate={item.estimate} />
              <AnalysisSections analysis={item.analysis} />
              <ShareActions renderId={item._id} title={item.title} />

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/5">
                <a href={item.imageUrl} target="_blank" rel="noreferrer" className="min-h-12 inline-flex items-center justify-center border border-white/10 text-[10px] font-bold uppercase tracking-widest px-5 rounded-xl hover:border-white transition-all">Mở ảnh gốc</a>
                {canRedo && (
                  <button disabled={busy} onClick={redo} className="min-h-12 border border-white/10 text-[10px] font-bold uppercase tracking-widest px-5 rounded-xl hover:border-white transition-all disabled:opacity-50">
                    {busy ? 'Đang xử lý...' : 'Diễn hoạ lại'}
                  </button>
                )}
                <button disabled={busy} onClick={remove} className="min-h-12 sm:ml-auto border border-red-900/40 text-red-400 text-[10px] font-bold uppercase tracking-widest px-5 rounded-xl hover:bg-red-900/30 transition-all disabled:opacity-50">
                  Xoá khỏi lịch sử
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RenderHistory({ onNew }) {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async (page = 1, append = false) => {
    setLoading(true);
    setError('');
    try {
      const res = await studioApi.renders({ page, limit: 12 });
      setItems(prev => (append ? [...prev, ...(res.data || [])] : (res.data || [])));
      setMeta(res.meta || { page, total: (res.data || []).length, hasMore: false });
    } catch (e) {
      setError(e.message || 'Không tải được lịch sử.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  return (
    <div className="space-y-6 text-left">
      <div className="flex items-end justify-between gap-3">
        <div>
          <span className="text-[10px] tracking-[0.3em] text-amber-400 font-mono uppercase block">Lịch sử</span>
          <h3 className="text-lg font-bold text-white uppercase">Các bản diễn hoạ của bạn</h3>
        </div>
        {meta.total > 0 && <span className="text-[11px] text-neutral-500">{meta.total} bản</span>}
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl">{error}</div>}

      {!loading && !error && items.length === 0 && (
        <div className="text-center py-14 border border-dashed border-white/10 rounded-2xl space-y-4">
          <p className="text-sm text-neutral-400">Bạn chưa có bản diễn hoạ nào.</p>
          <button onClick={onNew} className="min-h-12 bg-amber-400 hover:bg-amber-300 text-black px-8 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">Tạo bản đầu tiên</button>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(r => (
          <button
            key={r._id}
            onClick={() => setOpenId(r._id)}
            className="group text-left bg-zinc-900/30 border border-white/5 hover:border-white/20 rounded-2xl overflow-hidden transition-all cursor-pointer outline-none"
          >
            <div className="aspect-[4/3] bg-black/40 overflow-hidden">
              <Thumb src={r.imageUrl} alt={r.title} />
            </div>
            <div className="p-4 space-y-2">
              <p className="text-sm font-semibold text-white leading-snug break-words line-clamp-2">{r.title || r.floorPlanId?.projectName || 'Bản diễn hoạ'}</p>
              <div className="flex items-center justify-between gap-2 text-[10px] text-neutral-500">
                <span>{fmtDate(r.createdAt)}</span>
                <span className="uppercase tracking-wider">{r.source === 'quick' ? 'Nhanh' : 'Studio'}</span>
              </div>
              {r.estimate?.available && (
                <p className="text-xs text-amber-400 font-mono">{formatBillion(r.estimate.rangeLow)} – {formatBillion(r.estimate.rangeHigh)}</p>
              )}
            </div>
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-6 text-xs text-white/30 uppercase tracking-widest">Đang tải...</div>}
      {!loading && meta.hasMore && (
        <div className="text-center">
          <button onClick={() => load(meta.page + 1, true)} className="min-h-12 border border-white/10 text-[10px] font-bold uppercase tracking-widest px-8 rounded-xl hover:border-white transition-all">Xem thêm</button>
        </div>
      )}

      {openId && (
        <DetailModal
          id={openId}
          onClose={() => setOpenId(null)}
          onChanged={() => load(1)}
          onRerender={(newId) => { load(1); setOpenId(newId || null); }}
        />
      )}
    </div>
  );
}
