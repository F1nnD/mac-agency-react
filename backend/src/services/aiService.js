// =============================================================
// AI SERVICE — Gemini (gói miễn phí) + ảnh Pollinations (miễn phí, không cần key)
//
// Nguyên tắc:
//  - Mọi thứ cấu hình bằng biến môi trường (xem backend/.env.example)
//  - Thiếu GEMINI_API_KEY hoặc Gemini lỗi → AI Studio vẫn chạy bằng bộ quy tắc dự phòng,
//    khách không bao giờ thấy màn hình lỗi trống
//  - Khoá API gửi qua header, không nằm trong URL (tránh lộ khoá trong log)
// =============================================================
const {
  SPACE_TYPE_EN,
  MATERIAL_EN,
  getStyleGuide,
  hexToColorName
} = require('./designKnowledge');

// Danh sách model theo cấu hình đang chạy của MAC; chỉnh bằng biến GEMINI_MODELS khi Google đổi tên model
const DEFAULT_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'];
const PRO_TIERS = ['pro', 'staff', 'admin'];

const parseList = (value, fallback) => {
  if (!value) return fallback;
  const list = String(value).split(',').map(s => s.trim()).filter(Boolean);
  return list.length ? list : fallback;
};

function modelsFor(tier) {
  const base = parseList(process.env.GEMINI_MODELS, DEFAULT_MODELS);
  return PRO_TIERS.includes(tier) ? parseList(process.env.GEMINI_PRO_MODELS, base) : base;
}

function isConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

// -------------------------------------------------------------
// Gọi Gemini
// -------------------------------------------------------------
async function callGemini({ model, system, contents, json = false, temperature = 0.7, timeoutMs = 30000 }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const body = { contents, generationConfig: { temperature } };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  if (json) body.generationConfig.responseMimeType = 'application/json';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || `Gemini lỗi ${res.status}`);
    err.status = res.status;
    throw err;
  }

  const text = (data?.candidates?.[0]?.content?.parts || [])
    .map(p => p.text || '')
    .join('')
    .trim();
  if (!text) throw new Error('Gemini trả về nội dung rỗng (có thể bị bộ lọc an toàn chặn).');
  return text;
}

// Thử lần lượt các model (model mới → model nhẹ hơn / ổn định hơn)
async function generate({ tier = 'free', system, contents, json = false, temperature }) {
  if (!isConfigured()) {
    const err = new Error('Chưa cấu hình GEMINI_API_KEY.');
    err.code = 'NO_KEY';
    throw err;
  }

  let lastError;
  for (const model of modelsFor(tier)) {
    try {
      const text = await callGemini({ model, system, contents, json, temperature });
      return { text, model };
    } catch (error) {
      lastError = error;
      console.warn(`[AI] Model ${model} lỗi: ${error.message}`);
      // Khoá sai thì thử model khác cũng vô ích
      if (error.status === 401 || error.status === 403) break;
    }
  }
  throw lastError || new Error('Không gọi được AI.');
}

// -------------------------------------------------------------
// Tiện ích dữ liệu
// -------------------------------------------------------------
function parseJson(text) {
  if (typeof text !== 'string') return null;
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

// chatHistory từ client → contents của Gemini (cắt ngắn, bỏ phần không hợp lệ)
function toContents(history, message, max = 6) {
  const contents = [];
  if (Array.isArray(history)) {
    history.slice(-max).forEach(msg => {
      if (!msg || typeof msg.text !== 'string' || !msg.text.trim()) return;
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text.slice(0, 2000) }]
      });
    });
  }
  while (contents.length && contents[0].role !== 'user') contents.shift();
  contents.push({ role: 'user', parts: [{ text: String(message).slice(0, 2000) }] });
  return contents;
}

const MAX_IMAGE_B64_CHARS = 4 * 1024 * 1024;

// "data:image/jpeg;base64,...." → part inlineData của Gemini
function dataUrlToPart(dataUrl) {
  if (typeof dataUrl !== 'string') return null;
  const m = /^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m || m[2].length > MAX_IMAGE_B64_CHARS) return null;
  return { inlineData: { mimeType: m[1] === 'image/jpg' ? 'image/jpeg' : m[1], data: m[2] } };
}

const clip = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const asList = (value, maxItems, maxLen) =>
  (Array.isArray(value) ? value : [])
    .map(v => clip(typeof v === 'string' ? v : JSON.stringify(v), maxLen))
    .filter(Boolean)
    .slice(0, maxItems);

// -------------------------------------------------------------
// Chat (AI thường / AI Pro / AI nội bộ)
// -------------------------------------------------------------
async function chatReply({ tier, system, history, message, maxHistory = 6 }) {
  const { text, model } = await generate({
    tier,
    system,
    contents: toContents(history, message, maxHistory),
    temperature: 0.6
  });
  return { text, model };
}

// -------------------------------------------------------------
// Phân tích mặt bằng + concept → JSON có cấu trúc
// -------------------------------------------------------------
function describeSite(floorPlan, concept) {
  const w = Number(floorPlan.width) || 0;
  const l = Number(floorPlan.length) || 0;
  const area = Number(floorPlan.totalArea) || w * l;
  const ratio = w && l ? Math.max(w, l) / Math.min(w, l) : 1;
  const colors = (concept?.mainColors || []).map(c => `${c} (${hexToColorName(c)})`).join(', ') || 'chưa chọn';

  return {
    w,
    l,
    area,
    ratio,
    text: [
      'THÔNG TIN DỰ ÁN',
      `- Tên dự án: ${clip(floorPlan.projectName, 120)}`,
      `- Kích thước: ngang ${w} m x dài ${l} m, diện tích ${area} m², tỷ lệ cạnh dài/cạnh ngắn = ${ratio.toFixed(1)}`,
      `- Địa chỉ: ${clip([floorPlan.address, floorPlan.district, floorPlan.city].filter(Boolean).join(', '), 200)}`,
      `- Hiện trạng: ${floorPlan.siteStatus === 'co-nha-tren-dat' ? 'đã có nhà trên đất (cải tạo)' : 'đất trống (xây mới)'}`,
      `- Ghi chú của khách về mặt bằng: ${clip(floorPlan.notes, 400) || 'không có'}`,
      '',
      'CONCEPT KHÁCH CHỌN',
      `- Loại công trình: ${clip(concept?.spaceType, 60) || 'chưa chọn'}`,
      `- Style: ${clip(concept?.style, 60) || 'chưa chọn'}`,
      `- Màu chủ đạo: ${colors}`,
      `- Chất liệu chủ đạo: ${(concept?.mainMaterials || []).join(', ') || 'chưa chọn'}`,
      `- Ngân sách dự kiến: ${concept?.estimatedBudget ? `${Number(concept.estimatedBudget).toLocaleString('vi-VN')} đ` : 'chưa nêu'}`,
      `- Mô tả ý tưởng của khách: ${clip(concept?.description, 800) || 'không có'}`
    ].join('\n')
  };
}

const ANALYSIS_SYSTEM = `Bạn là kiến trúc sư của MAC Concept. Nhiệm vụ: đọc thông tin mặt bằng và concept của khách (kèm ảnh hiện trạng nếu có) rồi trả về MỘT đối tượng JSON, không thêm chữ nào ngoài JSON.

Các khoá bắt buộc:
- "summary": 2-3 câu tiếng Việt tóm tắt hướng thiết kế đề xuất, dùng thuật ngữ thiết kế đúng chỗ.
- "siteObservations": mảng 2-5 chuỗi, nhận xét về mặt bằng (tỷ lệ, hướng lấy sáng, hiện trạng). Nếu có ảnh, chỉ mô tả điều THẤY được trong ảnh; nếu ảnh mờ hoặc không rõ, nói rõ điều đó. Không bịa chi tiết.
- "layoutSuggestions": mảng 3-5 chuỗi, gợi ý bố trí công năng và lưu tuyến phù hợp loại công trình.
- "designLanguage": mảng 3-5 chuỗi dạng "thuật ngữ — giải thích ngắn" cho khách không chuyên.
- "materialPalette": mảng 3-6 chuỗi, vật liệu và hoàn thiện đề xuất, bám theo chất liệu khách chọn.
- "lightingStrategy": 1-2 câu về chiến lược ánh sáng.
- "risks": mảng 0-3 chuỗi, các điểm cần khảo sát thêm (kết cấu, pháp lý, thoát nước...). Không khẳng định điều chưa biết.
- "imagePrompt": MỘT đoạn tiếng Anh dưới 80 từ mô tả một ảnh phối cảnh kiến trúc chân thực, đúng style, màu, vật liệu và tỷ lệ mặt bằng. Không nhắc tên thương hiệu, người thật hay chữ viết trong ảnh.`;

function ruleBasedAnalysis(floorPlan, concept) {
  const site = describeSite(floorPlan, concept);
  const guide = getStyleGuide(concept?.style);
  const spaceType = concept?.spaceType || 'Khác';
  const narrow = Math.min(site.w, site.l) <= 6 && site.ratio >= 3;
  const renovation = floorPlan.siteStatus === 'co-nha-tren-dat';

  const siteObservations = [
    `Diện tích ${site.area} m² (ngang ${site.w} m x dài ${site.l} m), tỷ lệ cạnh dài/cạnh ngắn khoảng ${site.ratio.toFixed(1)}.`,
    narrow
      ? 'Mặt bằng dạng nhà ống: mặt tiền hẹp, chiều sâu lớn, thách thức chính là lấy sáng và thông gió vào phần giữa nhà.'
      : 'Tỷ lệ mặt bằng tương đối cân đối, thuận lợi để chia vùng chức năng rõ ràng.',
    renovation
      ? 'Công trình đã có nhà trên đất: cần khảo sát hiện trạng kết cấu để quyết định phần giữ lại và phần cải tạo.'
      : 'Đất trống: tự do hơn về tổ chức không gian, cần khảo sát địa chất và hạ tầng trước khi chốt phương án.'
  ];

  const layoutSuggestions = [];
  if (narrow) {
    layoutSuggestions.push('Tổ chức lưu tuyến thẳng từ mặt tiền vào trong, dùng giếng trời hoặc khoảng thông tầng để cấp sáng cho phần giữa nhà.');
  }
  if (['Quán Kafe', 'Nhà Hàng', 'Bar'].includes(spaceType)) {
    layoutSuggestions.push('Đặt quầy bar - khu pha chế ở vị trí nhìn được từ lối vào, tạo điểm nhấn thị giác đầu tiên.');
    layoutSuggestions.push('Tách vùng ngồi theo nhịp: ghế sát cửa sổ, bàn nhóm ở giữa, góc riêng tư phía sâu; giữ lối phục vụ một chiều.');
  } else if (['Biệt Thự', 'Nhà Phố', 'Nhà Ở'].includes(spaceType)) {
    layoutSuggestions.push('Gom không gian sinh hoạt chung ở tầng thấp, hướng ra sân hoặc khoảng xanh; đặt phòng ngủ ở vị trí yên tĩnh.');
    layoutSuggestions.push('Bố trí cầu thang và khu phụ dọc theo một bên tường để giữ khối tích sử dụng liên tục.');
  } else {
    layoutSuggestions.push('Phân vùng công năng theo mức độ ồn - riêng tư, đặt khu đông người gần lối vào.');
  }
  layoutSuggestions.push(`Áp dụng ngôn ngữ ${concept?.style || 'đã chọn'} nhất quán từ mặt tiền đến nội thất để tạo trải nghiệm liền mạch.`);

  const materialPalette = [
    ...(concept?.mainMaterials || []),
    ...guide.materials.split(',').map(s => s.trim())
  ].filter((v, i, arr) => v && arr.indexOf(v) === i).slice(0, 6);

  const imagePrompt = buildFallbackImagePrompt(floorPlan, concept);

  return {
    summary: `Đề xuất hướng ${concept?.style || 'đã chọn'} cho ${spaceType.toLowerCase()} ${site.area} m², nhấn vào ${guide.terms.slice(0, 2).join(' và ')}. Bảng màu gợi ý: ${guide.palette}.`,
    siteObservations,
    layoutSuggestions: layoutSuggestions.slice(0, 5),
    designLanguage: guide.terms.slice(0, 4),
    materialPalette,
    lightingStrategy: guide.lighting,
    risks: renovation
      ? ['Cần khảo sát kết cấu hiện hữu (móng, cột, dầm) trước khi chốt phạm vi cải tạo.']
      : ['Cần khảo sát địa chất và hiện trạng hạ tầng khu đất trước khi chốt phương án.'],
    imagePrompt
  };
}

function buildFallbackImagePrompt(floorPlan, concept) {
  const guide = getStyleGuide(concept?.style);
  const spaceType = concept?.spaceType || 'Khác';
  const spaceEn = SPACE_TYPE_EN[spaceType] || SPACE_TYPE_EN['Khác'];
  const exterior = ['Biệt Thự', 'Nhà Phố'].includes(spaceType);
  const w = Number(floorPlan.width) || 0;
  const l = Number(floorPlan.length) || 0;
  const ratio = w && l ? Math.max(w, l) / Math.min(w, l) : 1;
  const colors = (concept?.mainColors || []).map(hexToColorName).filter(Boolean).join(', ');
  const materials = (concept?.mainMaterials || []).map(m => MATERIAL_EN[m] || m).join(', ');

  return [
    `photorealistic architectural visualization, ${exterior ? 'street-facing facade exterior view' : 'wide interior view'} of a ${spaceEn}`,
    `${guide.en} style`,
    floorPlan.siteStatus === 'co-nha-tren-dat' ? 'renovation of an existing building' : 'brand new build',
    ratio >= 3 ? `long narrow plot ${w}m by ${l}m with deep proportions` : `plot of ${w}m by ${l}m`,
    colors && `color palette: ${colors}`,
    materials && `main materials: ${materials}`,
    guide.en_keywords,
    'professional architectural photography, natural light, 8k, highly detailed'
  ].filter(Boolean).join(', ');
}

function normalizeAnalysis(raw, fallback) {
  const base = fallback;
  if (!raw || typeof raw !== 'object') return base;

  const imagePrompt = clip(raw.imagePrompt, 600);
  return {
    summary: clip(raw.summary, 600) || base.summary,
    siteObservations: asList(raw.siteObservations, 5, 300).length ? asList(raw.siteObservations, 5, 300) : base.siteObservations,
    layoutSuggestions: asList(raw.layoutSuggestions, 5, 300).length ? asList(raw.layoutSuggestions, 5, 300) : base.layoutSuggestions,
    designLanguage: asList(raw.designLanguage, 5, 200).length ? asList(raw.designLanguage, 5, 200) : base.designLanguage,
    materialPalette: asList(raw.materialPalette, 6, 120).length ? asList(raw.materialPalette, 6, 120) : base.materialPalette,
    lightingStrategy: clip(raw.lightingStrategy, 300) || base.lightingStrategy,
    risks: asList(raw.risks, 3, 300),
    // Câu lệnh vẽ ảnh phải đủ dài mới tin; nếu AI trả quá ngắn thì dùng bản dự phòng
    imagePrompt: imagePrompt.length >= 40 ? imagePrompt : base.imagePrompt
  };
}

async function analyzeSite({ tier = 'free', floorPlan, concept }) {
  const fallback = ruleBasedAnalysis(floorPlan, concept);
  if (!isConfigured()) return { analysis: fallback, source: 'rules', model: '' };

  const site = describeSite(floorPlan, concept);
  const imageParts = (floorPlan.images || [])
    .map(dataUrlToPart)
    .filter(Boolean)
    .slice(0, 3);

  const guide = getStyleGuide(concept?.style);
  const text = [
    site.text,
    '',
    `Gợi ý ngôn ngữ thiết kế của style này: ${guide.terms.join('; ')}.`,
    imageParts.length
      ? `Có ${imageParts.length} ảnh hiện trạng/mặt bằng đính kèm bên dưới.`
      : 'Khách không đính kèm ảnh, chỉ dựa trên thông tin chữ ở trên.'
  ].join('\n');

  try {
    const { text: out, model } = await generate({
      tier,
      system: ANALYSIS_SYSTEM,
      contents: [{ role: 'user', parts: [{ text }, ...imageParts] }],
      json: true,
      temperature: 0.6
    });
    const parsed = parseJson(out);
    if (!parsed) throw new Error('AI không trả về JSON hợp lệ.');
    return { analysis: normalizeAnalysis(parsed, fallback), source: 'gemini', model };
  } catch (error) {
    console.warn('[AI] Phân tích bằng Gemini thất bại, dùng bộ quy tắc dự phòng:', error.message);
    return { analysis: fallback, source: 'rules', model: '' };
  }
}

// -------------------------------------------------------------
// Ảnh phối cảnh (Pollinations — miễn phí)
// -------------------------------------------------------------
function buildImageUrl({ prompt, seed }) {
  const base = (process.env.IMAGE_API_BASE || 'https://image.pollinations.ai/prompt').replace(/\/+$/, '');
  const model = process.env.IMAGE_MODEL || 'flux';
  const width = Number(process.env.IMAGE_WIDTH) || 1024;
  const height = Number(process.env.IMAGE_HEIGHT) || 768;
  return `${base}/${encodeURIComponent(clip(prompt, 600))}?model=${encodeURIComponent(model)}&width=${width}&height=${height}&seed=${Number(seed) || 0}&nologo=true`;
}

module.exports = {
  isConfigured,
  generate,
  chatReply,
  analyzeSite,
  ruleBasedAnalysis,
  buildFallbackImagePrompt,
  buildImageUrl,
  normalizeAnalysis,
  parseJson,
  toContents,
  dataUrlToPart,
  describeSite,
  modelsFor
};
