// =============================================================
// VẬT TƯ - GIÁ - TELESALE (khu vực C)
//  1. Nhập vật tư / báo giá từ file CSV (kiểm tra từng dòng, dryRun)
//  2. Vật tư giá cũ
//  3. CRM nhẹ: phân quyền sửa lead, lịch gọi lại, bảng đếm
// Phần lớn là hàm thuần để kiểm thử không cần database.
// =============================================================
const DAY_MS = 24 * 60 * 60 * 1000;
const TZ = 'Asia/Ho_Chi_Minh';
const VN_OFFSET = '+07:00'; // Việt Nam không có giờ mùa hè
const MAX_IMPORT_ROWS = 500;

const CATEGORY_LABELS = {
  'ket-cau': 'Kết cấu', 'hoan-thien': 'Hoàn thiện', 'noi-that': 'Nội thất', dien: 'Điện',
  nuoc: 'Nước', den: 'Đèn', san: 'Sàn', tran: 'Trần', tuong: 'Tường', cua: 'Cửa', khac: 'Khác'
};
const SOURCE_LABELS = {
  'khao-sat': 'Khảo sát', 'bao-gia-ncc': 'Báo giá NCC', website: 'Website', 'noi-bo': 'Nội bộ'
};

// -------------------------------------------------------------
// Tiện ích chuỗi / số / ngày
// -------------------------------------------------------------
const canonKey = v => String(v ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]/g, '');

const CATEGORY_BY_KEY = Object.fromEntries(
  Object.entries(CATEGORY_LABELS).flatMap(([slug, label]) => [[canonKey(slug), slug], [canonKey(label), slug]])
);
const SOURCE_BY_KEY = Object.fromEntries(
  Object.entries(SOURCE_LABELS).flatMap(([slug, label]) => [[canonKey(slug), slug], [canonKey(label), slug]])
);

// "1.200.000" → 1200000; "1,5" → 1.5; "1.200" → 1200; "0.25" → 0.25; sai → NaN
function parseVnNumber(value, opts = {}) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  let s = String(value ?? '').trim().toLowerCase();
  if (!s) return NaN;
  // Chế độ số thập phân (định mức): '.' hoặc ',' luôn là dấu thập phân, '1.250' = 1,25
  if (opts.decimal) {
    if (!/^\d+([.,]\d+)?$/.test(s)) return NaN;
    return Number(s.replace(',', '.'));
  }
  s = s.replace(/\s|vn[đd]|đ|₫|d$/g, '');
  if (!/^-?[\d.,]+$/.test(s)) return NaN;
  const neg = s.startsWith('-');
  s = s.replace('-', '');
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot >= 0 && lastComma >= 0) {
    const dec = lastDot > lastComma ? '.' : ',';
    const thou = dec === '.' ? ',' : '.';
    s = s.split(thou).join('').replace(dec, '.');
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? '.' : ',';
    const parts = s.split(sep);
    if (parts.length > 2) {
      if (!parts.slice(1).every(p => p.length === 3)) return NaN;
      s = parts.join('');
    } else if (parts[1].length === 3 && /^[1-9]\d{0,2}$/.test(parts[0])) {
      s = parts.join('');
    } else {
      s = `${parts[0]}.${parts[1]}`;
    }
  }
  const n = Number(s);
  return Number.isFinite(n) ? (neg ? -n : n) : NaN;
}

// Ngày theo giờ Việt Nam dạng YYYY-MM-DD
function dateKeyVN(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const get = t => parts.find(p => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
const startOfDayVN = (date = new Date()) => new Date(`${dateKeyVN(date)}T00:00:00${VN_OFFSET}`);

// Nhận yyyy-mm-dd, dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy; trả { key, date } hoặc null
function parseDateVN(value) {
  const s = String(value ?? '').trim();
  let y; let m; let d;
  let match = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) [, y, m, d] = match;
  else if ((match = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) [, d, m, y] = match;
  else return null;
  y = Number(y); m = Number(m); d = Number(d);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return { key, date: new Date(`${key}T00:00:00${VN_OFFSET}`) };
}

// -------------------------------------------------------------
// Chuẩn hoá tiêu đề cột (chấp nhận tiếng Anh lẫn tiếng Việt)
// -------------------------------------------------------------
const MATERIAL_ALIASES = {
  code: ['code', 'ma', 'mavattu', 'mavt'],
  name: ['name', 'ten', 'tenvattu'],
  category: ['category', 'phanloai', 'nhom', 'loai'],
  unit: ['unit', 'dvt', 'donvi', 'donvitinh'],
  normPerM2: ['normperm2', 'normperm', 'dinhmuc', 'dinhmucm2', 'dinhmucm'],
  brand: ['brand', 'thuonghieu'],
  origin: ['origin', 'xuatxu'],
  specification: ['specification', 'quycach'],
  notes: ['notes', 'note', 'ghichu']
};
const PRICE_ALIASES = {
  materialCode: ['materialcode', 'mavattu', 'mavt', 'code', 'ma'],
  price: ['price', 'dongia', 'gia'],
  unit: ['unit', 'dvt', 'donvi', 'donvitinh'],
  supplier: ['supplier', 'nhacungcap', 'ncc'],
  region: ['region', 'khuvuc'],
  priceDate: ['pricedate', 'ngay', 'ngaybaogia', 'date'],
  source: ['source', 'nguon'],
  notes: ['notes', 'note', 'ghichu']
};

function normalizeRow(raw, aliases) {
  const byKey = new Map();
  for (const [k, v] of Object.entries(raw && typeof raw === 'object' ? raw : {})) byKey.set(canonKey(k), v);
  const out = {};
  for (const [field, names] of Object.entries(aliases)) {
    for (const n of names) {
      if (byKey.has(n)) { out[field] = String(byKey.get(n) ?? '').trim(); break; }
    }
    if (out[field] === undefined) out[field] = '';
  }
  return out;
}

// -------------------------------------------------------------
// Kiểm tra một dòng vật tư
// ctx: { existingCodes: Set<string>, seenCodes: Set<string> }
// -------------------------------------------------------------
function validateMaterialRow(raw, ctx = {}) {
  const r = normalizeRow(raw, MATERIAL_ALIASES);
  const errors = [];
  const code = r.code.toUpperCase();

  if (!code) errors.push('Thiếu mã vật tư.');
  else if (!/^[A-Z0-9][A-Z0-9._\-/]{0,39}$/.test(code)) errors.push('Mã vật tư chỉ gồm chữ không dấu, số, và các ký tự . _ - / (không có khoảng trắng).');

  if (code && ctx.seenCodes) {
    if (ctx.seenCodes.has(code)) errors.push(`Mã ${code} bị lặp trong file.`);
    ctx.seenCodes.add(code);
  }

  const exists = !!(code && ctx.existingCodes && ctx.existingCodes.has(code));
  const action = exists ? 'update' : 'create';
  const data = { code };

  if (r.name) data.name = r.name.slice(0, 200);
  else if (!exists) errors.push('Thiếu tên vật tư.');

  if (r.category) {
    const slug = CATEGORY_BY_KEY[canonKey(r.category)];
    if (slug) data.category = slug;
    else errors.push(`Phân loại "${r.category}" không hợp lệ (dùng: ${Object.keys(CATEGORY_LABELS).join(', ')}).`);
  } else if (!exists) errors.push('Thiếu phân loại.');

  if (r.unit) data.unit = r.unit.slice(0, 30);
  else if (!exists) errors.push('Thiếu đơn vị tính.');

  if (r.normPerM2 !== '') {
    const n = parseVnNumber(r.normPerM2, { decimal: true });
    if (!Number.isFinite(n) || n < 0) errors.push('Định mức phải là số từ 0 trở lên.');
    else if (n > 200) errors.push('Định mức trên 200 mỗi m² là bất thường, vui lòng kiểm tra lại dấu thập phân.');
    else data.normPerM2 = n;
  } else if (!exists) data.normPerM2 = 0;

  for (const f of ['brand', 'origin', 'specification', 'notes']) {
    if (r[f]) data[f] = r[f].slice(0, 500);
  }

  return { ok: errors.length === 0, errors, action, data };
}

// -------------------------------------------------------------
// Kiểm tra một dòng báo giá
// ctx: { materialsByCode: Map<code, {_id, unit}>, now: Date }
// -------------------------------------------------------------
function validateMarketPriceRow(raw, ctx = {}) {
  const r = normalizeRow(raw, PRICE_ALIASES);
  const now = ctx.now || new Date();
  const errors = [];
  const code = r.materialCode.toUpperCase();
  const data = {};

  const material = code && ctx.materialsByCode ? ctx.materialsByCode.get(code) : null;
  if (!code) errors.push('Thiếu mã vật tư (materialCode).');
  else if (!material) errors.push(`Không tìm thấy vật tư có mã ${code}. Hãy nhập vật tư trước.`);
  else data.materialId = material._id;

  if (r.price === '') errors.push('Thiếu đơn giá.');
  else {
    const p = parseVnNumber(r.price);
    if (!Number.isFinite(p)) errors.push(`Đơn giá "${r.price}" không phải là số.`);
    else if (p <= 0) errors.push('Đơn giá phải lớn hơn 0.');
    else data.price = Math.round(p);
  }

  if (material) {
    if (r.unit && canonKey(r.unit) !== canonKey(material.unit)) {
      errors.push(`Đơn vị "${r.unit}" khác đơn vị của vật tư (${material.unit}).`);
    }
    data.unit = material.unit;
  }

  let dateKey = dateKeyVN(now);
  let date = startOfDayVN(now);
  if (r.priceDate) {
    const parsed = parseDateVN(r.priceDate);
    if (!parsed) errors.push(`Ngày "${r.priceDate}" không hợp lệ (dùng dd/mm/yyyy hoặc yyyy-mm-dd).`);
    else if (parsed.date.getTime() > now.getTime() + DAY_MS) errors.push('Ngày báo giá ở tương lai.');
    else { dateKey = parsed.key; date = parsed.date; }
  }
  data.priceDate = date;

  if (r.source) {
    const slug = SOURCE_BY_KEY[canonKey(r.source)];
    if (slug) data.source = slug;
    else errors.push(`Nguồn "${r.source}" không hợp lệ (dùng: ${Object.keys(SOURCE_LABELS).join(', ')}).`);
  } else data.source = 'bao-gia-ncc';

  data.supplier = r.supplier.slice(0, 200);
  data.region = r.region.slice(0, 100) || 'TP.HCM';
  if (r.notes) data.notes = r.notes.slice(0, 500);

  return { ok: errors.length === 0, errors, data, materialCode: code, dateKey };
}

const priceKey = (materialId, supplier, region, dateKey) =>
  [String(materialId), canonKey(supplier), canonKey(region), dateKey].join('|');

function checkRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    const e = new Error('Chưa có dòng dữ liệu nào để nhập.');
    e.status = 400;
    throw e;
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    const e = new Error(`Mỗi lần nhập tối đa ${MAX_IMPORT_ROWS} dòng (file có ${rows.length} dòng). Hãy tách file.`);
    e.status = 400;
    throw e;
  }
}

function summarize(results, dryRun) {
  return {
    dryRun: !!dryRun,
    total: results.length,
    created: results.filter(r => r.ok && r.action === 'create').length,
    updated: results.filter(r => r.ok && r.action === 'update').length,
    failed: results.filter(r => !r.ok).length,
    results
  };
}

// -------------------------------------------------------------
// Nhập vật tư (upsert theo code). Dòng lỗi bị bỏ qua, dòng đúng vẫn được ghi.
// -------------------------------------------------------------
async function importMaterials(rows, { dryRun = true } = {}) {
  checkRows(rows);
  const Material = require('../models/Material');

  const codes = [...new Set(rows.map(r => normalizeRow(r, MATERIAL_ALIASES).code.toUpperCase()).filter(Boolean))];
  const found = codes.length ? await Material.find({ code: { $in: codes } }).select('code').lean() : [];
  const existingCodes = new Set(found.map(m => m.code));
  const seenCodes = new Set();

  const validated = rows.map(raw => validateMaterialRow(raw, { existingCodes, seenCodes }));
  const results = validated.map((v, i) => ({
    row: i + 2, // dòng 1 là tiêu đề
    code: v.data.code || '',
    name: v.data.name || '',
    ok: v.ok,
    errors: v.errors,
    action: v.action
  }));

  if (!dryRun) {
    const ops = validated.filter(v => v.ok).map(v => ({
      updateOne: {
        filter: { code: v.data.code },
        update: { $set: v.data, $setOnInsert: { isActive: true } },
        upsert: true
      }
    }));
    if (ops.length) await Material.bulkWrite(ops, { ordered: false });
  }
  return summarize(results, dryRun);
}

// -------------------------------------------------------------
// Nhập báo giá. Cùng vật tư + NCC + khu vực + ngày → cập nhật giá thay vì tạo trùng.
// -------------------------------------------------------------
async function importMarketPrices(rows, { dryRun = true, now = new Date() } = {}) {
  checkRows(rows);
  const Material = require('../models/Material');
  const MarketPrice = require('../models/MarketPrice');

  const codes = [...new Set(rows.map(r => normalizeRow(r, PRICE_ALIASES).materialCode.toUpperCase()).filter(Boolean))];
  const mats = codes.length ? await Material.find({ code: { $in: codes } }).select('code unit').lean() : [];
  const materialsByCode = new Map(mats.map(m => [m.code, { _id: m._id, unit: m.unit }]));

  const validated = rows.map(raw => validateMarketPriceRow(raw, { materialsByCode, now }));

  // Báo giá đã có cùng ngày để quyết định create/update
  const existingByKey = new Map();
  const okOnes = validated.filter(v => v.ok);
  if (okOnes.length) {
    const dates = okOnes.map(v => v.data.priceDate.getTime());
    const existing = await MarketPrice.find({
      materialId: { $in: [...new Set(okOnes.map(v => v.data.materialId))] },
      priceDate: { $gte: new Date(Math.min(...dates)), $lt: new Date(Math.max(...dates) + DAY_MS) }
    }).select('materialId supplier region priceDate').lean();
    for (const e of existing) {
      existingByKey.set(priceKey(e.materialId, e.supplier, e.region, dateKeyVN(new Date(e.priceDate))), e._id);
    }
  }

  const writes = [];
  const results = validated.map((v, i) => {
    let action = 'create';
    let existingId = null;
    if (v.ok) {
      const k = priceKey(v.data.materialId, v.data.supplier, v.data.region, v.dateKey);
      existingId = existingByKey.get(k) || null;
      if (existingId) action = 'update';
      else existingByKey.set(k, 'pending'); // dòng lặp trong file → dòng sau là cập nhật dòng trước
      writes.push({ v, existingId });
    }
    return { row: i + 2, code: v.materialCode, price: v.data.price || null, ok: v.ok, errors: v.errors, action };
  });

  if (!dryRun) {
    const toInsert = [];
    const ops = [];
    for (const { v, existingId } of writes) {
      if (existingId && existingId !== 'pending') {
        ops.push({ updateOne: { filter: { _id: existingId }, update: { $set: { ...v.data, isActive: true } } } });
      } else toInsert.push({ ...v.data, isActive: true });
    }
    // Dòng lặp trong cùng file: lấy dòng cuối cùng
    const uniq = new Map();
    for (const doc of toInsert) uniq.set(priceKey(doc.materialId, doc.supplier, doc.region, dateKeyVN(doc.priceDate)), doc);
    if (uniq.size) await MarketPrice.insertMany([...uniq.values()]);
    if (ops.length) await MarketPrice.bulkWrite(ops, { ordered: false });
  }
  return summarize(results, dryRun);
}

// -------------------------------------------------------------
// File CSV mẫu (BOM UTF-8 để Excel đọc đúng tiếng Việt)
// -------------------------------------------------------------
const csvCell = v => (/[",\r\n;]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const buildCsv = (header, example) =>
  `﻿${header.join(',')}\r\n${example.map(csvCell).join(',')}\r\n`;

const TEMPLATES = {
  materials: {
    filename: 'mau-nhap-vat-tu.csv',
    header: ['code', 'name', 'category', 'unit', 'normPerM2', 'brand', 'origin', 'specification', 'notes'],
    example: ['XM-PCB40', 'Xi măng PCB40', 'ket-cau', 'kg', '45', 'Hà Tiên', 'Việt Nam', 'Bao 50kg', 'Dùng cho đổ bê tông, tô trát']
  },
  'market-prices': {
    filename: 'mau-nhap-bao-gia.csv',
    header: ['materialCode', 'price', 'unit', 'supplier', 'region', 'priceDate', 'source', 'notes'],
    example: ['XM-PCB40', '1850', 'kg', 'Đại lý VLXD (tên NCC)', 'TP.HCM', dateKeyVN(new Date()), 'bao-gia-ncc', 'Đã gồm vận chuyển nội thành']
  }
};
function templateCsv(kind) {
  const t = TEMPLATES[kind];
  return t ? { filename: t.filename, content: buildCsv(t.header, t.example) } : null;
}

// -------------------------------------------------------------
// Phân quyền & lọc lead
// -------------------------------------------------------------
const idOf = v => (v && typeof v === 'object' && v._id ? String(v._id) : v ? String(v) : '');

// admin sửa tất cả; nhân viên chỉ sửa lead mình phụ trách hoặc lead chưa giao
function canEditLead(user, lead) {
  if (!user || !lead) return false;
  if (user.role === 'admin') return true;
  if (user.role !== 'staff') return false;
  const owner = idOf(lead.assignedTo);
  return !owner || owner === String(user.userId);
}

const CLOSED_STATUSES = ['converted', 'lost'];

// scope: mine|all; due: overdue | today | week | (bỏ trống = mọi lead có lịch gọi lại)
//  overdue: đã quá hạn (trước bây giờ); today: trong ngày hôm nay (giờ VN);
//  week: từ đầu hôm nay tới hết 7 ngày
function filterFollowUps(leads, { scope = 'mine', due, userId, now = new Date() } = {}) {
  const dayStart = startOfDayVN(now).getTime();
  const dayEnd = dayStart + DAY_MS;
  const weekEnd = dayStart + 7 * DAY_MS;
  return (leads || [])
    .filter(l => {
      if (!l.followUpAt || CLOSED_STATUSES.includes(l.status)) return false;
      const t = new Date(l.followUpAt).getTime();
      if (Number.isNaN(t)) return false;
      if (scope !== 'all' && idOf(l.assignedTo) !== String(userId)) return false;
      if (due === 'overdue') return t < now.getTime();
      if (due === 'today') return t >= dayStart && t < dayEnd;
      if (due === 'week') return t >= dayStart && t < weekEnd;
      return true;
    })
    .sort((a, b) => new Date(a.followUpAt) - new Date(b.followUpAt));
}

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];
const emptyCounts = () => Object.fromEntries(STATUSES.map(s => [s, 0]));

// Đếm lead theo trạng thái và theo người phụ trách
function buildBoard(leads, staff = [], now = new Date()) {
  const byStatus = emptyCounts();
  const unassigned = { total: 0, byStatus: emptyCounts(), overdue: 0 };
  const people = new Map(staff.map(u => [String(u._id), {
    userId: String(u._id), name: u.fullName || u.username, role: u.role, total: 0, byStatus: emptyCounts(), overdue: 0
  }]));
  let overdue = 0;

  for (const l of leads || []) {
    const st = STATUSES.includes(l.status) ? l.status : 'new';
    byStatus[st] += 1;
    const isOverdue = !!l.followUpAt && !CLOSED_STATUSES.includes(st) && new Date(l.followUpAt).getTime() < now.getTime();
    if (isOverdue) overdue += 1;

    const owner = idOf(l.assignedTo);
    let bucket = unassigned;
    if (owner) {
      if (!people.has(owner)) {
        const populated = l.assignedTo && typeof l.assignedTo === 'object' ? l.assignedTo : {};
        people.set(owner, {
          userId: owner, name: populated.fullName || populated.username || 'Nhân viên khác', role: populated.role || '',
          total: 0, byStatus: emptyCounts(), overdue: 0
        });
      }
      bucket = people.get(owner);
    }
    bucket.total += 1;
    bucket.byStatus[st] += 1;
    if (isOverdue) bucket.overdue += 1;
  }

  return {
    total: (leads || []).length,
    overdue,
    byStatus,
    unassigned,
    byAssignee: [...people.values()].filter(p => p.total > 0 || p.role).sort((a, b) => b.total - a.total)
  };
}

module.exports = {
  MAX_IMPORT_ROWS,
  canonKey,
  parseVnNumber,
  parseDateVN,
  dateKeyVN,
  startOfDayVN,
  normalizeRow,
  validateMaterialRow,
  validateMarketPriceRow,
  importMaterials,
  importMarketPrices,
  templateCsv,
  canEditLead,
  filterFollowUps,
  buildBoard,
  idOf,
  CLOSED_STATUSES
};
