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

/**
 * Hệ số biên độ chuyển động: 0 = tắt (giảm chuyển động), 0.5 = cảm ứng, 1 = chuột.
 */
export const motionScale = () => (prefersReducedMotion() ? 0 : isTouchDevice() ? 0.5 : 1);

/**
 * Thị sai nhẹ: ảnh [data-parallax] dịch chậm hơn nội dung khi cuộn.
 * Ảnh phải nằm trong khung overflow-hidden; ảnh được phóng sẵn 1.08 nên không hở mép
 * (biên độ tối đa 3.5% < 4% phần dư mỗi bên). Cảm ứng: giảm một nửa biên độ.
 * Trả về hàm dọn dẹp (kill ScrollTrigger và trả style về ban đầu).
 */
export function initParallax(root = document, selector = '[data-parallax]') {
  const k = motionScale();
  if (!k) return () => {};
  const imgs = Array.from(root.querySelectorAll(selector));
  if (!imgs.length) return () => {};
  const amp = 3.5 * k;
  const ctx = gsap.context(() => {
    imgs.forEach((img) => {
      const box = img.parentElement;
      if (!box) return;
      gsap.fromTo(img,
        { scale: 1.08, yPercent: -amp },
        {
          yPercent: amp,
          ease: 'none',
          scrollTrigger: { trigger: box, start: 'top bottom', end: 'bottom top', scrub: true }
        });
    });
  });
  return () => ctx.revert();
}
