// Chạy: npm test   (Node >= 20, không cần database hay mạng)
// Các model Mongoose được giả lập để kiểm thử riêng phần logic.
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (/models\//.test(request)) return new Proxy({}, { get: () => () => {} });
  return originalLoad.call(this, request, parent, isMain);
};

delete process.env.GEMINI_API_KEY;
const estimate = require('../src/services/estimateService');
const ai = require('../src/services/aiService');
const lead = require('../src/services/leadService');
const quota = require('../src/middleware/aiQuotaMiddleware');
const { hexToColorName, getStyleGuide } = require('../src/services/designKnowledge');
const { scoreOf } = (() => {
  // engagementService nạp model thật; chỉ cần công thức nên đọc qua bản giả lập
  return require('../src/services/engagementService');
})();

const NOW = new Date('2026-10-31T10:00:00Z');
const daysAgo = n => new Date(NOW.getTime() - n * 86400000);
const mat = (over = {}) => ({
  _id: over.code || 'm1', code: 'M1', name: 'Gạch', category: 'hoan-thien', unit: 'm2', normPerM2: 1,
  styleTags: [], spaceTypes: [], ...over
});

// ---------------- Dự toán ----------------
test('dự toán: khối lượng = định mức x diện tích, giá lấy trung vị báo giá mới', () => {
  const r = estimate.computeEstimate({
    area: 80, style: 'Industrial', spaceType: 'Quán Kafe', now: NOW,
    materials: [{
      material: mat({ code: 'XM', name: 'Xi măng', unit: 'kg', normPerM2: 50, category: 'ket-cau' }),
      prices: [{ price: 1500, priceDate: daysAgo(10) }, { price: 1700, priceDate: daysAgo(20) }, { price: 1600, priceDate: daysAgo(30) }]
    }]
  });
  assert.equal(r.available, true);
  assert.equal(r.items[0].quantity, 4000);
  assert.equal(r.items[0].unitPrice, 1600);
  assert.equal(r.items[0].totalPrice, 6_400_000);
  assert.equal(r.total, Math.round(6_400_000 * 1.05));
  assert.equal(r.rangeLow, Math.round(4000 * 1500 * 1.05));
  assert.equal(r.rangeHigh, Math.round(4000 * 1700 * 1.05));
  assert.ok(r.rangeLow < r.total && r.total < r.rangeHigh);
});

test('dự toán: nhà có sẵn trên đất giảm khối lượng kết cấu', () => {
  const base = {
    area: 100, now: NOW,
    materials: [{ material: mat({ category: 'ket-cau', normPerM2: 10 }), prices: [{ price: 1000, priceDate: daysAgo(5) }] }]
  };
  const empty = estimate.computeEstimate({ ...base, siteStatus: 'dat-trong' });
  const reno = estimate.computeEstimate({ ...base, siteStatus: 'co-nha-tren-dat' });
  assert.equal(empty.items[0].quantity, 1000);
  assert.equal(reno.items[0].quantity, 350);
});

test('dự toán: không có dữ liệu thì không bịa số', () => {
  const none = estimate.computeEstimate({ area: 50, materials: [], now: NOW });
  assert.equal(none.available, false);
  assert.equal(none.total, 0);
  const pub = estimate.toPublicEstimate(none);
  assert.equal(pub.available, false);
  assert.ok(pub.message);

  const noPrice = estimate.computeEstimate({ area: 50, now: NOW, materials: [{ material: mat(), prices: [] }] });
  assert.equal(noPrice.available, false);
  assert.equal(noPrice.missingPrice.length, 1);
});

test('dự toán: bộ lọc theo style / loại công trình / vật tư khách chọn', () => {
  const styleOnly = mat({ styleTags: ['Industrial'] });
  assert.equal(estimate.isRelevant(styleOnly, { style: 'Industrial' }), true);
  assert.equal(estimate.isRelevant(styleOnly, { style: 'Japandi' }), false);
  const wood = mat({ name: 'Gỗ tự nhiên sồi', styleTags: ['Japandi'] });
  assert.equal(estimate.isRelevant(wood, { style: 'Industrial', mainMaterials: ['Gỗ tự nhiên'] }), true);
  assert.equal(estimate.isRelevant(mat({ spaceTypes: ['Bar'] }), { spaceType: 'Nhà Ở' }), false);
  assert.equal(estimate.isRelevant(mat({ normPerM2: 0 }), {}), false);
});

test('dự toán: so sánh với ngân sách khách nêu', () => {
  const materials = [{ material: mat({ normPerM2: 1 }), prices: [{ price: 1_000_000, priceDate: daysAgo(1) }, { price: 1_100_000, priceDate: daysAgo(2) }] }];
  const mk = budget => estimate.computeEstimate({ area: 100, estimatedBudget: budget, materials, now: NOW }).budget.status;
  assert.equal(mk(500_000_000), 'trong-ngan-sach');
  assert.equal(mk(50_000_000), 'vuot-ngan-sach');
  assert.equal(mk(105_000_000), 'sat-ngan-sach');
  assert.equal(mk(0), 'khong-xac-dinh');
});

test('dự toán: báo giá cũ vẫn dùng được nhưng hạ độ tin cậy', () => {
  const p = estimate.pickPrice([{ price: 100, priceDate: daysAgo(400) }], NOW);
  assert.equal(p.fresh, false);
  assert.equal(p.unitPrice, 100);
  assert.ok(p.low < 100 && p.high > 100);
  assert.equal(estimate.pickPrice([{ price: -5 }, { price: 'x' }], NOW), null);
});

test('dự toán: bản công khai không lộ hạng mục và đơn giá', () => {
  const full = estimate.computeEstimate({
    area: 100, now: NOW,
    materials: [{ material: mat({ normPerM2: 2 }), prices: [{ price: 123_456, priceDate: daysAgo(1) }] }]
  });
  const pub = estimate.toPublicEstimate(full);
  assert.equal(pub.available, true);
  assert.equal(pub.items, undefined);
  assert.equal(JSON.stringify(pub).includes('123456'), false);
  assert.equal(pub.rangeLow % 100000, 0);
});

test('tính tổng BOQ: dự phòng và VAT, số âm bị chặn', () => {
  const t = estimate.calcTotals([{ quantity: 10, unitPrice: 1000 }, { quantity: -5, unitPrice: 1000 }], 5, 10);
  assert.equal(t.subtotal, 10_000);
  assert.equal(t.contingency, 500);
  assert.equal(t.vat, 1050);
  assert.equal(t.total, 11_550);
  assert.equal(t.items[1].quantity, 0);
});

// ---------------- Quota ----------------
test('quota: đầu ngày tính theo giờ Việt Nam, không phụ thuộc múi giờ máy chủ', () => {
  assert.equal(quota.startOfVietnamDay(new Date('2026-10-31T16:59:00Z')).toISOString(), '2026-10-30T17:00:00.000Z');
  assert.equal(quota.startOfVietnamDay(new Date('2026-10-31T17:00:00Z')).toISOString(), '2026-10-31T17:00:00.000Z');
  assert.equal(quota.windowStart(3, NOW).toISOString(), '2026-10-28T10:00:00.000Z');
});

test('quota: tier khớp enum của AIUsage (lỗi cũ: customer_pro bị từ chối)', () => {
  const enumValues = ['guest', 'free', 'pro', 'staff', 'admin'];
  for (const role of ['admin', 'staff', 'customer_pro', 'customer_free', undefined, 'lạ']) {
    assert.ok(enumValues.includes(quota.getTierFromRole(role)), `role ${role}`);
  }
  assert.equal(quota.getTierFromRole('customer_pro'), 'pro');
  assert.equal(quota.QUOTA_CONFIG.guest.limit, 0);
  assert.equal(quota.QUOTA_CONFIG.admin.limit, Infinity);
});

// ---------------- AI ----------------
test('AI: đọc JSON lẫn trong văn bản / khối markdown', () => {
  assert.deepEqual(ai.parseJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(ai.parseJson('Đây là kết quả: {"a":{"b":2}} xong'), { a: { b: 2 } });
  assert.equal(ai.parseJson('không có json'), null);
  assert.equal(ai.parseJson(null), null);
});

test('AI: lịch sử chat luôn bắt đầu bằng lượt của người dùng và bị cắt ngắn', () => {
  const history = [{ role: 'ai', text: 'xin chào' }, { role: 'user', text: 'a' }, { role: 'ai', text: 'b' }, { text: '' }, null];
  const c = ai.toContents(history, 'câu hỏi mới', 6);
  assert.equal(c[0].role, 'user');
  assert.equal(c[c.length - 1].parts[0].text, 'câu hỏi mới');
  assert.equal(c.length, 3);
});

test('AI: chỉ nhận ảnh data URL hợp lệ', () => {
  assert.ok(ai.dataUrlToPart('data:image/jpeg;base64,AAAA').inlineData);
  assert.equal(ai.dataUrlToPart('data:text/html;base64,AAAA'), null);
  assert.equal(ai.dataUrlToPart('http://evil/x.png'), null);
  assert.equal(ai.dataUrlToPart('data:image/png;base64,' + 'A'.repeat(5 * 1024 * 1024)), null);
});

const FP = { projectName: 'Nhà phố Q5', width: 4, length: 20, totalArea: 80, address: '12 Trần Hưng Đạo', district: 'Q5', city: 'TP.HCM', siteStatus: 'dat-trong', notes: '', images: [] };
const CO = { style: 'Japandi', spaceType: 'Quán Kafe', mainColors: ['#F5F0E6', '#8B7355'], mainMaterials: ['Gỗ tự nhiên', 'Gạch'], description: 'Yên tĩnh, nhiều cây', estimatedBudget: 900_000_000 };

test('AI dự phòng: không có key vẫn trả phân tích đầy đủ và lời nhắc vẽ ảnh đúng concept', async () => {
  const { analysis, source } = await ai.analyzeSite({ floorPlan: FP, concept: CO });
  assert.equal(source, 'rules');
  for (const k of ['summary', 'siteObservations', 'layoutSuggestions', 'designLanguage', 'materialPalette', 'lightingStrategy', 'imagePrompt']) {
    assert.ok(analysis[k] && analysis[k].length, `thiếu ${k}`);
  }
  assert.match(analysis.imagePrompt, /japandi/i);
  assert.match(analysis.imagePrompt, /coffee shop/);
  assert.match(analysis.imagePrompt, /narrow plot 4m by 20m/);
  assert.match(analysis.imagePrompt, /natural wood/);
  assert.ok(analysis.siteObservations.join(' ').includes('nhà ống'));
});

test('AI Gemini: dùng kết quả hợp lệ, gửi khoá qua header, rơi về quy tắc khi lỗi', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  const realFetch = global.fetch;
  const calls = [];
  try {
    global.fetch = async (url, opts) => {
      calls.push({ url, headers: opts.headers });
      return {
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({
          summary: 'Hướng Japandi tĩnh tại.', siteObservations: ['Mặt bằng dài'], layoutSuggestions: ['Quầy bar gần cửa'],
          designLanguage: ['Wabi-sabi — vẻ đẹp mộc'], materialPalette: ['Gỗ sồi'], lightingStrategy: 'Ánh sáng tự nhiên',
          risks: [], imagePrompt: 'photorealistic japandi coffee shop interior with warm oak and linen, soft daylight, wide angle'
        }) }] } }] })
      };
    };
    const ok = await ai.analyzeSite({ floorPlan: FP, concept: CO });
    assert.equal(ok.source, 'gemini');
    assert.equal(ok.analysis.summary, 'Hướng Japandi tĩnh tại.');
    assert.equal(calls[0].headers['x-goog-api-key'], 'test-key');
    assert.equal(calls[0].url.includes('test-key'), false);

    global.fetch = async () => ({ ok: false, status: 500, json: async () => ({ error: { message: 'boom' } }) });
    const bad = await ai.analyzeSite({ floorPlan: FP, concept: CO });
    assert.equal(bad.source, 'rules');
    assert.ok(bad.analysis.imagePrompt.length > 40);

    // JSON thiếu trường + imagePrompt quá ngắn → bổ sung từ bản dự phòng
    global.fetch = async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"summary":"x","imagePrompt":"hi"}' }] } }] }) });
    const partial = await ai.analyzeSite({ floorPlan: FP, concept: CO });
    assert.equal(partial.source, 'gemini');
    assert.ok(partial.analysis.layoutSuggestions.length >= 2);
    assert.match(partial.analysis.imagePrompt, /japandi/i);
  } finally {
    global.fetch = realFetch;
    delete process.env.GEMINI_API_KEY;
  }
});

test('AI: URL ảnh có seed và được mã hoá', () => {
  const url = ai.buildImageUrl({ prompt: 'a b & c', seed: 42 });
  assert.ok(url.startsWith('https://image.pollinations.ai/prompt/a%20b%20%26%20c?'));
  assert.ok(url.includes('seed=42'));
});

test('kiến thức thiết kế: tên màu và style dự phòng', () => {
  assert.equal(hexToColorName('#FFFFFF'), 'white');
  assert.equal(hexToColorName('#000000'), 'black');
  assert.match(hexToColorName('#8B7355'), /brown|olive|orange/);
  assert.equal(hexToColorName('#0000FF'), 'blue');
  assert.equal(getStyleGuide('không tồn tại').en, 'contemporary');
});

// ---------------- Telesale ----------------
test('telesale: tóm tắt dự phòng dựng từ dữ kiện thật', () => {
  const facts = lead.factsOf(
    { fullName: 'Anh Minh', phone: '0901234567', interestedService: 'tron-goi', message: 'Cần gấp', engagement: { score: 80, renderCount: 2, loginCount: 4 } },
    {
      user: { loginCount: 4 },
      floorPlan: { projectName: 'Quán A', address: '1 Lê Lợi', district: 'Q1', city: 'TP.HCM', width: 4, length: 20, totalArea: 80, siteStatus: 'dat-trong' },
      concept: { spaceType: 'Quán Kafe', style: 'Industrial', mainMaterials: ['Bê tông'], estimatedBudget: 900_000_000, description: 'Quán cà phê loft' },
      render: { estimate: { available: true, rangeLow: 700_000_000, rangeHigh: 850_000_000, budget: { status: 'trong-ngan-sach' } } }
    }
  );
  const s = lead.ruleBasedSummary(facts);
  assert.equal(s.interestLevel, 'nong');
  assert.match(s.summary, /Anh Minh/);
  assert.match(s.summary, /Industrial/);
  assert.ok(s.talkingPoints.some(t => t.includes('trong ngân sách')));
  assert.ok(s.openingScript.includes('Anh Minh'));

  const msg = lead.buildHotLeadMessage({ fullName: 'Anh Minh', phone: '0901234567', engagement: { score: 80 } }, s, facts);
  assert.match(msg, /LEAD NÓNG/);
  assert.match(msg, /0901234567/);
});

test('điểm quan tâm: công thức một nơi, tối đa 100', () => {
  assert.equal(scoreOf({ loginCount: 2, renderCount: 1, floorPlanCount: 1, conceptCount: 1, leadCount: 0 }), 65);
  assert.equal(scoreOf({ loginCount: 50, leadCount: 3 }), 100);
  assert.equal(scoreOf({}), 0);
});
