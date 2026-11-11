import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { shareApi } from '../utils/apiShare';

const formatBillion = (n) => {
  const v = Number(n) || 0;
  return v >= 1_000_000_000 ? `${(v / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '')} tỷ` : `${Math.round(v / 1_000_000)} triệu`;
};

// Trang công khai, chỉ đọc, cho liên kết chia sẻ
export default function SharedRender() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => { meta.remove(); };
  }, []);

  useEffect(() => {
    let alive = true;
    shareApi.getShared(token)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e.status === 404 ? 'Liên kết không tồn tại hoặc đã bị thu hồi.' : 'Không tải được nội dung, vui lòng thử lại sau.'); });
    return () => { alive = false; };
  }, [token]);

  const est = data?.estimate;
  const a = data?.analysis || {};

  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <p className="text-[10px] uppercase tracking-widest text-amber-400 font-bold">MAC Concept · Diễn hoạ bằng AI</p>

        {error && <p role="alert" className="rounded-xl border border-white/10 p-4 text-sm text-neutral-300">{error}</p>}
        {!error && !data && <p className="text-sm text-neutral-400">Đang tải...</p>}

        {data && (
          <>
            <h1 className="text-2xl font-bold">{data.title || 'Diễn hoạ không gian'}</h1>
            {data.imageUrl && (
              <img src={data.imageUrl} alt={data.title || 'Ảnh phối cảnh'} className="w-full rounded-2xl border border-white/10 bg-black/40" loading="lazy" />
            )}
            <p className="text-xs text-neutral-500">
              {[data.style, data.area ? `${data.area} m²` : '', data.createdAt ? new Date(data.createdAt).toLocaleDateString('vi-VN') : ''].filter(Boolean).join(' · ')}
            </p>
            {data.summary && <p className="text-sm text-neutral-300 leading-relaxed">{data.summary}</p>}

            {est?.available && (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Khoảng giá sơ bộ</p>
                <p className="text-xl font-bold text-amber-400">{formatBillion(est.rangeLow)} – {formatBillion(est.rangeHigh)}</p>
                <p className="text-[11px] text-neutral-500">Sơ bộ, không phải báo giá chính thức.</p>
              </div>
            )}

            {[['Ngôn ngữ thiết kế', a.designLanguage], ['Vật liệu đề xuất', a.materialPalette]].map(([t, list]) =>
              list?.length ? (
                <section key={t} className="space-y-2">
                  <h2 className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{t}</h2>
                  <ul className="space-y-2">
                    {list.map((x, i) => (
                      <li key={i} className="flex gap-3 text-xs text-neutral-300 leading-relaxed">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 shrink-0" /><span>{x}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null
            )}

            <Link to="/register" className="flex items-center justify-center min-h-[48px] rounded-xl bg-amber-400 text-black text-xs font-bold uppercase tracking-wider hover:bg-amber-300">
              Tạo diễn hoạ cho không gian của bạn
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
