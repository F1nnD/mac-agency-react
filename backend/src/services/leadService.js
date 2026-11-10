// =============================================================
// HỖ TRỢ TELESALE
//  1. Tóm tắt lead bằng AI (có bản dự phòng khi không có AI)
//  2. Báo "lead nóng" tới Telegram / webhook nội bộ (chỉ báo một lần)
// =============================================================
const Lead = require('../models/Lead');
const User = require('../models/User');
const FloorPlan = require('../models/FloorPlan');
const Concept = require('../models/Concept');
const Render = require('../models/Render');
const ai = require('./aiService');

const HOT_SCORE = () => {
  const n = Number(process.env.HOT_LEAD_SCORE);
  return Number.isFinite(n) && n > 0 ? n : 70;
};

const SERVICE_LABEL = {
  'thiet-ke': 'chỉ thiết kế',
  'thi-cong': 'chỉ thi công',
  'tron-goi': 'trọn gói thiết kế - thi công',
  'noi-that': 'nội thất',
  khac: 'dịch vụ khác'
};

const money = v => `${Math.round(Number(v) || 0).toLocaleString('vi-VN')} đ`;
const clip = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

// Gom mọi dữ kiện về một khách để AI/ quy tắc dùng
async function loadLeadContext(lead) {
  const [user, floorPlan] = await Promise.all([
    User.findById(lead.userId).select('username fullName loginCount lastLoginAt'),
    lead.floorPlanId ? FloorPlan.findById(lead.floorPlanId) : null
  ]);

  const concept = floorPlan
    ? await Concept.findOne({ floorPlanId: floorPlan._id }).sort({ createdAt: -1 })
    : null;
  const render = floorPlan
    ? await Render.findOne({ floorPlanId: floorPlan._id }).sort({ createdAt: -1 })
    : null;

  return { user, floorPlan, concept, render };
}

function factsOf(lead, ctx) {
  const { user, floorPlan, concept, render } = ctx;
  const est = render?.estimate;
  return {
    name: lead.fullName,
    phone: lead.phone,
    service: SERVICE_LABEL[lead.interestedService] || lead.interestedService,
    message: clip(lead.message, 300),
    score: lead.engagement?.score || 0,
    logins: user?.loginCount || lead.engagement?.loginCount || 0,
    renders: lead.engagement?.renderCount || 0,
    project: floorPlan?.projectName || '',
    address: [floorPlan?.address, floorPlan?.district, floorPlan?.city].filter(Boolean).join(', '),
    size: floorPlan ? `${floorPlan.width}m x ${floorPlan.length}m (${floorPlan.totalArea} m²)` : '',
    siteStatus: floorPlan?.siteStatus === 'co-nha-tren-dat' ? 'đã có nhà trên đất' : floorPlan ? 'đất trống' : '',
    spaceType: concept?.spaceType || '',
    style: concept?.style || '',
    materials: (concept?.mainMaterials || []).join(', '),
    budget: concept?.estimatedBudget ? money(concept.estimatedBudget) : '',
    idea: clip(concept?.description, 300),
    estimate: est?.available ? `${money(est.rangeLow)} - ${money(est.rangeHigh)}` : '',
    budgetStatus: est?.budget?.status || ''
  };
}

const BUDGET_TEXT = {
  'trong-ngan-sach': 'dự toán nằm trong ngân sách khách nêu',
  'sat-ngan-sach': 'dự toán sát ngân sách khách nêu',
  'vuot-ngan-sach': 'dự toán có thể vượt ngân sách khách nêu'
};

// Bản tóm tắt dự phòng: dựng từ dữ kiện thật, không cần AI
function ruleBasedSummary(f) {
  const level = f.score >= 70 ? 'nong' : f.score >= 40 ? 'am' : 'lanh';
  const parts = [
    `${f.name} quan tâm ${f.service}`,
    f.spaceType && f.style ? `cho ${f.spaceType.toLowerCase()} phong cách ${f.style}` : '',
    f.size ? `trên mặt bằng ${f.size}${f.siteStatus ? `, ${f.siteStatus}` : ''}` : '',
    f.address ? `tại ${f.address}` : ''
  ].filter(Boolean);

  const talkingPoints = [];
  if (f.style) talkingPoints.push(`Khách chọn phong cách ${f.style}${f.materials ? ` với chất liệu ${f.materials}` : ''}: hỏi thêm về cảm hứng và công trình tham khảo.`);
  if (f.idea) talkingPoints.push(`Ý tưởng khách mô tả: "${f.idea}".`);
  if (f.budget) talkingPoints.push(`Ngân sách khách nêu: ${f.budget}${BUDGET_TEXT[f.budgetStatus] ? ` (${BUDGET_TEXT[f.budgetStatus]})` : ''}.`);
  if (f.estimate) talkingPoints.push(`Khoảng dự toán sơ bộ đã hiển thị cho khách: ${f.estimate}.`);
  if (f.message) talkingPoints.push(`Lời nhắn của khách: "${f.message}".`);
  if (!talkingPoints.length) talkingPoints.push('Khách mới để lại liên hệ, chưa có nhiều chi tiết: hỏi về loại công trình và mốc thời gian dự kiến.');

  return {
    summary: `${parts.join(' ')}. Đã đăng nhập ${f.logins} lần, tạo ${f.renders} bản diễn hoạ, điểm quan tâm ${f.score}/100.`,
    interestLevel: level,
    talkingPoints: talkingPoints.slice(0, 5),
    openingScript: `Chào ${f.name}, mình gọi từ MAC Concept. Mình thấy bạn vừa thử diễn hoạ ${f.spaceType ? f.spaceType.toLowerCase() : 'không gian'}${f.style ? ` phong cách ${f.style}` : ''} trên website của MAC. Mình muốn hỏi thêm vài ý để kiến trúc sư tư vấn sát với mặt bằng của bạn, bạn tiện nói chuyện vài phút không ạ?`,
    nextAction: f.score >= 70
      ? 'Gọi trong ngày; đề nghị lịch khảo sát hiện trạng.'
      : 'Gọi trong 24 giờ; xác nhận nhu cầu và ngân sách.'
  };
}

const SUMMARY_SYSTEM = `Bạn là trợ lý của đội telesale MAC Concept (thiết kế - thi công). Dựa trên dữ kiện về một khách tiềm năng, trả về MỘT đối tượng JSON, không thêm chữ nào ngoài JSON:
- "summary": 2-3 câu tiếng Việt tóm tắt khách là ai, muốn gì, mức độ nghiêm túc.
- "interestLevel": "nong" | "am" | "lanh".
- "talkingPoints": mảng 3-5 ý nên khai thác khi gọi.
- "openingScript": câu mở đầu cuộc gọi, tự nhiên, dưới 60 từ, xưng "mình".
- "nextAction": một hành động tiếp theo cụ thể.
Chỉ dùng dữ kiện được cung cấp. Không bịa thông tin, không hứa giá hoặc thời gian.`;

async function summarizeLead(leadOrId, { force = true } = {}) {
  const lead = typeof leadOrId === 'object' && leadOrId?._id ? leadOrId : await Lead.findById(leadOrId);
  if (!lead) return null;

  const ctx = await loadLeadContext(lead);
  const facts = factsOf(lead, ctx);

  let result = ruleBasedSummary(facts);
  let source = 'rules';
  let model = '';

  if (ai.isConfigured()) {
    try {
      const prompt = Object.entries(facts)
        .filter(([, v]) => v !== '' && v !== 0)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      const out = await ai.generate({
        tier: 'staff',
        system: SUMMARY_SYSTEM,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        json: true,
        temperature: 0.4
      });
      const parsed = ai.parseJson(out.text);
      if (parsed && typeof parsed.summary === 'string' && parsed.summary.trim()) {
        result = {
          summary: clip(parsed.summary, 700),
          interestLevel: ['nong', 'am', 'lanh'].includes(parsed.interestLevel) ? parsed.interestLevel : result.interestLevel,
          talkingPoints: (Array.isArray(parsed.talkingPoints) ? parsed.talkingPoints : []).map(t => clip(t, 300)).filter(Boolean).slice(0, 5),
          openingScript: clip(parsed.openingScript, 500) || result.openingScript,
          nextAction: clip(parsed.nextAction, 300) || result.nextAction
        };
        if (!result.talkingPoints.length) result.talkingPoints = ruleBasedSummary(facts).talkingPoints;
        source = 'gemini';
        model = out.model;
      }
    } catch (error) {
      console.warn('[Lead] Tóm tắt bằng AI thất bại, dùng bản dự phòng:', error.message);
    }
  }

  if (!force && lead.aiSummary?.generatedAt) return lead.aiSummary;

  const aiSummary = { ...result, source, model, generatedAt: new Date().toISOString() };
  await Lead.updateOne({ _id: lead._id }, { $set: { aiSummary } });
  lead.aiSummary = aiSummary;
  return aiSummary;
}

// -------------------------------------------------------------
// Báo lead nóng
// -------------------------------------------------------------
function buildHotLeadMessage(lead, summary, facts) {
  const lines = [
    `LEAD NÓNG: ${lead.fullName} - ${lead.phone}`,
    `Điểm quan tâm: ${lead.engagement?.score || 0}/100`,
    facts.project && `Dự án: ${facts.project}${facts.size ? ` (${facts.size})` : ''}`,
    facts.spaceType || facts.style ? `Concept: ${[facts.spaceType, facts.style].filter(Boolean).join(' - ')}` : '',
    facts.budget && `Ngân sách khách nêu: ${facts.budget}`,
    facts.estimate && `Dự toán sơ bộ: ${facts.estimate}`,
    summary?.nextAction && `Gợi ý: ${summary.nextAction}`
  ];
  return lines.filter(Boolean).join('\n');
}

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

async function sendNotification(text, extra = {}) {
  const sent = [];
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const webhook = process.env.HOT_LEAD_WEBHOOK_URL;

  if (token && chatId) {
    try {
      await postJson(`https://api.telegram.org/bot${token}/sendMessage`, { chat_id: chatId, text });
      sent.push('telegram');
    } catch (error) {
      // Không in token trong log
      console.error('[Lead] Gửi Telegram lỗi:', error.message);
    }
  }
  if (webhook) {
    try {
      // text (Slack/generic) + content (Discord) để dùng được với nhiều dịch vụ
      await postJson(webhook, { text, content: text, ...extra });
      sent.push('webhook');
    } catch (error) {
      console.error('[Lead] Gửi webhook lỗi:', error.message);
    }
  }
  return sent;
}

// Báo một lần cho mỗi lead khi điểm vượt ngưỡng
async function notifyIfHot(leadOrId) {
  const lead = typeof leadOrId === 'object' && leadOrId?._id ? leadOrId : await Lead.findById(leadOrId);
  if (!lead || lead.hotNotifiedAt) return false;
  if ((lead.engagement?.score || 0) < HOT_SCORE()) return false;
  if (!process.env.HOT_LEAD_WEBHOOK_URL && !(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)) return false;

  const ctx = await loadLeadContext(lead);
  const facts = factsOf(lead, ctx);
  const text = buildHotLeadMessage(lead, lead.aiSummary, facts);

  const sent = await sendNotification(text, {
    lead: { id: String(lead._id), name: lead.fullName, phone: lead.phone, score: lead.engagement?.score || 0 }
  });
  if (!sent.length) return false;

  await Lead.updateOne({ _id: lead._id }, { $set: { hotNotifiedAt: new Date() } });
  return true;
}

// Chạy sau mỗi hoạt động của khách (tạo lead, render xong): làm mới tóm tắt, rồi báo nếu nóng.
// Không chờ và không bao giờ làm hỏng yêu cầu của khách.
function processLeadsInBackground(userId) {
  (async () => {
    const leads = await Lead.find({ userId, status: { $in: ['new', 'contacted', 'qualified'] } });
    for (const lead of leads) {
      await summarizeLead(lead);
      await notifyIfHot(lead);
    }
  })().catch(err => console.error('[Lead] Xử lý nền lỗi:', err.message));
}

module.exports = {
  summarizeLead,
  notifyIfHot,
  processLeadsInBackground,
  ruleBasedSummary,
  buildHotLeadMessage,
  factsOf,
  HOT_SCORE
};
