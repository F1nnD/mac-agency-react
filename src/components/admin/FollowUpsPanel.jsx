import React, { useEffect, useState } from 'react';
import { crmApi, formatDateTimeVN } from '../../utils/apiCrm';

// Việc cần gọi: quá hạn + trong hôm nay của riêng mình
export default function FollowUpsPanel({ refreshKey = 0, onOpenLead }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([crmApi.followUps('mine', 'overdue'), crmApi.followUps('mine', 'today')])
      .then(([a, b]) => {
        if (!alive) return;
        const map = new Map();
        [...(a.data || []), ...(b.data || [])].forEach(l => map.set(l._id, l));
        setItems([...map.values()].sort((x, y) => new Date(x.followUpAt) - new Date(y.followUpAt)));
      })
      .catch(() => alive && setItems([]))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [refreshKey]);

  if (loading || items.length === 0) return null;
  const now = Date.now();
  const overdueCount = items.filter(l => new Date(l.followUpAt).getTime() < now).length;

  return (
    <div className="bg-red-500/5 border border-red-500/20 rounded-2xl">
      <button onClick={() => setOpen(v => !v)} aria-expanded={open} className="w-full min-h-[44px] flex items-center justify-between gap-3 px-5 py-3 text-left">
        <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">
          Cần gọi hôm nay: {items.length} khách{overdueCount ? ` (${overdueCount} quá hạn)` : ''}
        </span>
        <span className="text-red-400 text-xs shrink-0">{open ? 'Thu gọn' : 'Xem'}</span>
      </button>
      {open && (
        <ul className="border-t border-red-500/10 divide-y divide-white/5">
          {items.map(l => {
            const late = new Date(l.followUpAt).getTime() < now;
            return (
              <li key={l._id} className="px-5 py-3 flex items-center justify-between gap-3">
                <button onClick={() => onOpenLead && onOpenLead(l)} className="min-h-[44px] text-left min-w-0 flex-1">
                  <span className="block text-xs font-bold text-white uppercase truncate">{l.fullName}</span>
                  <span className={`block text-[10px] font-mono mt-0.5 ${late ? 'text-red-400' : 'text-amber-400'}`}>
                    {late ? 'Quá hạn · ' : ''}{formatDateTimeVN(l.followUpAt)}
                  </span>
                  {l.followUpNote && <span className="block text-[11px] text-gray-500 truncate">{l.followUpNote}</span>}
                </button>
                <a href={`tel:${l.phone}`} className="min-h-[44px] min-w-[64px] flex items-center justify-center border border-cyan-500/40 bg-cyan-500/10 text-[10px] font-bold uppercase text-cyan-400 px-3 rounded-lg shrink-0">Gọi</a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
