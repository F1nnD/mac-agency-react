import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { prefersReducedMotion } from '../utils/motion';

const STEPS = [
  'Đang đọc mặt bằng…',
  'Đang chọn vật liệu theo concept…',
  'Đang dựng ánh sáng và bố cục…',
  'Đang tính khoảng giá sơ bộ…'
];
// Mốc giây chuyển bước (chỉ để minh hoạ thứ tự xử lý, không phải dữ liệu thật từ máy chủ)
const STEP_AT = [0, 7, 15, 24];
const LONG_WAIT = 25;

/**
 * Màn chờ AI diễn hoạ. Props:
 *  - done: true khi kết quả đã về -> thanh chạy nốt tới 100% rồi mờ đi và gọi onFinished
 *  - onFinished: gọi sau khi chuyển cảnh xong
 *  - area, style: chỉ để hiện câu mô tả (tuỳ chọn)
 * Trung thực: thanh tiến chỉ nhích dần và không bao giờ chạm 100% trước khi có kết quả;
 * các bước chữ chỉ là minh hoạ thứ tự xử lý nên không có dấu "đã xong".
 */
export default function AIProgress({ done = false, onFinished, area, style }) {
  const [seconds, setSeconds] = useState(0);
  const barRef = useRef(null);
  const wrapRef = useRef(null);
  const startRef = useRef(performance.now());
  const rafRef = useRef(0);
  const finishRef = useRef(onFinished);
  finishRef.current = onFinished;

  // Đồng hồ giây
  useEffect(() => {
    if (done) return undefined;
    const id = setInterval(() => setSeconds(Math.floor((performance.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [done]);

  // Thanh tiến trơn: tiệm cận ~92% theo thời gian chờ
  useEffect(() => {
    if (done) return undefined;
    const tick = () => {
      const t = performance.now() - startRef.current;
      const p = 0.92 * (1 - Math.exp(-t / 20000));
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [done]);

  // Kết quả về: hoàn tất thanh, mờ cảnh, báo cho cha
  useEffect(() => {
    if (!done) return undefined;
    if (prefersReducedMotion()) {
      if (barRef.current) barRef.current.style.transform = 'scaleX(1)';
      const id = setTimeout(() => finishRef.current && finishRef.current(), 150);
      return () => clearTimeout(id);
    }
    const tl = gsap.timeline({ onComplete: () => finishRef.current && finishRef.current() });
    tl.to(barRef.current, { scaleX: 1, duration: 0.5, ease: 'power3.out' })
      .to(wrapRef.current, { opacity: 0, y: -10, duration: 0.35, ease: 'power3.out' }, '+=0.1');
    return () => tl.kill();
  }, [done]);

  let step = 0;
  STEP_AT.forEach((s, i) => { if (seconds >= s) step = i; });

  return (
    <div ref={wrapRef} className="py-14 max-w-md mx-auto px-2 text-center space-y-7">
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white uppercase">AI đang diễn hoạ không gian</h3>
        <p className="text-xs text-neutral-500">
          {area ? `Mặt bằng ${area} m²` : 'Mặt bằng của bạn'}{style ? `, phong cách ${style}` : ''}. Việc này có thể mất vài chục giây.
        </p>
      </div>

      <div
        role="progressbar"
        aria-label="AI đang xử lý"
        aria-busy={!done}
        className="h-1 w-full rounded-full bg-white/10 overflow-hidden"
      >
        <div ref={barRef} className="h-full w-full origin-left bg-amber-400" style={{ transform: 'scaleX(0.02)' }} />
      </div>

      <ol className="space-y-2.5 text-left" role="status" aria-live="polite">
        {STEPS.map((label, i) => {
          const active = i === step;
          return (
            <li
              key={label}
              aria-current={active ? 'step' : undefined}
              className={`flex items-center gap-3 text-xs transition-opacity duration-700 ${active ? 'text-white opacity-100' : i < step ? 'text-neutral-500 opacity-60' : 'text-neutral-600 opacity-40'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-amber-400 animate-pulse' : 'bg-white/20'}`} />
              <span>{label}</span>
            </li>
          );
        })}
      </ol>

      <div className="space-y-2">
        <p className="text-[11px] text-neutral-500 font-mono tabular-nums">Đã chờ {seconds} giây</p>
        {seconds > LONG_WAIT && !done && (
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            Hệ thống vẫn đang xử lý, đôi khi cần thêm một chút thời gian. Bạn cứ giữ trang này mở nhé.
          </p>
        )}
        <p className="text-[10px] text-neutral-600">Các bước trên chỉ minh hoạ thứ tự xử lý; thời gian thực tế tuỳ hệ thống.</p>
      </div>
    </div>
  );
}
