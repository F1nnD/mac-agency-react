import { useEffect } from 'react';

// Đặt nội dung cho một thẻ meta (tạo mới nếu chưa có); trả về hàm khôi phục
function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  const created = !el;
  if (created) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  const prev = el.getAttribute('content');
  el.setAttribute('content', content);
  return () => {
    if (created) el.remove();
    else if (prev === null) el.removeAttribute('content');
    else el.setAttribute('content', prev);
  };
}

/**
 * Cập nhật tiêu đề tab và mô tả trang (SPA), tự khôi phục khi rời trang.
 * Lưu ý: chỉ trình duyệt/bot chạy JavaScript mới thấy giá trị này.
 */
export default function usePageMeta(title, description) {
  useEffect(() => {
    const prevTitle = document.title;
    const undo = [];
    if (title) {
      document.title = title;
      undo.push(setMeta('property', 'og:title', title));
    }
    if (description) {
      undo.push(setMeta('name', 'description', description));
      undo.push(setMeta('property', 'og:description', description));
    }
    return () => {
      document.title = prevTitle;
      undo.reverse().forEach((fn) => fn());
    };
  }, [title, description]);
}
