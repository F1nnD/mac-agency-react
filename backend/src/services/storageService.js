// =============================================================
// Lưu trữ ảnh bền vững (Cloudinary, gọi REST có chữ ký, không cần thư viện)
//   Biến môi trường: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET,
//   tuỳ chọn CLOUDINARY_FOLDER, STORAGE_ALLOWED_HOSTS (danh sách host https được phép tải về, phân tách bằng dấu phẩy)
// Mọi hàm công khai KHÔNG ném lỗi ra ngoài luồng chính: lỗi → trả null.
// =============================================================
const crypto = require('crypto');
const net = require('net');
const dns = require('dns');

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 30000;
const MAX_REDIRECTS = 3;
const IMAGE_TYPES = /^image\/(png|jpe?g|webp|gif)$/i;

const env = () => ({
  cloud: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
  key: (process.env.CLOUDINARY_API_KEY || '').trim(),
  secret: (process.env.CLOUDINARY_API_SECRET || '').trim(),
  folder: (process.env.CLOUDINARY_FOLDER || '').trim()
});

function isConfigured() {
  const c = env();
  return Boolean(c.cloud && c.key && c.secret);
}

// ---------------- Chữ ký Cloudinary ----------------
// Chuỗi cần ký = các tham số (trừ file, api_key, resource_type, cloud_name) sắp theo tên, nối "k=v" bằng "&", rồi cộng API secret; băm sha1.
function signParams(params, secret) {
  const toSign = Object.keys(params)
    .filter(k => !['file', 'api_key', 'resource_type', 'cloud_name'].includes(k) && params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(toSign + secret).digest('hex');
}

// ---------------- Chống SSRF ----------------
function isPrivateAddress(ip) {
  const v = net.isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (v === 6) {
    const s = ip.toLowerCase();
    if (s === '::' || s === '::1') return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(s);
    if (mapped) return isPrivateAddress(mapped[1]);
    return /^f[cd]/.test(s) || /^fe[89ab]/.test(s);
  }
  return false;
}

function allowedHosts(extra = []) {
  const set = new Set();
  if (isConfigured()) set.add('res.cloudinary.com');
  (process.env.STORAGE_ALLOWED_HOSTS || '').split(',').forEach(h => h.trim() && set.add(h.trim().toLowerCase()));
  extra.forEach(h => h && set.add(String(h).toLowerCase()));
  return set;
}

// Kiểm tra đồng bộ: https, host nằm trong danh sách cho phép, không phải IP / tên nội bộ
function isAllowedRemoteUrl(raw, extraHosts = []) {
  let u;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== 'https:' || u.username || u.password) return false;
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host || net.isIP(host) || host === 'localhost' || /\.(localhost|local|internal|lan)$/.test(host)) return false;
  return allowedHosts(extraHosts).has(host);
}

async function assertPublicDns(host, lookup) {
  const list = await lookup(host, { all: true });
  if (!list.length || list.some(a => isPrivateAddress(a.address))) throw new Error('Host phân giải về địa chỉ nội bộ.');
}

// Tải ảnh từ URL được phép. Ném lỗi (nơi gọi tự bắt) khi vi phạm.
async function fetchRemoteImage(url, { maxBytes = 5 * 1024 * 1024, timeoutMs = 10000, extraHosts = [], lookup = dns.promises.lookup } = {}) {
  let current = url;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!isAllowedRemoteUrl(current, extraHosts)) throw new Error('URL ảnh không được phép.');
      await assertPublicDns(new URL(current).hostname, lookup);
      const res = await fetch(current, { signal: ctrl.signal, redirect: 'manual' });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) throw new Error('Chuyển hướng không hợp lệ.');
        current = new URL(loc, current).toString();
        continue;
      }
      if (!res.ok) throw new Error(`Tải ảnh lỗi ${res.status}.`);
      const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (!IMAGE_TYPES.test(type)) throw new Error('Nội dung không phải ảnh.');
      const declared = Number(res.headers.get('content-length'));
      if (declared > maxBytes) throw new Error('Ảnh quá lớn.');
      const chunks = [];
      let size = 0;
      if (res.body && res.body.getReader) {
        const reader = res.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > maxBytes) { try { await reader.cancel(); } catch { /* bỏ qua */ } throw new Error('Ảnh quá lớn.'); }
          chunks.push(Buffer.from(value));
        }
      } else {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > maxBytes) throw new Error('Ảnh quá lớn.');
        chunks.push(buf);
      }
      return { buffer: Buffer.concat(chunks), mimeType: type === 'image/jpg' ? 'image/jpeg' : type };
    }
    throw new Error('Quá nhiều lần chuyển hướng.');
  } finally {
    clearTimeout(timer);
  }
}

// ---------------- Tải lên ----------------
const DATA_URL = /^data:(image\/(?:png|jpe?g|webp|gif));base64,([A-Za-z0-9+/=]+)$/;

// source: data URL ảnh hoặc URL https (host được phép). Trả { url, publicId } hoặc null.
async function uploadImage(source, { extraHosts = [], folder, downloadTimeoutMs = 30000, lookup } = {}) {
  try {
    if (!isConfigured() || typeof source !== 'string' || !source) return null;
    const c = env();

    let dataUrl = source;
    if (/^https?:\/\//i.test(source)) {
      const { buffer, mimeType } = await fetchRemoteImage(source, { maxBytes: MAX_UPLOAD_BYTES, timeoutMs: downloadTimeoutMs, extraHosts, ...(lookup ? { lookup } : {}) });
      dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
    }
    const m = DATA_URL.exec(dataUrl);
    if (!m) return null;
    if (Math.floor(m[2].length * 3 / 4) > MAX_UPLOAD_BYTES) return null;

    const params = { timestamp: Math.floor(Date.now() / 1000) };
    const useFolder = folder || c.folder;
    if (useFolder) params.folder = useFolder;

    const form = new FormData();
    form.append('file', dataUrl);
    form.append('api_key', c.key);
    form.append('timestamp', String(params.timestamp));
    if (params.folder) form.append('folder', params.folder);
    form.append('signature', signParams(params, c.secret));

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), UPLOAD_TIMEOUT_MS);
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(c.cloud)}/image/upload`, {
        method: 'POST', body: form, signal: ctrl.signal
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.secure_url) {
        console.warn('[Storage] Tải ảnh lên thất bại:', data?.error?.message || res.status);
        return null;
      }
      return { url: data.secure_url, publicId: data.public_id || '' };
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    console.warn('[Storage] Lỗi tải ảnh:', error.message);
    return null;
  }
}

// ---------------- Lưu bền ảnh phối cảnh (chạy nền, không ném lỗi) ----------------
const inFlight = new Set();

async function persistRenderImage(renderId) {
  const key = String(renderId);
  if (!isConfigured() || inFlight.has(key)) return false;
  inFlight.add(key);
  try {
    const Render = require('../models/Render');
    const render = await Render.findById(renderId).select('imageUrl imageUrlOriginal imageStored folder').lean();
    if (!render || render.imageStored || !render.imageUrl) return false;

    let imageHost = '';
    try { imageHost = new URL(process.env.IMAGE_API_BASE || 'https://image.pollinations.ai/prompt').hostname; } catch { /* bỏ qua */ }
    const stored = await uploadImage(render.imageUrl, { extraHosts: [imageHost], downloadTimeoutMs: 90000, folder: `${env().folder ? env().folder + '/' : ''}renders` });
    if (!stored) return false;

    await Render.updateOne(
      { _id: render._id, imageStored: { $ne: true } },
      { $set: { imageUrl: stored.url, imageUrlOriginal: render.imageUrlOriginal || render.imageUrl, imageStored: true } }
    );
    return true;
  } catch (error) {
    console.warn('[Storage] Không lưu bền được ảnh phối cảnh:', error.message);
    return false;
  } finally {
    inFlight.delete(key);
  }
}

module.exports = {
  isConfigured,
  uploadImage,
  signParams,
  isAllowedRemoteUrl,
  isPrivateAddress,
  fetchRemoteImage,
  persistRenderImage
};
