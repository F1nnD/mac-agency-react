import React, { useEffect, useRef, useState } from 'react';
import ShareActions from './ShareActions';
import gsap from 'gsap';
import { studioApi } from '../utils/apiClient';
import { prefersReducedMotion } from '../utils/motion';
import AIProgress from './AIProgress';
import BeforeAfter from './BeforeAfter';
import CountUp from './CountUp';

const BUDGET_TEXT = {
  'trong-ngan-sach': { label: 'Nằm trong ngân sách bạn nêu', cls: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  'sat-ngan-sach': { label: 'Sát ngân sách bạn nêu', cls: 'text-amber-400 border-amber-400/30 bg-amber-400/10' },
  'vuot-ngan-sach': { label: 'Có thể vượt ngân sách bạn nêu', cls: 'text-red-400 border-red-500/30 bg-red-500/10' }
};

const CONFIDENCE_LABEL = { cao: 'Độ tin cậy cao', 'trung-binh': 'Độ tin cậy trung bình', thap: 'Độ tin cậy thấp' };

const formatVnd = (n) => `${Math.round(Number(n) || 0).toLocaleString('vi-VN')} đ`;
// Tách số tiền thành giá trị + đơn vị (tỷ / triệu) để chạy số
const splitMoney = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000_000) {
    const value = Math.round(v / 10_000_000) / 100;
    return { value, unit: 'tỷ', dec: (String(value).split('.')[1] || '').length };
  }
  return { value: Math.round(v / 1_000_000), unit: 'triệu', dec: 0 };
};

function Money({ n }) {
  const { value, unit, dec } = splitMoney(n);
  return (
    <CountUp
      value={value}
      suffix={` ${unit}`}
      format={(x) => x.toLocaleString('vi-VN', { minimumFractionDigits: dec, maximumFractionDigits: dec })}
    />
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h4 className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{title}</h4>
      {children}
    </div>
  );
}

function BulletList({ items }) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-2">
      {items.map((t, i) => (
        <li key={i} className="flex gap-3 text-xs text-neutral-300 leading-relaxed">
          <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 shrink-0" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}


export function EstimateCard({ estimate }) {
  const budget = BUDGET_TEXT[estimate?.budgetStatus];
  return (
    <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 md:p-6 space-y-4">
      <h4 className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Dự toán sơ bộ</h4>
      {estimate?.available ? (
        <>
          <div>
            <p className="text-2xl md:text-3xl font-bold text-white font-mono">
              <Money n={estimate.rangeLow} /> – <Money n={estimate.rangeHigh} />
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">
              Khoảng {formatVnd(estimate.perM2?.low)} – {formatVnd(estimate.perM2?.high)} / m² · {CONFIDENCE_LABEL[estimate.confidence] || ''}
            </p>
          </div>
          {budget && (
            <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border ${budget.cls}`}>
              {budget.label}
            </span>
          )}
          <ul className="space-y-1.5">
            {estimate.assumptions?.map((a, i) => (
              <li key={i} className="text-[11px] text-neutral-500 leading-relaxed">• {a}</li>
            ))}
          </ul>
          <p className="text-[11px] text-neutral-400 leading-relaxed">{estimate.disclaimer}</p>
        </>
      ) : (
        <p className="text-xs text-neutral-400">{estimate?.message || 'Đội MAC sẽ gửi dự toán chi tiết sau khi trao đổi với bạn.'}</p>
      )}
    </div>
  );
}

// Phần phân tích. Khoá của tầng Pro trở lên chỉ hiện khi máy chủ có trả về (khách free không có)
export function AnalysisSections({ analysis }) {
  if (!analysis) return null;
  const internal = ['constructionNotes', 'costDrivers', 'salesTalkingPoints', 'qaChecklist'].some(k => analysis[k]?.length);
  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 gap-8">
        <Section title="Nhận xét mặt bằng"><BulletList items={analysis.siteObservations} /></Section>
        <Section title="Gợi ý bố trí công năng"><BulletList items={analysis.layoutSuggestions} /></Section>
        <Section title="Ngôn ngữ thiết kế"><BulletList items={analysis.designLanguage} /></Section>
        <Section title="Vật liệu đề xuất">
          <div className="flex flex-wrap gap-2">
            {analysis.materialPalette?.map((m, i) => (
              <span key={i} className="text-[11px] text-neutral-300 border border-white/10 bg-black/30 px-3 py-1.5 rounded-lg">{m}</span>
            ))}
          </div>
        </Section>
      </div>

      {analysis.lightingStrategy && (
        <Section title="Chiến lược ánh sáng">
          <p className="text-xs text-neutral-300 leading-relaxed">{analysis.lightingStrategy}</p>
        </Section>
      )}

      {(analysis.zoning?.length > 0 || analysis.circulation || analysis.budgetStructure?.length > 0 || analysis.phasing?.length > 0 || analysis.alternatives?.length > 0) && (
        <div className="border border-amber-400/20 bg-amber-400/[0.03] rounded-2xl p-5 md:p-6 space-y-6">
          <span className="text-[10px] tracking-[0.3em] text-amber-400 font-mono uppercase block">Phân tích chuyên sâu (Pro)</span>
          <div className="grid md:grid-cols-2 gap-8">
            {analysis.zoning?.length > 0 && <Section title="Phân vùng công năng"><BulletList items={analysis.zoning} /></Section>}
            {analysis.budgetStructure?.length > 0 && <Section title="Cơ cấu chi phí tham khảo"><BulletList items={analysis.budgetStructure} /></Section>}
            {analysis.phasing?.length > 0 && <Section title="Các giai đoạn triển khai"><BulletList items={analysis.phasing} /></Section>}
            {analysis.alternatives?.length > 0 && <Section title="Phương án thay thế"><BulletList items={analysis.alternatives} /></Section>}
          </div>
          {analysis.circulation && (
            <Section title="Lưu tuyến"><p className="text-xs text-neutral-300 leading-relaxed">{analysis.circulation}</p></Section>
          )}
        </div>
      )}

      {analysis.risks?.length > 0 && (
        <Section title="Cần khảo sát thêm"><BulletList items={analysis.risks} /></Section>
      )}

      {internal && (
        <div className="border border-red-400/20 bg-red-400/[0.03] rounded-2xl p-5 md:p-6 space-y-6">
          <span className="text-[10px] tracking-[0.3em] text-red-300 font-mono uppercase block">Nội bộ MAC — không hiển thị cho khách</span>
          <div className="grid md:grid-cols-2 gap-8">
            {analysis.constructionNotes?.length > 0 && <Section title="Lưu ý thi công"><BulletList items={analysis.constructionNotes} /></Section>}
            {analysis.costDrivers?.length > 0 && <Section title="Yếu tố chi phí"><BulletList items={analysis.costDrivers} /></Section>}
            {analysis.salesTalkingPoints?.length > 0 && <Section title="Ý khai thác khi gọi khách"><BulletList items={analysis.salesTalkingPoints} /></Section>}
            {analysis.qaChecklist?.length > 0 && <Section title="Checklist soát xét"><BulletList items={analysis.qaChecklist} /></Section>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RenderResult({ floorPlan, concept, onDone }) {
  const [state, setState] = useState('loading'); // loading | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [imgState, setImgState] = useState('loading'); // loading | ok | failed
  const [imgKey, setImgKey] = useState(0);
  const started = useRef(false);
  const resultRef = useRef(null);

  const run = async () => {
    setState('loading');
    setError('');
    setImgState('loading');
    try {
      const res = await studioApi.render({ floorPlanId: floorPlan._id, conceptId: concept._id });
      setResult(res.data);
      setState('finishing'); // AIProgress hoàn tất thanh rồi gọi onFinished -> 'done'
    } catch (err) {
      setError(err.message || 'Không thể diễn hoạ lúc này.');
      setState('error');
    }
  };

  // Lưới an toàn: nếu hiệu ứng hoàn tất bị treo (tab ẩn...), vẫn chuyển sang kết quả sau 2,5 giây
  useEffect(() => {
    if (state !== 'finishing') return undefined;
    const t = setTimeout(() => setState('done'), 2500);
    return () => clearTimeout(t);
  }, [state]);

  // Chỉ tự chạy một lần (tránh trừ lượt hai lần khi React StrictMode chạy lại hiệu ứng)
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kết quả hiện nhẹ nhàng sau màn chờ
  useEffect(() => {
    if (state !== 'done' || !resultRef.current || prefersReducedMotion()) return undefined;
    const tw = gsap.fromTo(resultRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', clearProps: 'opacity,transform' });
    return () => tw.kill();
  }, [state]);

  if (state === 'loading' || state === 'finishing') {
    return (
      <AIProgress
        done={state === 'finishing'}
        area={floorPlan.totalArea}
        style={concept.style}
        onFinished={() => setState('done')}
      />
    );
  }

  if (state === 'error') {
    return (
      <div className="text-center py-12 space-y-5 max-w-md mx-auto">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl">{error}</div>
        <p className="text-xs text-neutral-500">
          Thông tin của bạn đã được lưu, đội ngũ MAC vẫn sẽ liên hệ tư vấn.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={run}
            className="border border-white/10 bg-black/20 text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded-xl hover:border-white transition-all"
          >
            Thử lại
          </button>
          <button
            onClick={() => onDone && onDone(null)}
            className="bg-white text-black px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-200 transition-all"
          >
            Bỏ qua
          </button>
        </div>
      </div>
    );
  }

  const { analysis, estimate, quota, imageUrl, analysisSource, renderId } = result;
  const afterSrc = `${imageUrl}${imgKey ? `&retry=${imgKey}` : ''}`;
  const beforeSrc = Array.isArray(floorPlan.images) && typeof floorPlan.images[0] === 'string' && floorPlan.images[0] ? floorPlan.images[0] : '';

  return (
    <div ref={resultRef} className="space-y-8 text-left">
      <div className="space-y-1">
        <span className="text-[10px] tracking-[0.3em] text-emerald-400 font-mono uppercase block">Kết quả diễn hoạ</span>
        <h3 className="text-lg font-bold text-white uppercase">{floorPlan.projectName}</h3>
        <p className="text-xs text-neutral-500">
          {concept.style} · {floorPlan.totalArea} m² ({floorPlan.width} x {floorPlan.length} m)
        </p>
      </div>

      {/* PHỐI CẢNH */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-[4/3]">
        {imgState !== 'ok' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
            {imgState === 'loading' ? (
              <>
                <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-amber-400 animate-spin" />
                <p className="text-[11px] text-neutral-500">Đang dựng ảnh phối cảnh...</p>
              </>
            ) : (
              <>
                <p className="text-[11px] text-neutral-400">Chưa tải được ảnh phối cảnh.</p>
                <button
                  onClick={() => { setImgState('loading'); setImgKey(k => k + 1); }}
                  className="border border-white/10 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg hover:border-white transition-all"
                >
                  Tải lại ảnh
                </button>
              </>
            )}
          </div>
        )}
        {beforeSrc ? (
          <div className={`absolute inset-0 transition-opacity duration-700 ${imgState === 'ok' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <BeforeAfter
              key={imgKey}
              className="absolute inset-0"
              beforeSrc={beforeSrc}
              afterSrc={afterSrc}
              beforeAlt={`Hiện trạng ${floorPlan.projectName || ''}`.trim()}
              afterAlt={`Phối cảnh ${concept.style}`}
              onAfterLoad={() => setImgState('ok')}
              onAfterError={() => setImgState('failed')}
            />
          </div>
        ) : (
          <img
            key={imgKey}
            src={afterSrc}
            alt={`Phối cảnh ${concept.style}`}
            decoding="async"
            onLoad={() => setImgState('ok')}
            onError={() => setImgState('failed')}
            className={`w-full h-full object-cover transition-[opacity,filter,transform] duration-[900ms] ease-out ${imgState === 'ok' ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-lg scale-105'}`}
          />
        )}
      </div>
      <p className="text-[10px] text-neutral-600 -mt-4">
        Ảnh do AI tạo để gợi ý không khí và vật liệu, không phải bản vẽ thi công.
      </p>

      {/* TÓM TẮT */}
      {analysis?.summary && (
        <p className="text-sm text-neutral-200 leading-relaxed border-l-2 border-amber-400 pl-4">{analysis.summary}</p>
      )}

      <EstimateCard estimate={estimate} />

      <AnalysisSections analysis={analysis} />

      <ShareActions renderId={renderId} title={analysis?.summary} />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-white/5">
        <p className="text-[10px] text-neutral-600">
          {analysisSource === 'gemini' ? 'Phân tích bởi AI' : 'Phân tích theo bộ quy tắc thiết kế MAC'}
          {quota && !quota.unlimited && ` · Còn ${quota.remaining} lượt diễn hoạ trong chu kỳ này`}
        </p>
        <div className="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
          <a
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
            className="min-h-12 inline-flex items-center justify-center border border-white/10 bg-black/20 text-[10px] font-bold uppercase tracking-widest px-5 rounded-xl hover:border-white transition-all text-center"
          >
            Mở ảnh gốc
          </a>
          <button
            onClick={() => { if (window.confirm('Diễn hoạ lại sẽ dùng thêm 1 lượt. Tiếp tục?')) run(); }}
            className="min-h-12 border border-white/10 bg-black/20 text-[10px] font-bold uppercase tracking-widest px-5 rounded-xl hover:border-white transition-all"
          >
            Diễn hoạ lại
          </button>
          <button
            onClick={() => onDone && onDone(result)}
            className="min-h-12 bg-amber-400 hover:bg-amber-300 text-black px-8 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
          >
            Hoàn tất
          </button>
        </div>
      </div>
    </div>
  );
}
