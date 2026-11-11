import React, { useLayoutEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '../utils/motion';

gsap.registerPlugin(ScrollTrigger);

/**
 * Tiêu đề hiện kiểu che-mở: mỗi dòng (hoặc từ) trượt lên từ sau lớp mặt nạ overflow-hidden.
 * Props:
 *  - as: thẻ bao ngoài (h1, h2...; mặc định 'span' hiển thị block)
 *  - text: chuỗi, xuống dòng bằng '\n'   |  lines: mảng chuỗi (mỗi phần tử một dòng)
 *  - html: chuỗi HTML tin cậy (vd tên dự án có <br>), hiện như một khối duy nhất
 *  - by: 'line' (mặc định) | 'word'
 *  - trigger: 'scroll' (mặc định, chạy khi cuộn tới) | 'mount' (chạy ngay)
 *  - delay: giây;  className, ...rest chuyển cho thẻ ngoài (id, v.v.)
 * Văn bản thật luôn nằm trong DOM; khi tách chữ, thẻ ngoài có aria-label và phần tách là aria-hidden.
 * Trạng thái ẩn được đặt trong useLayoutEffect (trước khi vẽ) nên không bị nháy chữ.
 */
export default function RevealText({ as: Tag = 'span', text, lines, html, by = 'line', trigger = 'scroll', delay = 0, className = '', ...rest }) {
  const rootRef = useRef(null);

  const parts = useMemo(() => {
    if (html != null) return null;
    const arr = Array.isArray(lines) ? lines : String(text ?? '').split('\n');
    return arr.map((l) => String(l));
  }, [html, lines, text]);
  const partsKey = parts ? parts.join('\n') : html;
  const label = parts ? parts.join(' ') : undefined;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return undefined;
    const targets = root.querySelectorAll('[data-rt]');
    if (!targets.length) return undefined;

    const ctx = gsap.context(() => {
      gsap.set(targets, { yPercent: 115 });
      const vars = { yPercent: 0, duration: 0.9, ease: 'power4.out', stagger: by === 'word' ? 0.06 : 0.12, delay };
      if (trigger === 'mount') {
        gsap.to(targets, vars);
      } else {
        ScrollTrigger.create({
          trigger: root,
          start: 'top 90%',
          once: true,
          onEnter: () => gsap.to(targets, vars)
        });
      }
    }, root);
    return () => ctx.revert();
  }, [partsKey, by, trigger, delay]);

  // Đệm trên/dưới để dấu tiếng Việt không bị mặt nạ cắt; margin âm giữ nguyên chiều cao dòng
  const maskStyle = { paddingTop: '0.18em', paddingBottom: '0.18em', marginTop: '-0.18em', marginBottom: '-0.18em' };

  if (!parts) {
    return (
      <Tag ref={rootRef} className={`block ${className}`} {...rest}>
        <span className="block overflow-hidden" style={maskStyle}>
          <span data-rt className="block will-change-transform" dangerouslySetInnerHTML={{ __html: html }} />
        </span>
      </Tag>
    );
  }

  return (
    <Tag ref={rootRef} className={`block ${className}`} aria-label={label} {...rest}>
      {parts.map((line, i) => (
        <span key={i} aria-hidden="true" className="block overflow-hidden" style={maskStyle}>
          {by === 'word' ? (
            line.split(/\s+/).filter(Boolean).map((w, j, arr) => (
              <React.Fragment key={j}>
                <span className="inline-block overflow-hidden align-bottom" style={maskStyle}>
                  <span data-rt className="inline-block will-change-transform">{w}</span>
                </span>
                {j < arr.length - 1 ? ' ' : null}
              </React.Fragment>
            ))
          ) : (
            <span data-rt className="block will-change-transform">{line}</span>
          )}
        </span>
      ))}
    </Tag>
  );
}
