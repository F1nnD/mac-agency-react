// Chạy: npm test — kiểm thử kho ảnh, SSRF, chia sẻ công khai, ảnh-sang-ảnh (không cần mạng/database)
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

const realFetch = global.fetch;
const fakeRenders = [];
const RenderMock = {
  findOne(q) {
    const doc = fakeRenders.find(r => r.shareToken === q.shareToken) || null;
    const chain = { populate: () => chain, lean: async () => doc };
    return chain;
  }
};
// express chưa được cài trong môi trường kiểm thử: giả lập Router chỉ để lấy handler
const routes = {};
const fakeExpress = () => ({});
fakeExpress.Router = () => ({ get: (p, h) => { routes[p] = h; }, post() {}, delete() {}, put() {}, use() {} });
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'express') return fakeExpress;
  if (/models\/Render$/.test(request)) return RenderMock;
  if (/models\//.test(request)) return new Proxy({}, { get: () => () => {} });
  return originalLoad.call(this, request, parent, isMain);
};

delete process.env.GEMINI_API_KEY;
const storage = require('../src/services/storageService');
const ai = require('../src/services/aiService');

const setCloud = () => {
  process.env.CLOUDINARY_CLOUD_NAME = 'democloud';
  process.env.CLOUDINARY_API_KEY = 'key123';
  process.env.CLOUDINARY_API_SECRET = 'abcd';
};
const clearCloud = () => {
  delete process.env.CLOUDINARY_CLOUD_NAME; delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET; delete process.env.STORAGE_ALLOWED_HOSTS;
};

test('chữ ký Cloudinary khớp vector trong tài liệu (sha1 của tham số sắp xếp + secret)', () => {
  const sig = storage.signParams({
    timestamp: 1315060510, public_id: 'sample_image', eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop',
    file: 'bỏ qua', api_key: 'bỏ qua'
  }, 'abcd');
  assert.equal(sig, 'bfd09f95f331f558cbd1320e67aa8d488770583e');
});

test('SSRF: chặn host lạ, http, IP nội bộ, localhost; cho phép Cloudinary và host khai báo', () => {
  setCloud();
  assert.equal(storage.isAllowedRemoteUrl('https://res.cloudinary.com/democloud/image/upload/a.jpg'), true);
  assert.equal(storage.isAllowedRemoteUrl('https://evil.example.com/a.jpg'), false);
  assert.equal(storage.isAllowedRemoteUrl('http://res.cloudinary.com/a.jpg'), false);
  assert.equal(storage.isAllowedRemoteUrl('https://127.0.0.1/a.jpg'), false);
  assert.equal(storage.isAllowedRemoteUrl('https://169.254.169.254/latest'), false);
  assert.equal(storage.isAllowedRemoteUrl('https://localhost/a.jpg'), false);
  assert.equal(storage.isAllowedRemoteUrl('https://user:pw@res.cloudinary.com/a.jpg'), false);
  process.env.STORAGE_ALLOWED_HOSTS = 'cdn.mac.vn, 10.0.0.5';
  assert.equal(storage.isAllowedRemoteUrl('https://cdn.mac.vn/a.jpg'), true);
  assert.equal(storage.isAllowedRemoteUrl('https://10.0.0.5/a.jpg'), false, 'IP literal luôn bị chặn');
  assert.equal(storage.isPrivateAddress('192.168.1.2'), true);
  assert.equal(storage.isPrivateAddress('::1'), true);
  assert.equal(storage.isPrivateAddress('8.8.8.8'), false);
  clearCloud();
});

test('SSRF: fetchRemoteImage từ chối host lạ và host phân giải về IP nội bộ, không gọi fetch', async () => {
  setCloud();
  let called = 0;
  global.fetch = async () => { called++; return new Response('x'); };
  await assert.rejects(storage.fetchRemoteImage('https://evil.example.com/a.png'));
  await assert.rejects(storage.fetchRemoteImage('https://res.cloudinary.com/a.png', {
    lookup: async () => [{ address: '10.1.2.3', family: 4 }]
  }));
  assert.equal(called, 0);
  const ok = await storage.fetchRemoteImage('https://res.cloudinary.com/a.png', {
    lookup: async () => [{ address: '8.8.8.8', family: 4 }]
  }).catch(e => e);
  assert.ok(ok instanceof Error); // fetch giả trả text/plain nên bị từ chối vì không phải ảnh
  assert.equal(called, 1);
  global.fetch = realFetch; clearCloud();
});

test('uploadImage: chưa cấu hình → null; quá 8MB → null; có cấu hình → gửi chữ ký đúng và trả url', async () => {
  assert.equal(await storage.uploadImage('data:image/png;base64,AAAA'), null);
  setCloud();
  let seen;
  global.fetch = async (url, init) => {
    seen = { url, form: init.body };
    return new Response(JSON.stringify({ secure_url: 'https://res.cloudinary.com/democloud/image/upload/x.png', public_id: 'x' }), { status: 200 });
  };
  const big = 'data:image/png;base64,' + 'A'.repeat(Math.ceil(8.5 * 1024 * 1024 * 4 / 3));
  assert.equal(await storage.uploadImage(big), null);
  assert.equal(seen, undefined);

  const r = await storage.uploadImage('data:image/png;base64,AAAA', { folder: 'demo' });
  assert.deepEqual(r, { url: 'https://res.cloudinary.com/democloud/image/upload/x.png', publicId: 'x' });
  assert.match(seen.url, /api\.cloudinary\.com\/v1_1\/democloud\/image\/upload$/);
  const ts = seen.form.get('timestamp');
  assert.equal(seen.form.get('signature'), storage.signParams({ folder: 'demo', timestamp: ts }, 'abcd'));
  assert.equal(seen.form.get('api_key'), 'key123');
  assert.equal(seen.form.get('api_secret'), null, 'không gửi secret');

  global.fetch = async () => { throw new Error('mạng lỗi'); };
  assert.equal(await storage.uploadImage('data:image/png;base64,AAAA'), null);
  global.fetch = realFetch; clearCloud();
});

test('loadImagePart: data URL, URL hợp lệ, URL lạ', async () => {
  setCloud();
  const d = await ai.loadImagePart('data:image/jpeg;base64,QUJD');
  assert.equal(d.inlineData.mimeType, 'image/jpeg');
  assert.equal(await ai.loadImagePart('https://evil.example.com/a.png'), null);
  assert.equal(await ai.loadImagePart('http://res.cloudinary.com/a.png'), null);
  global.fetch = async () => new Response(Buffer.from('ABC'), { status: 200, headers: { 'content-type': 'image/png' } });
  const u = await ai.loadImagePart('https://res.cloudinary.com/a.png', { lookup: async () => [{ address: '8.8.8.8' }] });
  assert.equal(u.inlineData.mimeType, 'image/png');
  assert.equal(u.inlineData.data, Buffer.from('ABC').toString('base64'));
  global.fetch = realFetch; clearCloud();
});

test('buildImageUrl: mặc định không có tham chiếu; IMAGE_REF_MODE=on + URL https → kontext + image=', () => {
  const ref = 'https://res.cloudinary.com/democloud/image/upload/mat-bang.jpg';
  delete process.env.IMAGE_REF_MODE;
  const off = ai.buildImageUrl({ prompt: 'modern cafe interior', seed: 7, refImageUrl: ref });
  assert.ok(!off.includes('image='));
  assert.ok(off.includes('model=flux'));
  process.env.IMAGE_REF_MODE = 'on';
  const on = ai.buildImageUrl({ prompt: 'modern cafe interior', seed: 7, refImageUrl: ref });
  assert.ok(on.includes('model=kontext'));
  assert.ok(on.endsWith(`&image=${encodeURIComponent(ref)}`));
  const noRef = ai.buildImageUrl({ prompt: 'x'.repeat(50), seed: 7, refImageUrl: 'http://x.test/a.jpg' });
  assert.ok(!noRef.includes('image=') && noRef.includes('model=flux'));
  delete process.env.IMAGE_REF_MODE;
  assert.equal(ai.pickReferenceImage({ images: ['data:image/png;base64,AA', ref] }), ref);
  assert.equal(ai.pickReferenceImage({ images: ['data:image/png;base64,AA'] }), '');
});

test('shareRoutes: không lộ trường nhạy cảm; token sai → 404 chung', async () => {
  const token = 'a'.repeat(32);
  fakeRenders.push({
    shareToken: token, userId: 'U1', title: 'Industrial · 60 m²', imageUrl: 'https://img/x.png', prompt: 'SECRET PROMPT',
    floorPlanId: { totalArea: 60, address: '12 Lê Lợi', projectName: 'Nhà chị Lan' }, conceptId: { style: 'Industrial' },
    customerName: 'Nguyễn Văn A', phone: '0900000000', createdAt: new Date('2026-01-01'),
    analysis: {
      summary: 'Tóm tắt', designLanguage: ['a — b'], imagePrompt: 'SECRET PROMPT', siteObservations: ['12 Lê Lợi'], risks: ['r'],
      constructionNotes: ['nội bộ'], salesTalkingPoints: ['chốt sale']
    },
    estimate: {
      available: true, area: 60, rangeLow: 123456789, rangeHigh: 234567891, perM2: { low: 2_000_000, high: 3_000_000 },
      confidence: 'trung-binh', assumptions: ['giả định'], items: [{ name: 'Xi măng', unitPrice: 1600 }], total: 200_000_000
    }
  });
  require('../src/routes/shareRoutes');
  const call = async t => {
    const out = { status: 200, body: null, headers: {} };
    const res = {
      set: (k, v) => { out.headers[k] = v; },
      status(c) { out.status = c; return this; },
      json(b) { out.body = b; return this; }
    };
    await routes['/:token']({ params: { token: t } }, res);
    return out;
  };

  const ok = await call(token);
  assert.equal(ok.status, 200);
  const text = JSON.stringify(ok.body);
  for (const secret of ['SECRET PROMPT', 'Nguyễn Văn A', '0900000000', 'Lê Lợi', 'Nhà chị Lan', 'U1', 'Xi măng', 'unitPrice', 'items', 'salesTalkingPoints', 'nội bộ', '"userId"']) {
    assert.ok(!text.includes(secret), `không được lộ: ${secret}`);
  }
  assert.equal(ok.body.data.title, 'Industrial · 60 m²');
  assert.equal(ok.body.data.style, 'Industrial');
  assert.equal(ok.body.data.area, 60);
  assert.equal(ok.body.data.summary, 'Tóm tắt');
  assert.equal(ok.body.data.estimate.available, true);

  const bad = await call('b'.repeat(32));
  const bad2 = await call('khong-hop-le');
  assert.equal(bad.status, 404);
  assert.equal(bad2.status, 404);
  assert.deepEqual(bad.body, bad2.body);
});
