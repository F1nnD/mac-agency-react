import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { prefersReducedMotion } from '../utils/motion';

const defaultFormat = (n) => Math.round(n).toLocaleString('vi-VN');

/**
 * Số chạy từ 0 tới `value` khi cuộn vào màn hình. Định dạng vi-VN.
 * Props: value (số), format (tuỳ chọn: (n) => chuỗi), duration (giây, mặc định 1.4),
 *        prefix, suffix, className.
 * Giảm chuyển động: hiện thẳng giá trị cuối. Người đọc màn hình chỉ nghe giá trị cuối.
 */
export default function CountUp({ value, format, duration = 1.4, prefix = '', suffix = '', className = '' }) {
  const ref = useRef(null);
  const fmtRef = useRef(format || defaultFormat);
  fmtRef.current = format || defaultFormat;
  const target = Number(value) || 0;
  const finalText = fmtRef.current(target);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fmt = fmtRef.current;
    el.textContent = finalText;
    if (prefersReducedMotion() || target <= 0) return undefined;

    el.textContent = fmt(0);
    const obj = { v: 0 };
    let tween = null;
    let io = null;
    const play = () => {
      tween = gsap.to(obj, {
        v: target,
        duration,
        ease: 'power3.out',
        onUpdate: () => { el.textContent = fmt(obj.v); },
        onComplete: () => { el.textContent = finalText; }
      });
    };
    if (typeof IntersectionObserver === 'undefined') {
      play();
    } else {
      io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { io.disconnect(); play(); }
      }, { threshold: 0.4 });
      io.observe(el);
    }
    return () => {
      if (io) io.disconnect();
      if (tween) tween.kill();
      el.textContent = finalText;
    };
  }, [target, duration, finalText]);

  return (
    <span className={`tabular-nums ${className}`}>
      <span className="sr-only">{prefix}{finalText}{suffix}</span>
      <span aria-hidden="true">{prefix}<span ref={ref} />{suffix}</span>
    </span>
  );
}
