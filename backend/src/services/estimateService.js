// =============================================================
// DỰ TOÁN SƠ BỘ TỰ ĐỘNG
//
//   khối lượng = định mức vật tư (normPerM2) x diện tích x hệ số hiện trạng
//   đơn giá    = trung vị các báo giá còn mới trong bảng MarketPrice
//   kết quả    = khoảng giá THẤP - CAO + độ tin cậy (không phải một con số cứng)
//
// Không bịa số: không có dữ liệu vật tư/giá thì trả về available = false
// để đội MAC tự báo giá, thay vì đưa con số giả cho khách.
// =============================================================
const DAY_MS = 24 * 60 * 60 * 1000;

const envNumber = (value, fallback) =>
  value === undefined || String(value).trim() === '' || !Number.isFinite(Number(value))
    ? fallback
    : Number(value);

const PRICE_MAX_AGE_DAYS = envNumber(process.env.ESTIMATE_PRICE_MAX_AGE_DAYS, 120);
const CONTINGENCY_PCT = envNumber(process.env.ESTIMATE_CONTINGENCY_PCT, 5);

// Hệ số khối lượng theo hiện trạng. Nhà đã có trên đất → cải tạo, giữ lại một phần kết cấu.
// Chỉnh các con số này theo thực tế thi công của MAC.
const SITE_FACTORS = {
  'dat-trong': {},
  'co-nha-tren-dat': { 'ket-cau': 0.35, tuong: 0.7, san: 0.8, tran: 0.8 }
};

const lower = v => String(v ?? '').trim().toLowerCase();
const round = (v, digits = 0) => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

function median(sortedValues) {
  const n = sortedValues.length;
  if (!n) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 ? sortedValues[mid] : (sortedValues[mid - 1] + sortedValues[mid]) / 2;
}

// Làm tròn cho dễ đọc: >= 10 triệu → bội số 1 triệu, nhỏ hơn → bội số 100 nghìn
function roundNice(value) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const step = value >= 10_000_000 ? 1_000_000 : 100_000;
  return Math.round(value / step) * step;
}

// Vật tư có tham gia dự toán cho concept này không
function isRelevant(material, { style, spaceType, mainMaterials }) {
  if (!(Number(material.normPerM2) > 0)) return false;

  const styles = (material.styleTags || []).map(lower).filter(Boolean);
  if (styles.length && !styles.includes(lower(style))) {
    // Khách chọn đúng chất liệu này (vd "Gỗ tự nhiên") thì vẫn đưa vào dù khác style
    const pickedByCustomer = (mainMaterials || []).some(m => lower(material.name).includes(lower(m)));
    if (!pickedByCustomer) return false;
  }

  const spaces = (material.spaceTypes || []).map(lower).filter(Boolean);
  if (spaces.length && !spaces.includes(lower(spaceType))) return false;

  return true;
}

// Chọn đơn giá từ các báo giá: ưu tiên báo giá còn mới, lấy trung vị, khoảng = min..max
function pickPrice(prices, now = new Date()) {
  const valid = (prices || []).filter(p => Number.isFinite(Number(p.price)) && Number(p.price) > 0);
  if (!valid.length) return null;

  const sorted = [...valid].sort((a, b) => new Date(b.priceDate) - new Date(a.priceDate));
  const cutoff = now.getTime() - PRICE_MAX_AGE_DAYS * DAY_MS;
  const fresh = sorted.filter(p => new Date(p.priceDate).getTime() >= cutoff);
  const pool = (fresh.length ? fresh : sorted.slice(0, 3)).slice(0, 8);

  const values = pool.map(p => Number(p.price)).sort((a, b) => a - b);
  const mid = median(values);
  let low = values[0];
  let high = values[values.length - 1];
  // Chỉ có một mức giá → nới ±8% để phản ánh độ không chắc chắn
  if (low === high) {
    low = mid * 0.92;
    high = mid * 1.08;
  }

  return {
    unitPrice: round(mid),
    low: round(low),
    high: round(high),
    fresh: fresh.length > 0,
    quotes: pool.length,
    latestDate: sorted[0].priceDate
  };
}

function confidenceOf(itemCount, freshCount) {
  if (!itemCount) return 'thap';
  const freshRatio = freshCount / itemCount;
  if (itemCount >= 8 && freshRatio >= 0.8) return 'cao';
  if (itemCount >= 4 && freshRatio >= 0.5) return 'trung-binh';
  return 'thap';
}

// Tính tổng cho BOQ: dùng chung cho dự toán AI và khi staff chỉnh sửa
function calcTotals(items, contingencyPct = 0, vatPct = 0) {
  const normalized = (items || []).map(it => {
    const quantity = Math.max(0, Number(it.quantity) || 0);
    const unitPrice = Math.max(0, Number(it.unitPrice) || 0);
    return { ...it, quantity, unitPrice, totalPrice: round(quantity * unitPrice) };
  });
  const subtotal = normalized.reduce((s, it) => s + it.totalPrice, 0);
  const contingency = round(subtotal * (Math.max(0, Number(contingencyPct) || 0) / 100));
  const vat = round((subtotal + contingency) * (Math.max(0, Number(vatPct) || 0) / 100));
  return { items: normalized, subtotal, contingency, vat, total: subtotal + contingency + vat };
}

// -------------------------------------------------------------
// Lõi tính toán (hàm thuần, dễ kiểm thử)
// materials: [{ material, prices: [{ price, priceDate, supplier }] }]
// -------------------------------------------------------------
function computeEstimate({
  area,
  siteStatus = 'dat-trong',
  style = '',
  spaceType = '',
  mainMaterials = [],
  estimatedBudget = 0,
  materials = [],
  now = new Date()
}) {
  const numArea = Number(area) || 0;
  const factors = SITE_FACTORS[siteStatus] || {};
  const items = [];
  const missingPrice = [];

  for (const entry of materials) {
    const mat = entry.material;
    if (!isRelevant(mat, { style, spaceType, mainMaterials })) continue;

    const price = pickPrice(entry.prices, now);
    if (!price) {
      missingPrice.push({ code: mat.code, name: mat.name });
      continue;
    }

    const factor = factors[mat.category] ?? 1;
    const quantity = round(Number(mat.normPerM2) * numArea * factor, 2);
    items.push({
      materialId: mat._id,
      code: mat.code,
      name: mat.name,
      category: mat.category,
      unit: mat.unit,
      quantity,
      unitPrice: price.unitPrice,
      priceLow: price.low,
      priceHigh: price.high,
      totalPrice: round(quantity * price.unitPrice),
      totalLow: round(quantity * price.low),
      totalHigh: round(quantity * price.high),
      fresh: price.fresh,
      quotes: price.quotes,
      latestPriceDate: price.latestDate
    });
  }

  const assumptions = [
    `Tính trên 1 sàn xây dựng bằng diện tích mặt bằng (${numArea} m²). Công trình nhiều tầng sẽ nhân tương ứng.`,
    siteStatus === 'co-nha-tren-dat'
      ? 'Hiện trạng có nhà trên đất: giả định cải tạo, giữ lại một phần kết cấu (hệ số khối lượng giảm).'
      : 'Hiện trạng đất trống: tính đầy đủ hạng mục xây mới.',
    `Đã cộng dự phòng ${CONTINGENCY_PCT}%, chưa bao gồm VAT, chi phí thiết kế và giấy phép.`
  ];

  if (!items.length) {
    return {
      available: false,
      area: numArea,
      siteStatus,
      style,
      spaceType,
      items: [],
      missingPrice,
      subtotal: 0,
      contingencyPct: CONTINGENCY_PCT,
      contingency: 0,
      total: 0,
      rangeLow: 0,
      rangeHigh: 0,
      perM2: { low: 0, mid: 0, high: 0 },
      confidence: 'thap',
      budget: { requested: Number(estimatedBudget) || 0, status: 'khong-xac-dinh' },
      assumptions,
      generatedAt: now.toISOString()
    };
  }

  const sumMid = items.reduce((s, it) => s + it.totalPrice, 0);
  const sumLow = items.reduce((s, it) => s + it.totalLow, 0);
  const sumHigh = items.reduce((s, it) => s + it.totalHigh, 0);
  const k = 1 + CONTINGENCY_PCT / 100;

  const rangeLow = round(sumLow * k);
  const rangeHigh = round(sumHigh * k);
  const total = round(sumMid * k);
  const freshCount = items.filter(it => it.fresh).length;

  const requested = Number(estimatedBudget) || 0;
  let budgetStatus = 'khong-xac-dinh';
  if (requested > 0) {
    if (rangeHigh <= requested) budgetStatus = 'trong-ngan-sach';
    else if (rangeLow > requested) budgetStatus = 'vuot-ngan-sach';
    else budgetStatus = 'sat-ngan-sach';
  }

  assumptions.push(
    `Giá vật tư lấy từ báo giá trong ${PRICE_MAX_AGE_DAYS} ngày gần nhất (${freshCount}/${items.length} hạng mục có giá còn mới).`
  );
  if (missingPrice.length) {
    assumptions.push(`${missingPrice.length} hạng mục chưa có báo giá nên chưa được tính.`);
  }

  return {
    available: true,
    area: numArea,
    siteStatus,
    style,
    spaceType,
    items,
    missingPrice,
    subtotal: sumMid,
    contingencyPct: CONTINGENCY_PCT,
    contingency: round(sumMid * (CONTINGENCY_PCT / 100)),
    total,
    rangeLow,
    rangeHigh,
    perM2: numArea
      ? { low: round(rangeLow / numArea), mid: round(total / numArea), high: round(rangeHigh / numArea) }
      : { low: 0, mid: 0, high: 0 },
    confidence: confidenceOf(items.length, freshCount),
    budget: { requested, status: budgetStatus },
    assumptions,
    generatedAt: now.toISOString()
  };
}

// Bản cho khách xem: chỉ khoảng giá làm tròn, không lộ hạng mục và đơn giá nội bộ
function toPublicEstimate(estimate) {
  if (!estimate || !estimate.available) {
    return {
      available: false,
      message: 'Đội ngũ MAC sẽ gửi dự toán chi tiết sau khi khảo sát nhu cầu của bạn.'
    };
  }
  return {
    available: true,
    area: estimate.area,
    rangeLow: roundNice(estimate.rangeLow),
    rangeHigh: roundNice(estimate.rangeHigh),
    perM2: { low: roundNice(estimate.perM2.low), high: roundNice(estimate.perM2.high) },
    confidence: estimate.confidence,
    budgetStatus: estimate.budget?.status || 'khong-xac-dinh',
    assumptions: estimate.assumptions,
    disclaimer: 'Đây là khoảng giá tham khảo sơ bộ. Giá chính xác được chốt sau khi MAC khảo sát hiện trạng và bóc tách khối lượng chi tiết.'
  };
}

// -------------------------------------------------------------
// Phần dùng database
// -------------------------------------------------------------
async function loadMaterialsWithPrices(city) {
  const Material = require('../models/Material');
  const MarketPrice = require('../models/MarketPrice');

  const materials = await Material.find({ isActive: true, normPerM2: { $gt: 0 } }).lean();
  if (!materials.length) return [];

  const prices = await MarketPrice.find({
    materialId: { $in: materials.map(m => m._id) },
    isActive: true
  }).sort({ priceDate: -1 }).lean();

  const byMaterial = new Map();
  for (const p of prices) {
    const key = String(p.materialId);
    if (!byMaterial.has(key)) byMaterial.set(key, []);
    byMaterial.get(key).push(p);
  }

  const region = lower(city);
  return materials.map(material => {
    const all = byMaterial.get(String(material._id)) || [];
    // Ưu tiên báo giá cùng khu vực với dự án; nếu chưa có thì dùng tất cả
    const sameRegion = region ? all.filter(p => lower(p.region) === region) : [];
    return { material, prices: sameRegion.length ? sameRegion : all };
  });
}

// -------------------------------------------------------------
// Vật tư có định mức nhưng giá đã cũ hoặc chưa có báo giá
// entries: [{ material, prices }] (cùng dạng loadMaterialsWithPrices)
// Không đổi cách tính dự toán; chỉ để nhắc cập nhật giá.
// -------------------------------------------------------------
function findStaleMaterials(entries, { now = new Date(), days = PRICE_MAX_AGE_DAYS } = {}) {
  const limit = Number.isFinite(Number(days)) && Number(days) > 0 ? Number(days) : PRICE_MAX_AGE_DAYS;
  const out = [];
  for (const { material, prices } of entries || []) {
    if (!material || !(Number(material.normPerM2) > 0)) continue;
    if (material.isActive === false) continue;

    const dates = (prices || [])
      .filter(p => Number(p.price) > 0 && p.priceDate && !Number.isNaN(new Date(p.priceDate).getTime()))
      .map(p => new Date(p.priceDate).getTime());
    const latest = dates.length ? Math.max(...dates) : null;
    const daysSince = latest === null ? null : Math.max(0, Math.floor((now.getTime() - latest) / DAY_MS));

    if (latest === null || daysSince >= limit) {
      out.push({
        _id: material._id,
        code: material.code,
        name: material.name,
        category: material.category,
        unit: material.unit,
        normPerM2: material.normPerM2,
        latestPriceDate: latest === null ? null : new Date(latest).toISOString(),
        daysSince,
        neverQuoted: latest === null
      });
    }
  }
  // Chưa có báo giá lên đầu, rồi đến báo giá cũ nhất
  return out.sort((a, b) => (b.daysSince ?? Infinity) - (a.daysSince ?? Infinity) || String(a.code).localeCompare(String(b.code)));
}

async function loadStaleMaterials({ days, now = new Date() } = {}) {
  // Gom tất cả báo giá (mọi khu vực): khu vực nào có giá mới thì vật tư coi như còn mới
  const entries = await loadMaterialsWithPrices('');
  return findStaleMaterials(entries, { now, days });
}

async function buildEstimateForPlan(floorPlan, concept) {
  const materials = await loadMaterialsWithPrices(floorPlan.city);
  return computeEstimate({
    area: floorPlan.totalArea || floorPlan.width * floorPlan.length,
    siteStatus: floorPlan.siteStatus,
    style: concept?.style,
    spaceType: concept?.spaceType,
    mainMaterials: concept?.mainMaterials,
    estimatedBudget: concept?.estimatedBudget,
    materials
  });
}

// Tạo (hoặc làm mới) BOQ nháp cho staff duyệt. Không ghi đè BOQ staff đã chỉnh/duyệt.
async function upsertBoqDraft({ floorPlan, estimate, renderId }) {
  if (!estimate?.available) return null;
  const BOQ = require('../models/BOQ');

  const existing = await BOQ.findOne({ floorPlanId: floorPlan._id }).sort({ createdAt: -1 });
  if (existing && !(existing.source === 'ai-generated' && existing.status === 'draft')) {
    return existing;
  }

  const totals = calcTotals(
    estimate.items.map(it => ({
      materialId: it.materialId,
      materialName: it.name,
      unit: it.unit,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      notes: `Khoảng giá ${it.priceLow.toLocaleString('vi-VN')} - ${it.priceHigh.toLocaleString('vi-VN')} đ/${it.unit}`
    })),
    estimate.contingencyPct,
    0
  );

  const data = {
    floorPlanId: floorPlan._id,
    userId: floorPlan.userId,
    title: `Dự toán sơ bộ AI - ${floorPlan.projectName}`,
    items: totals.items,
    contingencyPct: estimate.contingencyPct,
    vatPct: 0,
    subtotal: totals.subtotal,
    contingency: totals.contingency,
    vat: totals.vat,
    total: totals.total,
    rangeLow: estimate.rangeLow,
    rangeHigh: estimate.rangeHigh,
    confidence: estimate.confidence,
    assumptions: estimate.assumptions,
    renderId: renderId || null,
    source: 'ai-generated',
    status: 'draft'
  };

  if (existing) {
    Object.assign(existing, data);
    await existing.save();
    return existing;
  }
  return BOQ.create(data);
}

module.exports = {
  computeEstimate,
  toPublicEstimate,
  calcTotals,
  pickPrice,
  isRelevant,
  roundNice,
  buildEstimateForPlan,
  loadMaterialsWithPrices,
  findStaleMaterials,
  loadStaleMaterials,
  PRICE_MAX_AGE_DAYS,
  upsertBoqDraft,
  SITE_FACTORS,
  CONTINGENCY_PCT
};
