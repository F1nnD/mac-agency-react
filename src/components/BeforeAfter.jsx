import React, { useCallback, useRef, useState } from 'react';

const clamp = (n) => Math.min(100, Math.max(0, n));

/**
 * Thanh trượt so sánh hai ảnh: bên trái (trước) và bên phải (sau).
 * Props: beforeSrc, afterSrc, beforeLabel ("Hiện trạng"), afterLabel ("Phối cảnh"),
 *        beforeAlt, afterAlt, initial (0-100, mặc định 50), className (mặc định aspect-[4/3];
 *        truyền "absolute inset-0" để lấp đầy khung cha), onAfterLoad, onAfterError.
 * Đổi afterSrc/beforeSrc thì nên đặt key mới cho component để làm mới trạng thái tải.
 * Kéo bằng chuột/ngón tay (touch-action: pan-y nên vẫn cuộn dọc được); bàn phím: mũi tên,
 * Shift+mũi tên, PageUp/PageDown, Home/End.
 */
export default function BeforeAfter({
  beforeSrc, afterSrc,
  beforeLabel = 'Hiện trạng', afterLabel = 'Phối cảnh',
  beforeAlt = 'Hiện trạng', afterAlt = 'Phối cảnh',
  initial = 50, className = 'aspect-[4/3]',
  onAfterLoad, onAfterError
}) {
  const [pos, setPos] = useState(clamp(initial));
  const [dragging, setDragging] = useState(false);
  const [beforeState, setBeforeState] = useState('loading'); // loading | ok | failed
  const [afterState, setAfterState] = useState('loading');
  const rootRef = useRef(null);

  const posFromEvent = useCallback((e) => {
    const r = rootRef.current.getBoundingClientRect();
    return r.width ? clamp(((e.clientX - r.left) / r.width) * 100) : 50;
  }, []);

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Cảm ứng: chỉ bắt đầu kéo khi chạm gần tay nắm, để vuốt dọc cuộn trang không làm nhảy thanh
    if (e.pointerType === 'touch') {
      const r = rootRef.current.getBoundingClientRect();
      if (Math.abs(e.clientX - (r.left + (pos / 100) * r.width)) > 36) return;
    }
    try { rootRef.current.setPointerCapture(e.pointerId); } catch { /* bỏ qua */ }
    setDragging(true);
    setPos(posFromEvent(e));
  };
  const onPointerMove = (e) => { if (dragging) setPos(posFromEvent(e)); };
  const endDrag = (e) => {
    if (!dragging) return;
    setDragging(false);
    try { rootRef.current.releasePointerCapture(e.pointerId); } catch { /* bỏ qua */ }
  };

  const onKeyDown = (e) => {
    const step = e.shiftKey ? 10 : 5;
    let next = null;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = pos - step;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = pos + step;
    else if (e.key === 'PageDown') next = pos - 10;
    else if (e.key === 'PageUp') next = pos + 10;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = 100;
    if (next === null) return;
    e.preventDefault();
    setPos(clamp(next));
  };

  const imgCls = 'absolute inset-0 w-full h-full object-cover block pointer-events-none select-none';
  const noDrag = (e) => e.preventDefault();
  const placeholder = (text) => (
    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 px-6 text-center">
      <p className="text-[11px] text-neutral-500">{text}</p>
    </div>
  );

  return (
    <div
      ref={rootRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={`relative w-full overflow-hidden select-none bg-black/40 ${dragging ? 'cursor-grabbing' : 'cursor-ew-resize'} ${className}`}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Ảnh sau (nằm dưới, hiện dần từ mờ sang nét) */}
      {afterState === 'failed' && placeholder('Chưa tải được ảnh phối cảnh.')}
      {afterSrc && afterState !== 'failed' && (
        <img
          src={afterSrc}
          alt={afterAlt}
          draggable={false}
          onDragStart={noDrag}
          decoding="async"
          onLoad={() => { setAfterState('ok'); if (onAfterLoad) onAfterLoad(); }}
          onError={() => { setAfterState('failed'); if (onAfterError) onAfterError(); }}
          className={`${imgCls} transition-[opacity,filter,transform] duration-[900ms] ease-out ${afterState === 'ok' ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-lg scale-105'}`}
        />
      )}

      {/* Ảnh trước (cắt theo vị trí thanh) */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {beforeState === 'failed' ? placeholder('Không tải được ảnh hiện trạng.') : (
          <img
            src={beforeSrc}
            alt={beforeAlt}
            draggable={false}
            onDragStart={noDrag}
            decoding="async"
            onLoad={() => setBeforeState('ok')}
            onError={() => setBeforeState('failed')}
            className={`${imgCls} transition-opacity duration-700 ${beforeState === 'ok' ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
      </div>

      {/* Nhãn */}
      <span className="absolute top-3 left-3 z-10 pointer-events-none text-[10px] font-bold uppercase tracking-widest text-white bg-black/60 border border-white/15 px-2.5 py-1 rounded-md">
        {beforeLabel}
      </span>
      <span className="absolute top-3 right-3 z-10 pointer-events-none text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-black/60 border border-amber-400/30 px-2.5 py-1 rounded-md">
        {afterLabel}
      </span>

      {/* Tay nắm: vùng bấm rộng 44px, vạch mảnh ở giữa */}
      <div
        role="slider"
        tabIndex={0}
        aria-label={`So sánh ${beforeLabel} và ${afterLabel}`}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        aria-valuetext={`${Math.round(pos)}% là ${beforeLabel}`}
        onKeyDown={onKeyDown}
        className="absolute top-0 bottom-0 z-20 w-11 -translate-x-1/2 flex items-center justify-center outline-none focus-visible:[&>span]:ring-2 focus-visible:[&>span]:ring-amber-400"
        style={{ left: `${pos}%`, touchAction: 'pan-y' }}
      >
        <span className="absolute top-0 bottom-0 w-px bg-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]" />
        <span className="relative w-9 h-9 rounded-full bg-black/70 border border-white/80 backdrop-blur-sm flex items-center justify-center text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l-6 6 6 6M15 6l6 6-6 6" />
          </svg>
        </span>
      </div>
    </div>
  );
}
