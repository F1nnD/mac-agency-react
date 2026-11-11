import React, { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { prefersReducedMotion } from '../utils/motion';

const isAdminPath = (p) => p === '/admin' || p.startsWith('/admin/');

/**
 * Màn che tối quét lên khi khách đổi trang (tổng khoảng 0,65 giây).
 * Bỏ qua đường dẫn /admin và khi người dùng bật giảm chuyển động.
 * Dùng: <Router><PageTransition><Routes>...</Routes></PageTransition></Router>
 * Màn che là phần tử anh em (không bọc nội dung) nên không tạo containing block cho phần tử fixed,
 * và luôn pointer-events: none nên không bao giờ chặn thao tác.
 * Lưu ý: React Router đổi nội dung ngay, nên màn che phủ kín tức thì rồi mở ra (không có nửa "quét vào").
 */
export default function PageTransition({ children }) {
  const { pathname } = useLocation();
  const overlayRef = useRef(null);
  const prevPath = useRef(pathname);

  useLayoutEffect(() => {
    const prev = prevPath.current;
    prevPath.current = pathname;
    const el = overlayRef.current;
    if (!el || prev === pathname) return undefined;
    if (isAdminPath(pathname) || isAdminPath(prev) || prefersReducedMotion()) return undefined;

    gsap.killTweensOf(el);
    // Phủ kín trước khi trình duyệt vẽ nên không thấy trang mới nháy lên
    gsap.set(el, { yPercent: 0, visibility: 'visible' });
    const tween = gsap.to(el, {
      yPercent: -100,
      duration: 0.6,
      delay: 0.05,
      ease: 'power4.out',
      onComplete: () => { gsap.set(el, { visibility: 'hidden' }); }
    });
    return () => { tween.kill(); gsap.set(el, { yPercent: -100, visibility: 'hidden' }); };
  }, [pathname]);

  return (
    <>
      {children}
      <div
        ref={overlayRef}
        aria-hidden="true"
        className="fixed inset-0 z-[9999] pointer-events-none bg-[#0b0b0b] border-b border-amber-400/60 will-change-transform"
        style={{ transform: 'translateY(-100%)', visibility: 'hidden' }}
      />
    </>
  );
}
