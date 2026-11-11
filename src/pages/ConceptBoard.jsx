import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { shareApi } from '../utils/apiShare';

const CONTACT = {
  phone: '0375075975',
  email: 'maconcept.asia@gmail.com',
  address: '44 Nguyễn Văn Dung, Phường 6, Gò Vấp, TP.HCM'
};

const formatBillion = (n) => {
  const v = Number(n) || 0;
  return v >= 1_000_000_000 ? `${(v / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '')} tỷ` : `${Math.round(v / 1_000_000)} triệu`;
};

const isHex = (c) => typeof c === 'string' && /^#?[0-9a-f]{3,8}$/i.test(c.trim());
const hexOf = (c) => (c.trim().startsWith('#') ? c.trim() : `#${c.trim()}`);

const CSS = `
.board { --b-bg:#111; --b-fg:#f5f5f5; --b-muted:#a3a3a3; --b-line:rgba(255,255,255,.12); --b-accent:#fbbf24; }
.board-paper { background:var(--b-bg); color:var(--b-fg); }
.board-muted { color:var(--b-muted); }
.board-line { border-color:var(--b-line); }
.board-accent { color:var(--b-accent); }
@page { size: A4; margin: 12mm; }
@media print {
  html, body { background:#fff !important; }
  .no-print { display:none !important; }
  .board-wrap { background:#fff !important; padding:0 !important; min-height:0 !important; }
  .board { --b-bg:#fff; --b-fg:#111; --b-muted:#555; --b-line:#ccc; --b-accent:#9a6700; }
  .board-paper { box-shadow:none !important; border:none !important; padding:0 !important; max-width:none !important; }
  .board-avoid { break-inside:avoid; page-break-inside:avoid; }
  .board img { max-height:130mm; object-fit:cover; }
  * { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
}
`;

function List({ title, items }) {
  if (!items?.length) return null;
  return (
    <section className="board-avoid space-y-2">
      <h2 className="text-[10px] uppercase tracking-widest font-bold board-muted">{title}</h2>
      <ul className="space-y-1.5">
        {items.map((t, i) => <li key={i} className="text-xs leading-relaxed">• {t}</li>)}
      </ul>
    </section>
  );
}

// Concept board khổ A4 để in / lưu PDF (chủ sở hữu, cần đăng nhập)
export default function ConceptBoard() {
  const { id } = useParams();
  const [r, setR] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    shareApi.getRender(id)
      .then((d) => { if (alive) setR(d); })
      .catch((e) => { if (alive) setError(e.status === 403 ? 'Bạn không có quyền xem bản này.' : e.status === 404 ? 'Không tìm thấy bản diễn hoạ.' : 'Không tải được concept board.'); });
    return () => { alive = false; };
  }, [id]);

  const a = r?.analysis || {};
  const est = r?.estimate;
  const concept = r?.conceptId && typeof r.conceptId === 'object' ? r.conceptId : {};
  const plan = r?.floorPlanId && typeof r.floorPlanId === 'object' ? r.floorPlanId : {};
  const colors = (concept.mainColors || []).filter(isHex);
  const materials = concept.mainMaterials?.length ? concept.mainMaterials : a.materialPalette;

  return (
    <main className="board-wrap min-h-screen bg-[#0b0b0b] px-4 py-6">
      <style>{CSS}</style>
      <div className="board max-w-3xl mx-auto">
        <div className="no-print flex flex-col sm:flex-row gap-2 mb-4">
          <button type="button" onClick={() => window.print()} disabled={!r}
                  className="min-h-[44px] px-5 rounded-xl bg-amber-400 text-black text-xs font-bold uppercase tracking-wider hover:bg-amber-300 disabled:opacity-50">
            Lưu PDF
          </button>
          <Link to="/ai-studio" className="min-h-[44px] px-5 rounded-xl border border-white/15 text-white/80 text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center">
            Quay lại AI Studio
          </Link>
        </div>
        <p className="no-print text-[11px] text-neutral-500 mb-4">
          Bấm "Lưu PDF", khi hộp thoại in hiện ra hãy chọn máy in "Lưu dưới dạng PDF" (Save as PDF), khổ A4.
        </p>

        {error && <p role="alert" className="no-print text-sm text-neutral-300">{error}</p>}
        {!error && !r && <p className="no-print text-sm text-neutral-400">Đang tải...</p>}

        {r && (
          <article className="board-paper rounded-2xl border board-line p-5 sm:p-8 space-y-6">
            <header className="flex items-start justify-between gap-4 border-b board-line pb-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold board-accent">MAC Concept · Concept board</p>
                <h1 className="text-xl sm:text-2xl font-bold mt-1">{r.title || 'Diễn hoạ không gian'}</h1>
                <p className="text-xs board-muted mt-1">
                  {[concept.style, concept.spaceType, plan.totalArea ? `${plan.totalArea} m²` : '', r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN') : ''].filter(Boolean).join(' · ')}
                </p>
              </div>
            </header>

            {r.imageUrl && (
              <img src={r.imageUrl} alt={r.title || 'Ảnh phối cảnh'} className="w-full rounded-xl border board-line" />
            )}

            {a.summary && (
              <section className="board-avoid space-y-2">
                <h2 className="text-[10px] uppercase tracking-widest font-bold board-muted">Tóm tắt hướng thiết kế</h2>
                <p className="text-sm leading-relaxed">{a.summary}</p>
              </section>
            )}

            {est?.available && (
              <section className="board-avoid space-y-1 rounded-xl border board-line p-4">
                <h2 className="text-[10px] uppercase tracking-widest font-bold board-muted">Khoảng giá sơ bộ</h2>
                <p className="text-xl font-bold board-accent">{formatBillion(est.rangeLow)} – {formatBillion(est.rangeHigh)}</p>
                <p className="text-[11px] board-muted">Sơ bộ, không phải báo giá chính thức. Giá chính xác được chốt sau khi MAC khảo sát hiện trạng.</p>
              </section>
            )}

            <div className="grid sm:grid-cols-2 gap-6">
              {colors.length > 0 && (
                <section className="board-avoid space-y-2">
                  <h2 className="text-[10px] uppercase tracking-widest font-bold board-muted">Bảng màu</h2>
                  <div className="flex flex-wrap gap-3">
                    {colors.map((c, i) => (
                      <div key={i} className="text-center">
                        <span className="block w-12 h-12 rounded-lg border board-line" style={{ background: hexOf(c) }} />
                        <span className="block text-[10px] board-muted mt-1">{hexOf(c).toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              <List title="Vật liệu" items={materials} />
            </div>

            <List title="Ngôn ngữ thiết kế" items={a.designLanguage} />
            <List title="Gợi ý bố trí" items={a.layoutSuggestions} />
            {a.lightingStrategy && (
              <section className="board-avoid space-y-1">
                <h2 className="text-[10px] uppercase tracking-widest font-bold board-muted">Ánh sáng</h2>
                <p className="text-xs leading-relaxed">{a.lightingStrategy}</p>
              </section>
            )}

            <footer className="board-avoid border-t board-line pt-4 text-xs space-y-0.5">
              <p className="font-bold">MAC Concept</p>
              <p>Điện thoại: {CONTACT.phone}</p>
              <p>Email: {CONTACT.email}</p>
              <p>Địa chỉ: {CONTACT.address}</p>
              <p className="board-muted pt-2 text-[10px]">Hình ảnh do AI tạo, mang tính minh hoạ ý tưởng; thiết kế và giá thi công thực tế sẽ được xác nhận sau khảo sát.</p>
            </footer>
          </article>
        )}
      </div>
    </main>
  );
}
