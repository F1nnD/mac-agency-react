// Chạy: npm test  — kiểm thử nhập file, giá cũ, phân quyền lead, lịch gọi lại (không cần database)
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
const path = require('path');
const { pathToFileURL } = require('url');

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (/models\//.test(request)) return new Proxy({}, { get: () => () => {} });
  return originalLoad.call(this, request, parent, isMain);
};

const crm = require('../src/services/crmService');
const estimate = require('../src/services/estimateService');

const NOW = new Date('2026-11-12T03:00:00Z'); // 10:00 giờ VN
const daysAgo = n => new Date(NOW.getTime() - n * 86400000);
let csv;
test.before(async () => {
  csv = await import(pathToFileURL(path.join(__dirname, '../../src/utils/csv.js')).href);
});

// ---------------- CSV ----------------
test('csv: BOM, dấu phẩy, ngoặc kép, xuống dòng trong ô', () => {
  const text = '﻿code,name,notes\r\nA1,"Gạch ""men"", 60x60","dòng 1\ndòng 2"\r\nA2,Sơn,\r\n';
  const { headers, records } = csv.parseCsv(text);
  assert.deepEqual(headers, ['code', 'name', 'notes']);
  assert.equal(records.length, 2);
  assert.equal(records[0].name, 'Gạch "men", 60x60');
  assert.equal(records[0].notes, 'dòng 1\ndòng 2');
  assert.equal(records[1].notes, '');
});

test('csv: tự nhận dấu chấm phẩy (Excel tiếng Việt)', () => {
  assert.equal(csv.detectDelimiter('a;b;c\n1;2;3'), ';');
  const { records } = csv.parseCsv('code;price\nXM;"1.850,5"\n');
  assert.equal(records[0].price, '1.850,5');
});

test('số kiểu Việt (cả frontend lẫn backend)', () => {
  for (const f of [csv.parseVnNumber, crm.parseVnNumber]) {
    assert.equal(f('1.200.000'), 1200000);
    assert.equal(f('1200000'), 1200000);
    assert.equal(f('1,200,000'), 1200000);
    assert.equal(f('1.850,5'), 1850.5);
    assert.equal(f('1,5'), 1.5);
    assert.equal(f('0.25'), 0.25);
    assert.equal(f('1.200'), 1200);
    assert.equal(f('1.200.000đ'), 1200000);
    assert.ok(Number.isNaN(f('abc')));
    assert.ok(Number.isNaN(f('')));
  }
});

// ---------------- Kiểm tra dòng nhập ----------------
test('vật tư: tạo mới cần đủ trường, cập nhật chỉ cần mã', () => {
  const ctx = { existingCodes: new Set(['XM']), seenCodes: new Set() };
  const bad = crm.validateMaterialRow({ code: 'gach-1', name: 'Gạch' }, ctx);
  assert.equal(bad.ok, false);
  assert.equal(bad.action, 'create');
  assert.equal(bad.errors.length, 2); // thiếu phân loại và đơn vị

  const ok = crm.validateMaterialRow({ Mã: 'xm', 'Định mức': '45', 'Phân loại': 'Kết cấu' }, ctx);
  assert.equal(ok.ok, true);
  assert.equal(ok.action, 'update');
  assert.equal(ok.data.category, 'ket-cau');
  assert.equal(ok.data.normPerM2, 45);
  assert.equal('name' in ok.data, false); // ô trống không ghi đè
});

test('vật tư: mã lặp trong file, định mức âm, phân loại sai bị từ chối', () => {
  const ctx = { existingCodes: new Set(), seenCodes: new Set() };
  const row = { code: 'A', name: 'a', category: 'ket-cau', unit: 'kg', normPerM2: '1' };
  assert.equal(crm.validateMaterialRow(row, ctx).ok, true);
  assert.match(crm.validateMaterialRow(row, ctx).errors[0], /lặp/);
  assert.equal(crm.validateMaterialRow({ ...row, code: 'B', normPerM2: '-1' }, ctx).ok, false);
  assert.equal(crm.validateMaterialRow({ ...row, code: 'C', category: 'xyz' }, ctx).ok, false);
});

test('báo giá: giá âm / 0 / chữ bị từ chối, ngày mặc định hôm nay (giờ VN)', () => {
  const materialsByCode = new Map([['XM', { _id: 'id1', unit: 'kg' }]]);
  const ctx = { materialsByCode, now: NOW };
  const run = row => crm.validateMarketPriceRow({ materialCode: 'xm', ...row }, ctx);

  assert.equal(run({ price: '-5' }).ok, false);
  assert.equal(run({ price: '0' }).ok, false);
  assert.equal(run({ price: 'abc' }).ok, false);
  assert.equal(run({}).ok, false);

  const good = run({ price: '1.850' });
  assert.equal(good.ok, true);
  assert.equal(good.data.price, 1850);
  assert.equal(good.dateKey, '2026-11-12');
  assert.equal(good.data.unit, 'kg');
  assert.equal(good.data.source, 'bao-gia-ncc');

  assert.equal(run({ price: '1', priceDate: '05/11/2026' }).dateKey, '2026-11-05');
  assert.equal(run({ price: '1', priceDate: '31/02/2026' }).ok, false);
  assert.equal(run({ price: '1', priceDate: '2027-01-01' }).ok, false);
  assert.equal(run({ price: '1', unit: 'm2' }).ok, false);
  assert.equal(crm.validateMarketPriceRow({ materialCode: 'ZZ', price: '5' }, ctx).ok, false);
});

test('import: quá 500 dòng hoặc rỗng bị từ chối trước khi chạm database', async () => {
  await assert.rejects(() => crm.importMaterials([]), /Chưa có dòng/);
  await assert.rejects(() => crm.importMarketPrices(new Array(501).fill({})), /tối đa 500/);
});

test('file mẫu: có BOM UTF-8 và một dòng ví dụ', () => {
  for (const kind of ['materials', 'market-prices']) {
    const t = crm.templateCsv(kind);
    assert.equal(t.content.charCodeAt(0), 0xFEFF);
    assert.equal(t.content.trim().split(/\r?\n/).length, 2);
  }
  assert.equal(crm.templateCsv('khac'), null);
  // File mẫu đọc lại được bằng parser và qua được bước kiểm tra
  const { records } = csv.parseCsv(crm.templateCsv('materials').content);
  const v = crm.validateMaterialRow(records[0], { existingCodes: new Set(), seenCodes: new Set() });
  assert.equal(v.ok, true, v.errors.join(' '));
});

// ---------------- Giá cũ ----------------
test('giá cũ: chỉ lấy vật tư có định mức; chưa có giá lên đầu; mốc N ngày', () => {
  const m = (code, over = {}) => ({ _id: code, code, name: code, unit: 'kg', normPerM2: 1, isActive: true, ...over });
  const entries = [
    { material: m('FRESH'), prices: [{ price: 10, priceDate: daysAgo(10) }] },
    { material: m('OLD'), prices: [{ price: 10, priceDate: daysAgo(200) }, { price: 10, priceDate: daysAgo(150) }] },
    { material: m('EDGE'), prices: [{ price: 10, priceDate: daysAgo(120) }] },
    { material: m('NONE'), prices: [] },
    { material: m('ZERO', { normPerM2: 0 }), prices: [] },
    { material: m('BADPRICE'), prices: [{ price: 0, priceDate: daysAgo(1) }] }
  ];
  const out = estimate.findStaleMaterials(entries, { now: NOW, days: 120 });
  assert.deepEqual(out.map(x => x.code), ['BADPRICE', 'NONE', 'OLD', 'EDGE']);
  assert.equal(out.find(x => x.code === 'OLD').daysSince, 150); // báo giá gần nhất
  assert.equal(out.find(x => x.code === 'NONE').neverQuoted, true);
  assert.equal(estimate.findStaleMaterials(entries, { now: NOW, days: 365 }).length, 2);
});

// ---------------- Phân quyền & lịch gọi lại ----------------
test('phân quyền lead: admin sửa hết, staff chỉ lead mình hoặc chưa giao', () => {
  const staff = { userId: 'u1', role: 'staff' };
  const admin = { userId: 'a1', role: 'admin' };
  assert.equal(crm.canEditLead(staff, { assignedTo: null }), true);
  assert.equal(crm.canEditLead(staff, { assignedTo: 'u1' }), true);
  assert.equal(crm.canEditLead(staff, { assignedTo: { _id: 'u1' } }), true);
  assert.equal(crm.canEditLead(staff, { assignedTo: 'u2' }), false);
  assert.equal(crm.canEditLead(admin, { assignedTo: 'u2' }), true);
  assert.equal(crm.canEditLead({ userId: 'c1', role: 'customer_pro' }, { assignedTo: null }), false);
});

test('follow-ups: lọc theo người, quá hạn / hôm nay / tuần, bỏ lead đã đóng', () => {
  const L = (id, at, over = {}) => ({ _id: id, status: 'new', assignedTo: 'u1', followUpAt: at, ...over });
  const leads = [
    L('late', daysAgo(2)),
    L('earlier-today', new Date('2026-11-12T01:00:00Z')), // 08:00 VN, đã qua
    L('later-today', new Date('2026-11-12T10:00:00Z')),   // 17:00 VN
    L('tomorrow', new Date('2026-11-13T03:00:00Z')),
    L('next-month', new Date('2026-12-30T03:00:00Z')),
    L('others', daysAgo(1), { assignedTo: 'u2' }),
    L('closed', daysAgo(1), { status: 'lost' }),
    L('no-date', null)
  ];
  const ids = o => crm.filterFollowUps(leads, { userId: 'u1', now: NOW, ...o }).map(l => l._id);

  assert.deepEqual(ids({ due: 'overdue' }), ['late', 'earlier-today']);
  assert.deepEqual(ids({ due: 'today' }), ['earlier-today', 'later-today']);
  assert.deepEqual(ids({ due: 'week' }), ['late', 'earlier-today', 'later-today', 'tomorrow'].filter(x => x !== 'late'));
  assert.deepEqual(ids({ scope: 'all', due: 'overdue' }), ['late', 'others', 'earlier-today']);
  assert.ok(!ids({}).includes('closed'));
  assert.ok(ids({}).includes('next-month'));
});

test('bảng đếm: theo trạng thái, người phụ trách và quá hạn', () => {
  const staff = [{ _id: 'u1', fullName: 'Lan', role: 'staff' }, { _id: 'u2', username: 'minh', role: 'staff' }];
  const leads = [
    { status: 'new', assignedTo: 'u1', followUpAt: daysAgo(1) },
    { status: 'contacted', assignedTo: { _id: 'u1' } },
    { status: 'new', assignedTo: null },
    { status: 'lost', assignedTo: 'u2', followUpAt: daysAgo(3) }
  ];
  const b = crm.buildBoard(leads, staff, NOW);
  assert.equal(b.total, 4);
  assert.equal(b.byStatus.new, 2);
  assert.equal(b.overdue, 1); // lead đã mất không tính quá hạn
  assert.equal(b.unassigned.total, 1);
  const lan = b.byAssignee.find(p => p.userId === 'u1');
  assert.equal(lan.total, 2);
  assert.equal(lan.overdue, 1);
  assert.equal(b.byAssignee.find(p => p.userId === 'u2').name, 'minh');
});
