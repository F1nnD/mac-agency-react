import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const mq = (q) => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(q).matches;

/** Người dùng đã bật "giảm chuyển động" trong hệ điều hành */
export const prefersReducedMotion = () => mq('(prefers-reduced-motion: reduce)');

/** Thiết bị cảm ứng (điện thoại, máy tính bảng): không có con trỏ chuột để rê */
export const isTouchDevice = () => mq('(hover: none), (pointer: coarse)');

/**
 * Hiện dần từng nhóm phần tử [data-reveal] khi cuộn tới, so le nhau.
 * Gọi lại nhiều lần được: phần tử đã hiện (data-revealed) sẽ bị bỏ qua,
 * nên dùng được cho phần tử nạp muộn từ API.
 * Trả về hàm dọn dẹp.
 */
export function initReveal(root = document) {
  const els = Array.from(root.querySelectorAll('[data-reveal]:not([data-revealed])'));
  if (!els.length) return () => {};

  if (prefersReducedMotion()) {
    els.forEach((el) => { el.style.opacity = 1; el.style.transform = 'none'; el.dataset.revealed = '1'; });
    return () => {};
  }

  gsap.set(els, { opacity: 0, y: 28 });
  const triggers = ScrollTrigger.batch(els, {
    start: 'top 92%',
    once: true,
    onEnter: (batch) => {
      batch.forEach((el) => { el.dataset.revealed = '1'; });
      gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out', overwrite: true });
    }
  });
  return () => triggers.forEach((t) => t.kill());
}
