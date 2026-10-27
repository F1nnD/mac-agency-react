// =============================================================
// BACKEND SERVER — MAC CONCEPT
// =============================================================
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const settingsRoutes = require('./src/routes/settingsRoutes');

// ===== MIDDLEWARE AUTH =====
const { optionalAuth, requirePro, verifyToken, requireRole } = require('./src/middleware/authMiddleware');
const { checkAIQuota } = require('./src/middleware/aiQuotaMiddleware');

// ===== MODELS =====
const Project = require('./src/models/Project');
const Package = require('./src/models/Package');
const AIUsage = require('./src/models/AIUsage');

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

// ===== ROUTES =====
const projectRoutes = require('./src/routes/projectRoutes');
const packageRoutes = require('./src/routes/packageRoutes');
const authRoutes = require('./src/routes/authRoutes');
const dataRoutes = require('./src/routes/dataRoutes');
const statsRoutes = require('./src/routes/statsRoutes');

// ===== INIT =====
dotenv.config();
const app = express();
// THÊM DÒNG NÀY ĐỂ SỬA LỖI RATE LIMIT TRÊN RENDER
app.set('trust proxy', 1); 
// 1. CẤU HÌNH CORS
const defaultOrigins = 'http://localhost:5173,http://localhost:3000,http://localhost:5174,https://moreactisticconcept.onrender.com';
const allowedOrigins = (process.env.CORS_ORIGINS || defaultOrigins).split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/api/settings', settingsRoutes);

// 3. RATE LIMIT
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));
app.use('/api/ai-free', rateLimit({ windowMs: 60 * 1000, max: 15 }));
app.use('/api/ai-pro', rateLimit({ windowMs: 60 * 1000, max: 15 }));
app.use('/api/ai-admin', rateLimit({ windowMs: 60 * 1000, max: 30 }));

// 4. MOUNT ROUTES
app.use('/api/projects', projectRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/stats', statsRoutes);

// 5. KẾT NỐI DB & SEED DATA (Giữ nguyên logic cũ)
connectDB().then(() => console.log('DB Ready')).catch(err => console.error('Lỗi DB:', err.message));

// 6. CÁC ROUTE INLINE KHÁC
app.get('/api/packages', async (req, res) => {
  try {
    const packages = await Package.find();
    const formattedPriceList = {};
    packages.forEach(pkg => { formattedPriceList[pkg.key] = { name: pkg.name, price: pkg.price }; });
    res.json(formattedPriceList);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/drafts', async (req, res) => {
  try { res.json(await Draft.find()); } catch (error) { res.status(500).json({ message: error.message }); }
});

// =============================================================
// TẦNG 1: AI FREE (Khách Thường - 1 ảnh/3 ngày)
// =============================================================
app.post('/api/ai-free', optionalAuth, async (req, res) => {
  // Logic chat cơ bản cho Free (Không qua checkQuota ảnh)
  try {
    const { userMessage, chatHistory } = req.body;
    if (!userMessage) return res.status(400).json({ success: false, message: 'Nhập câu hỏi.' });

    const apiKey = process.env.GEMINI_API_KEY;
    let replyText = '';

    if (apiKey) {
      const systemPrompt = `Bạn là nhân viên tư vấn của MAC Concept. Hãy trả lời ngắn gọn, thân thiện. Nếu khách muốn thiết kế, hãy khuyên họ nâng cấp lên gói Pro để được AI vẽ phối cảnh.`;
      let contents = [];
      if (chatHistory) {
        chatHistory.slice(-3).forEach(msg => contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] }));
      }
      contents.push({ role: 'user', parts: [{ text: userMessage }] });

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const apiRes = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt }] }, contents })
      });

      if (apiRes.ok) {
        const data = await apiRes.json();
        replyText = data.candidates[0].content.parts[0].text;
      }
    }
    return res.json({ success: true, tier: 'free', replyText: replyText || 'Vui lòng thử lại sau.', isPureChat: true });
  } catch (error) { return res.status(500).json({ success: false, message: 'Lỗi AI.' }); }
});

// =============================================================
// TẦNG 2: AI PRO (Khách Trả Phí - 3 ảnh/ngày)
// =============================================================
app.post('/api/ai-pro', optionalAuth, checkAIQuota, async (req, res) => {
  try {
    const { userMessage, style: reqStyle, area: reqArea, spaceType: reqSpaceType, chatHistory } = req.body;

    let spaceType = reqSpaceType || 'Công trình';
    let style = reqStyle || 'Industrial';
    let numArea = Number(reqArea) || 100;
    let replyText = '';
    let spaceTypeEn = 'Building';
    let isArchitectRequest = reqStyle ? true : false; // Nếu từ Form gửi lên là muốn vẽ

    // Nếu là Chat, để AI tự phân tích
    if (userMessage && !reqStyle) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        const systemPrompt = `Bạn là KTS của MAC Concept. Trò chuyện tự nhiên. Nếu khách muốn vẽ, hãy trả về JSON:
{ "replyText": "câu trả lời", "isArchitectRequest": boolean, "spaceTypeVi": "tên", "spaceTypeEn": "tên tiếng Anh", "style": "phong cách", "area": number }`;
        
        let contents = [];
        if (chatHistory) {
          chatHistory.slice(-5).forEach(msg => contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] }));
        }
        contents.push({ role: 'user', parts: [{ text: userMessage }] });

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const apiRes = await fetch(url, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt }] }, contents })
        });

        if (apiRes.ok) {
          const data = await apiRes.json();
          let text = data.candidates[0].content.parts[0].text;
          try {
            const parsed = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
            replyText = parsed.replyText;
            isArchitectRequest = parsed.isArchitectRequest;
            if (parsed.spaceTypeVi) spaceType = parsed.spaceTypeVi;
            if (parsed.spaceTypeEn) spaceTypeEn = parsed.spaceTypeEn;
            if (parsed.style) style = parsed.style;
            if (parsed.area) numArea = parsed.area;
          } catch (e) { replyText = text; isArchitectRequest = false; }
        }
      }
    }

    if (!replyText) replyText = `Dạ, tôi đã ghi nhận yêu cầu.`;

    // Nếu chỉ chat
    if (!isArchitectRequest) {
      return res.json({ success: true, tier: 'pro', replyText, remaining: req.aiRemaining, isPureChat: true });
    }

    // Nếu vẽ
    let basePricePerM2 = 380000;
    if (spaceType.includes('Nhà Ở')) basePricePerM2 = 350000;
    if (spaceType.includes('Biệt Thự')) basePricePerM2 = 480000;
    const baseCost = numArea * basePricePerM2;
    const boqCost = baseCost * 0.05;
    const totalCost = baseCost + boqCost;

    const promptText = `photorealistic 8k architectural visualization, ${spaceTypeEn}, ${style} style, professional photography, cinematic lighting`;
    const aiImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?model=flux-realism&width=1024&height=768&nologo=true`;

    // Ghi log AIUsage (để đếm quota)
    await AIUsage.create({
      userId: req.user?.userId || null,
      tier: req.aiTier,
      endpoint: '/api/ai-pro',
      requestType: 'render',
      generatedImage: true,
      success: true,
    }).catch(() => {});

    return res.json({
      success: true, tier: 'pro', replyText, style, spaceType, area: numArea, basePricePerM2, baseCost, boqCost, totalCost, aiImageUrl, remaining: req.aiRemaining, isPureChat: false
    });
  } catch (error) { return res.status(500).json({ success: false, message: 'Lỗi AI Pro.' }); }
});

// =============================================================
// TẦNG 3: AI ADMIN (Đầu chuỗi - Chuyên sâu)
// =============================================================
app.post('/api/ai-admin', optionalAuth, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const { userMessage, chatHistory } = req.body;
    if (!userMessage) return res.status(400).json({ success: false, message: 'Nhập câu hỏi.' });

    const apiKey = process.env.GEMINI_API_KEY;
    let replyText = '';

    if (apiKey) {
      const systemPrompt = `Bạn là KTS Trưởng của MAC Concept, đang nói chuyện với Sếp/Quản lý. Hãy tư vấn kết cấu, vật liệu, dự toán BOQ cực kỳ chuyên sâu và thực tế. Trả lời thẳng thắn, không lan man.`;
      let contents = [];
      if (chatHistory) {
        chatHistory.slice(-10).forEach(msg => contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] }));
      }
      contents.push({ role: 'user', parts: [{ text: userMessage }] });

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;      const apiRes = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt }] }, contents })
      });

      if (apiRes.ok) {
        const data = await apiRes.json();
        replyText = data.candidates[0].content.parts[0].text;
      }
    }

    return res.json({ success: true, tier: 'admin', replyText: replyText || 'Lỗi kết nối AI.', isPureChat: true });
  } catch (error) { return res.status(500).json({ success: false, message: 'Lỗi AI Admin.' }); }
});

app.get('/', (req, res) => res.send('API MAC Running...'));
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));