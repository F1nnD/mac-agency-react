// Kiểm thử đăng ký/đặt lại mật khẩu/khoá tạm; model được giả lập, không cần DB hay mạng.
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

process.env.JWT_SECRET = 'test-secret';
delete process.env.RESEND_API_KEY;

// Kho User giả trong bộ nhớ
const store = { users: [] };
const FakeUser = {
  async findOne(q) {
    return store.users.find(u => Object.keys(q).every(k => u[k] === q[k])) || null;
  },
  async findById(id) { return store.users.find(u => u._id === id) || null; },
  async create(d) { const u = { _id: 'u' + (store.users.length + 1), ...d, save: async () => {} }; store.users.push(u); return u; },
  async findOneAndUpdate(q, upd) {
    const u = store.users.find(x => x.resetTokenHash && x.resetTokenHash === q.resetTokenHash && x.resetTokenExpires > q.resetTokenExpires.$gt);
    if (!u) return null;
    const copy = { ...u };
    Object.assign(u, upd.$set);
    return copy;
  },
  async updateOne(q, upd) { Object.assign(store.users.find(x => x._id === q._id), upd.$set); },
  select() { return this; }
};
const noop = new Proxy({}, { get: () => async () => ({}) });
// Giả lập express/jsonwebtoken/bcryptjs (môi trường kiểm thử không có node_modules)
const fakeJwt = {
  sign: (p) => ({ ...p, iat: Math.floor(Date.now() / 1000) }),
  decode: (t) => t
};
const fakeBcrypt = {
  hash: async (p) => 'h:' + p,
  compare: async (p, h) => h === 'h:' + p
};
const fakeExpress = () => {
  const stack = [];
  const r = { stack };
  for (const m of ['get', 'post', 'put', 'delete']) {
    r[m] = (path, ...handlers) => stack.push({ route: { path, methods: { [m]: true }, stack: handlers.map(h => ({ handle: h })) } });
  }
  return r;
};
fakeExpress.Router = fakeExpress;
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'express') return fakeExpress;
  if (request === 'jsonwebtoken') return fakeJwt;
  if (request === 'bcryptjs') return fakeBcrypt;
  if (/models\/User$/.test(request)) return FakeUser;
  if (/models\//.test(request)) return noop;
  if (/engagementService$/.test(request)) return { refreshEngagementSafe() {} };
  return originalLoad.call(this, request, parent, isMain);
};

const router = require('../src/routes/authRoutes');
const { isStaleToken } = require('../src/middleware/authMiddleware');
const I = router.__internals;

function call(handler, body, extra = {}) {
  return new Promise(resolve => {
    const res = { code: 200, status(c) { this.code = c; return this; }, json(b) { resolve({ code: this.code, body: b }); return this; }, setHeader() {} };
    handler({ body, ip: '1.1.1.1', headers: {}, ...extra }, res);
  });
}
function routeHandler(method, path) {
  const layer = router.stack.find(l => l.route && l.route.path === path && l.route.methods[method]);
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

test('đăng ký bị từ chối khi thiếu consent', async () => {
  const r = await call(routeHandler('post', '/register'), { username: 'khach01', password: 'matkhau123', email: 'a@b.vn' });
  assert.equal(r.code, 400);
  assert.match(r.body.message, /đồng ý/);
});

test('đăng ký bắt buộc email hợp lệ', async () => {
  const r = await call(routeHandler('post', '/register'), { username: 'khach01', password: 'matkhau123', email: 'sai', consent: true });
  assert.equal(r.code, 400);
  assert.match(r.body.message, /email/i);
});

test('đăng ký thành công lưu consent và email chữ thường, chặn email trùng', async () => {
  const reg = routeHandler('post', '/register');
  const r = await call(reg, { username: 'khach01', password: 'matkhau123', email: 'Khach@Mail.VN', consent: true });
  assert.equal(r.code, 201);
  const u = store.users[0];
  assert.equal(u.email, 'khach@mail.vn');
  assert.equal(u.consentVersion, I.CONSENT_VERSION);
  assert.ok(u.consentAt instanceof Date);
  const dup = await call(reg, { username: 'khach02', password: 'matkhau123', email: 'khach@mail.vn', consent: true });
  assert.equal(dup.code, 400);
});

test('token đặt lại: băm sha256, hạn 30 phút', () => {
  const now = Date.now();
  const t = I.createResetToken(now);
  assert.equal(t.token.length, 64);
  assert.equal(t.hash, I.hashToken(t.token));
  assert.notEqual(t.hash, t.token);
  assert.equal(t.expires.getTime() - now, 30 * 60 * 1000);
});

test('quên mật khẩu luôn trả 200 chung; chỉ lưu hash khi email tồn tại', async () => {
  const forgot = routeHandler('post', '/forgot-password');
  const a = await call(forgot, { email: 'khong-ton-tai@x.vn' });
  const b = await call(forgot, { email: 'khach@mail.vn' });
  assert.equal(a.code, 200);
  assert.equal(b.code, 200);
  assert.equal(a.body.message, b.body.message);
  assert.match(store.users[0].resetTokenHash, /^[0-9a-f]{64}$/);
  assert.ok(store.users[0].resetTokenExpires > new Date());
});

test('đặt lại mật khẩu: dùng một lần, hết hạn bị từ chối, yêu cầu tối thiểu 8 ký tự', async () => {
  const reset = routeHandler('post', '/reset-password');
  const u = store.users[0];
  const t = I.createResetToken();
  u.resetTokenHash = t.hash; u.resetTokenExpires = t.expires;

  assert.equal((await call(reset, { token: t.token, password: 'ngan' })).code, 400);
  const ok = await call(reset, { token: t.token, password: 'matkhaumoi1' });
  assert.equal(ok.code, 200);
  assert.ok(u.passwordChangedAt instanceof Date);
  assert.equal(u.resetTokenHash, '');
  assert.notEqual(u.password, 'matkhaumoi1');
  const again = await call(reset, { token: t.token, password: 'matkhaumoi2' });
  assert.equal(again.code, 400);

  const t2 = I.createResetToken(Date.now() - 31 * 60 * 1000);
  u.resetTokenHash = t2.hash; u.resetTokenExpires = t2.expires;
  assert.equal((await call(reset, { token: t2.token, password: 'matkhaumoi3' })).code, 400);
});

test('token đăng nhập cũ bị từ chối sau khi đổi mật khẩu', () => {
  const nowSec = Math.floor(Date.now() / 1000);
  const user = { passwordChangedAt: new Date(nowSec * 1000) };
  assert.equal(isStaleToken({ iat: nowSec - 100 }, user), true);
  assert.equal(isStaleToken({ iat: nowSec + 1 }, user), false);
  assert.equal(isStaleToken({ iat: nowSec - 100 }, {}), false);
  assert.ok(fakeJwt.decode(fakeJwt.sign({ userId: 'u1' })).iat);
});

test('khoá tạm sau 5 lần sai, mở lại sau 15 phút, khoá riêng theo username+IP', () => {
  const key = 'alice|9.9.9.9';
  const t0 = 1_000_000;
  for (let i = 0; i < I.LOCK_MAX_FAILS - 1; i++) I.recordFail(key, t0 + i);
  assert.equal(I.isLocked(key, t0 + 10), false);
  I.recordFail(key, t0 + 20);
  assert.equal(I.isLocked(key, t0 + 30), true);
  assert.equal(I.isLocked('alice|8.8.8.8', t0 + 30), false);
  assert.equal(I.isLocked(key, t0 + 15 * 60 * 1000 + 100), false);
});

test('đăng nhập trả 429 khi đã bị khoá', async () => {
  const key = 'bob|1.1.1.1';
  for (let i = 0; i < 5; i++) I.recordFail(key);
  const r = await call(routeHandler('post', '/login'), { username: 'bob', password: 'x' });
  assert.equal(r.code, 429);
});

test('xoá tài khoản: admin/staff không được tự xoá', async () => {
  const r = await call(routeHandler('delete', '/me'), { password: 'x' }, { user: { userId: 'u1', role: 'staff' } });
  assert.equal(r.code, 403);
});
