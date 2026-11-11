/* Service worker tối giản của MAC Concept.
 * - Điều hướng: ưu tiên mạng; mất mạng thì hiện trang offline dự phòng bên dưới.
 * - KHÔNG cache /api, KHÔNG cache ảnh lớn, KHÔNG chặn các yêu cầu khác (để trình duyệt tự xử lý).
 * Đổi VERSION mỗi lần cần ép trình duyệt cập nhật service worker và dọn cache cũ. */
const VERSION = 'v1';
const CACHE = `mac-shell-${VERSION}`;

const OFFLINE_HTML = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#0b0b0b"><title>MAC Concept - Mất kết nối</title>
<style>html,body{margin:0;height:100%;background:#0b0b0b;color:#d4d4d4;font-family:system-ui,sans-serif}
main{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center}
h1{margin:0;color:#fbbf24;letter-spacing:.3em;font-size:28px}p{margin:0;max-width:320px;font-size:14px;line-height:1.6;color:#a3a3a3}
button{min-height:44px;padding:0 28px;border-radius:999px;border:0;background:#fbbf24;color:#000;font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-size:12px}</style>
</head><body><main><h1>MAC</h1><p>Bạn đang ngoại tuyến. Hãy kiểm tra kết nối mạng rồi thử tải lại trang.</p>
<button onclick="location.reload()">Tải lại</button></main></body></html>`;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('mac-shell-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Chỉ xử lý điều hướng trang; mọi thứ khác (API, ảnh, script) đi thẳng ra mạng
  if (req.mode !== 'navigate') return;
  event.respondWith(
    fetch(req).catch(
      () => new Response(OFFLINE_HTML, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    )
  );
});
