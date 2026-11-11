// =============================================================
// BACKEND SERVER — MAC CONCEPT
// =============================================================
// dotenv PHẢI chạy trước mọi require khác: các middleware/service đọc biến môi trường khi được nạp
require('dotenv').config();

const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('Thiếu JWT_SECRET (tối thiểu 16 ký tự). Xem backend/.env.example');
  process.exit(1);
}

// ===== MIDDLEWARE =====
const { optionalAuth, requireRole, verifyToken, requirePro } = require('./src/middleware/authMiddleware');
const { checkAIQuota, checkChatQuota, recordUsage } = require('./src/middleware/aiQuotaMiddleware');

// ===== SERVICES =====
const ai = require('./src/services/aiService');
const { SPACE_TYPE_EN, chatSystemFor } = require('./src/services/designKnowledge');
const Render = require('./src/models/Render');
const { buildEstimateForPlan, toPublicEstimate, loadMaterialsWithPrices, pickPrice } = require('./src/services/estimateService');

// ===== ROUTES =====
const settingsRoutes = require('./src/routes/settingsRoutes');
const projectRoutes = require('./src/routes/projectRoutes');
const packageRoutes = require('./src/routes/packageRoutes');
const authRoutes = require('./src/routes/authRoutes');
const dataRoutes = require('./src/routes/dataRoutes');
const statsRoutes = require('./src/routes/statsRoutes');
const studioRoutes = require('./src/routes/studioRoutes');
const userRoutes = require('./src/routes/userRoutes');

// ===== MODEL DRAFT (INLINE) =====
const draftSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  basePricePerM2: { type: Number, required: true },
  demoImage: { type: String, required: true },
  minArea: { type: Number, default: 0 },
  maxArea: { type: Number, default: 5000 },
  siteStatus: { type: String, default: 'all' }
}, { timestamps: true });
const Draft = mongoose.models.Draft || mongoose.model('Draft', draftSchema);

// ===== INIT =====
const app = express();
app.set('trust proxy', 1); // chạy sau proxy của Render

// 1. CORS
const defaultOrigins = 'http://localhost:5173,http://localhost:3000,http://localhost:5174,https://moreactisticconcept.onrender.com';
const allowedOrigins = (process.env.CORS_ORIGINS || defaultOrigins).split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.log('CORS blocked origin:', origin);
    return callback(new Error('CORS blocked'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 2. MIDDLEWARE CƠ BẢN
app.use(helmet({ crossOriginResourcePolicy: false }));
// Chỉ route dữ liệu (có ảnh mặt bằng dạng base64) mới cần body lớn; còn lại giới hạn nhỏ
app.use('/api/data', express.json({ limit: '16mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// 3. RATE LIMIT
const limiter = (windowMs, max) => rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false });
app.use('/api', limiter(15 * 60 * 1000, 500));
app.use('/api/auth/login', limiter(15 * 60 * 1000, 20));
app.use('/api/auth/register', limiter(60 * 60 * 1000, 20));
app.use('/api/ai-free', limiter(60 * 1000, 15));
app.use('/api/ai-pro', limiter(60 * 1000, 15));
app.use('/api/ai-admin', limiter(60 * 1000, 30));
app.use('/api/studio/render', limiter(60 * 1000, 6));

// 4. MOUNT ROUTES
app.use('/api/settings', settingsRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/studio', studioRoutes);
app.use('/api/users', userRoutes);

// 5. KẾT NỐI DB
connectDB().then(() => console.log('DB Ready')).catch(err => console.error('Lỗi DB:', err.message));

app.get('/api/drafts', async (req, res) => {
  try { res.json(await Draft.find()); } catch (error) { res.status(500).json({ message: error.message }); }
});

// =============================================================
// TẦNG 1: AI THƯỜNG (miễn phí) — tư vấn thiết kế, khách vãng lai cũng dùng được (có giới hạn/ngày)
// =============================================================
const NO_AI_REPLY =
  'Trợ lý AI đang nghỉ một chút. Bạn có thể dùng AI Studio để nhập mặt bằng và concept, đội ngũ MAC sẽ tư vấn chi tiết cho bạn.';

app.post('/api/ai-free', optionalAuth, checkChatQuota, async (req, res) => {
  const { userMessage, chatHistory } = req.body || {};
  if (typeof userMessage !== 'string' || !userMessage.trim()) {
    return res.status(400).json({ success: false, message: 'Nhập câu hỏi.' });
  }

  try {
    let replyText = NO_AI_REPLY;
    let ok = false;
    let errorMessage = '';

    if (ai.isConfigured()) {
      try {
        const out = await ai.chatReply({
          tier: req.aiTier,
          system: chatSystemFor('free'),
          history: chatHistory,
          message: userMessage,
          maxHistory: 6
        });
        replyText = out.text;
        ok = true;
      } catch (error) {
        errorMessage = error.message;
        console.warn('[ai-free]', error.message);
      }
    }

    await recordUsage(req, { endpoint: '/api/ai-free', requestType: 'chat', success: ok, errorMessage, userMessage });
    return res.json({ success: true, tier: 'free', replyText, isPureChat: true });
  } catch (error) {
    console.error('Lỗi AI thường:', error);
    return res.status(500).json({ success: false, message: 'Lỗi AI.' });
  }
});

// =============================================================
// TẦNG 2: AI PRO — chat + tạo nhanh phối cảnh từ form (Pro / staff / admin)
// =============================================================
const proGate = (req, res, next) => (req.body?.style ? checkAIQuota(req, res, next) : checkChatQuota(req, res, next));

app.post('/api/ai-pro', optionalAuth, requirePro, proGate, async (req, res) => {
  try {
    const { userMessage, style, area, spaceType, chatHistory } = req.body || {};

    // --- Tạo nhanh phối cảnh từ form ---
    if (style) {
      const numArea = Math.min(5000, Math.max(1, Number(area) || 100));
      const space = SPACE_TYPE_EN[spaceType] ? spaceType : 'Khác';
      const side = Math.round(Math.sqrt(numArea) * 10) / 10;
      const floorPlan = {
        width: side, length: side, totalArea: numArea, siteStatus: 'dat-trong', city: 'TP.HCM', projectName: 'Phối cảnh nhanh'
      };
      const concept = { style: String(style).slice(0, 40), spaceType: space, mainColors: [], mainMaterials: [] };

      // Cùng một đường đi với AI Studio: AI phân tích theo tầng (Pro / nhân viên / quản trị) rồi mới vẽ,
      // và LƯU vào lịch sử diễn hoạ của tài khoản (trước đây bản nhanh không được lưu)
      const { analysis, source, model } = await ai.analyzeSite({ tier: req.aiTier, floorPlan, concept });
      const seed = crypto.randomInt(1, 2_000_000_000);
      const aiImageUrl = ai.buildImageUrl({ prompt: analysis.imagePrompt, seed, tier: req.aiTier });
      const estimate = await buildEstimateForPlan(floorPlan, concept);
      const isStaffUser = ['admin', 'staff'].includes(req.user.role);

      const render = await Render.create({
        userId: req.user.userId,
        source: 'quick',
        tier: req.aiTier,
        title: `${space} · ${concept.style} · ${numArea} m²`.slice(0, 160),
        prompt: analysis.imagePrompt,
        imageUrl: aiImageUrl,
        seed,
        analysis,
        analysisSource: source,
        model,
        estimate
      }).catch(err => {
        console.error('[ai-pro] Không lưu được lịch sử diễn hoạ:', err.message);
        return null;
      });

      await recordUsage(req, {
        endpoint: '/api/ai-pro', requestType: 'render', generatedImage: true, userMessage: `${space} - ${style} - ${numArea}m2`
      });

      return res.json({
        success: true,
        tier: req.aiTier,
        renderId: render?._id || null,
        replyText: analysis.summary || `Đã tạo phối cảnh ${space.toLowerCase()} phong cách ${style}, diện tích ${numArea} m².`,
        style, spaceType: space, area: numArea, aiImageUrl,
        analysis: ai.publicAnalysis(analysis, isStaffUser),
        estimate: isStaffUser ? estimate : toPublicEstimate(estimate),
        remaining: Math.max(0, (req.aiRemaining ?? 1) - 1),
        isPureChat: false
      });
    }

    // --- Chat ---
    if (typeof userMessage !== 'string' || !userMessage.trim()) {
      return res.status(400).json({ success: false, message: 'Nhập câu hỏi.' });
    }

    let replyText = NO_AI_REPLY;
    let ok = false;
    let errorMessage = '';
    if (ai.isConfigured()) {
      try {
        const out = await ai.chatReply({
          tier: req.aiTier,
          system: chatSystemFor(req.aiTier),
          history: chatHistory,
          message: userMessage,
          maxHistory: 8
        });
        replyText = out.text;
        ok = true;
      } catch (error) {
        errorMessage = error.message;
        console.warn('[ai-pro]', error.message);
      }
    }
    await recordUsage(req, { endpoint: '/api/ai-pro', requestType: 'chat', success: ok, errorMessage, userMessage });
    return res.json({ success: true, tier: req.aiTier, replyText, isPureChat: true });
  } catch (error) {
    console.error('Lỗi AI Pro:', error);
    return res.status(500).json({ success: false, message: 'Lỗi AI Pro.' });
  }
});

// =============================================================
// TẦNG 3: AI NỘI BỘ (admin / staff) — có đọc dữ liệu vật tư và giá của MAC
// =============================================================
async function buildInternalContext() {
  try {
    const entries = await loadMaterialsWithPrices();
    const lines = entries.slice(0, 40).map(({ material, prices }) => {
      const p = pickPrice(prices);
      const price = p ? `${p.unitPrice.toLocaleString('vi-VN')} đ/${material.unit} (khoảng ${p.low.toLocaleString('vi-VN')} - ${p.high.toLocaleString('vi-VN')}, báo giá ${new Date(p.latestDate).toLocaleDateString('vi-VN')})` : 'chưa có báo giá';
      return `- ${material.code} ${material.name}: định mức ${material.normPerM2} ${material.unit}/m², giá ${price}`;
    });
    if (!lines.length) return '';
    return `\n\nDỮ LIỆU VẬT TƯ NỘI BỘ CỦA MAC (ưu tiên dùng khi dự toán, ghi rõ nguồn):\n${lines.join('\n')}`;
  } catch (error) {
    console.warn('[ai-admin] Không đọc được dữ liệu vật tư:', error.message);
    return '';
  }
}

app.post('/api/ai-admin', optionalAuth, requireRole('admin', 'staff'), async (req, res) => {
  const { userMessage, chatHistory } = req.body || {};
  if (typeof userMessage !== 'string' || !userMessage.trim()) {
    return res.status(400).json({ success: false, message: 'Nhập câu hỏi.' });
  }
  if (!ai.isConfigured()) {
    return res.status(500).json({ success: false, message: 'Thiếu GEMINI_API_KEY trên server.' });
  }

  req.aiTier = req.user.role === 'admin' ? 'admin' : 'staff';
  try {
    const system = chatSystemFor(req.aiTier) + (await buildInternalContext());
    const out = await ai.chatReply({
      tier: req.aiTier,
      system,
      history: chatHistory,
      message: userMessage,
      maxHistory: 10
    });
    await recordUsage(req, { endpoint: '/api/ai-admin', requestType: 'chat', userMessage });
    return res.json({ success: true, tier: req.aiTier, replyText: out.text, isPureChat: true });
  } catch (error) {
    await recordUsage(req, { endpoint: '/api/ai-admin', requestType: 'chat', success: false, errorMessage: error.message, userMessage });
    return res.status(500).json({
      success: false,
      message: `Hệ thống AI đang quá tải. Vui lòng thử lại sau ít phút. (${error.message})`
    });
  }
});

app.get('/', (req, res) => res.send('API MAC Running...'));
app.get('/api/health', (req, res) => res.json({ ok: true, ai: ai.isConfigured() ? 'gemini' : 'rules-only' }));

// Lỗi chưa bắt (vd CORS) không được làm lộ stack trace
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err?.message === 'CORS blocked') return res.status(403).json({ success: false, message: 'Nguồn truy cập không được phép.' });
  if (err?.type === 'entity.too.large') return res.status(413).json({ success: false, message: 'Dữ liệu gửi lên quá lớn.' });
  console.error('Lỗi không xác định:', err);
  res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server on port ${PORT}`));
}

module.exports = app;
