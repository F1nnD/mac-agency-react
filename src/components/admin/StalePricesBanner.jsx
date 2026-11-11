import React, { useEffect, useState } from 'react';
import { crmApi } from '../../utils/apiCrm';

// Nhắc vật tư có định mức nhưng báo giá đã cũ (dự toán chỉ đáng tin khi giá còn mới)
export default function StalePricesBanner({ days = 120, refreshKey = 0 }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    crmApi.stalePrices(days)
      .then(res => { if (alive) setData(res.data); })
      .catch(() => { if (alive) setData(null); });
    return () => { alive = false; };
  }, [days, refreshKey]);

  if (!data || data.count === 0) return null;

  return (
    <div className="bg-amber-400/5 border border-amber-400/20 rounded-2xl">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full min-h-[44px] flex items-center justify-between gap-3 px-5 py-3 text-left"
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
          {data.count} vật tư cần cập nhật giá (quá {data.days} ngày hoặc chưa có báo giá)
        </span>
        <span className="text-amber-400 text-xs shrink-0">{open ? 'Thu gọn' : 'Xem'}</span>
      </button>
      {open && (
        <ul className="border-t border-amber-400/10 max-h-72 overflow-y-auto divide-y divide-white/5">
          {data.items.map(it => (
            <li key={it._id} className="px-5 py-3 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <span className="font-mono text-amber-400">{it.code}</span>
                <span className="text-white ml-2">{it.name}</span>
              </div>
              <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider ${it.neverQuoted ? 'text-red-400' : 'text-gray-400'}`}>
                {it.neverQuoted ? 'Chưa có giá' : `${it.daysSince} ngày trước`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
