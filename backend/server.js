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
const {
  optionalAuth,
  requirePro
} = require('./src/middleware/authMiddleware');
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

// =============================================================
// 1. CẤU HÌNH CORS (PHẢI NẰM TRÊN CÙNG)
// =============================================================
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000,http://localhost:5174')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.log('CORS blocked origin:', origin);
    return callback(new Error('CORS: Origin không được phép → ' + origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// =============================================================
// 2. CÁC MIDDLEWARE CƠ BẢN
// =============================================================
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/api/settings', settingsRoutes);
// =============================================================
// 3. RATE LIMIT
// =============================================================
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.' }
});
app.use('/api', globalLimiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều lần đăng nhập sai. Vui lòng thử lại sau 15 phút.' }
});
app.use('/api/auth/login', loginLimiter);

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Bạn đã gọi AI quá nhanh. Vui lòng chờ 1 phút.' }
});
app.use('/api/ai-consult-free', aiLimiter);
app.use('/api/ai-consult-pro', aiLimiter);

// =============================================================
// 4. MOUNT ROUTES (SAU KHI ĐÃ QUA CORS VÀ JSON)
// =============================================================
app.use('/api/projects', projectRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/stats', statsRoutes);

// =============================================================
// 5. AUTO SEED DATABASE
// =============================================================
const autoSeedDatabase = async () => {
  try {
    const projectCount = await Project.countDocuments();

    if (projectCount === 0) {
      console.log('MongoDB Atlas trống! Đang quét tìm tệp dữ liệu cũ để đồng bộ...');
      let rawData = null;
      const pathsToTry = [
        './projects.json',
        './src/data/projects.json',
        '../frontend/public/assets/data/projects.json',
        './public/assets/data/projects.json'
      ];

      for (const p of pathsToTry) {
        if (fs.existsSync(p)) {
          console.log(`Tìm thấy file dữ liệu cũ tại: ${p}`);
          rawData = fs.readFileSync(p, 'utf-8');
          break;
        }
      }

      if (rawData) {
        const localProjects = JSON.parse(rawData);
        const projectArray = Object.keys(localProjects).map(key => ({
          breadcrumb: key,
          name: localProjects[key].name || key,
          type: localProjects[key].type || 'Architecture • Interior',
          location: localProjects[key].location || 'TP. Hồ Chí Minh',
          area: localProjects[key].area || '100 m²',
          year: localProjects[key].year || '2026',
          subtitle: localProjects[key].subtitle || '',
          quote: localProjects[key].quote || '',
          desc1: localProjects[key].desc1 || '',
          desc2: localProjects[key].desc2 || '',
          projectDesc: localProjects[key].projectDesc || localProjects[key].desc1 || 'Chưa có mô tả chi tiết từ Admin.',
          img1: localProjects[key].img1 || '',
          img2: localProjects[key].img2 || '',
          img3: localProjects[key].img3 || '',
          img4: localProjects[key].img4 || ''
        }));

        await Project.insertMany(projectArray);
        console.log('ĐỒNG BỘ THÀNH CÔNG TẤT CẢ DỰ ÁN CŨ LÊN MONGODB ATLAS!');
      } else {
        console.log('Thất bại: Không tìm thấy tệp projects.json nào.');
      }
    } else {
      console.log('Dữ liệu danh mục dự án đã sẵn sàng.');
    }

    const packageCount = await Package.countDocuments();
    if (packageCount === 0) {
      const defaultPackages = [
        { key: 'concept', num: '01', name: 'Gói Thiết Kế Concept', unit: 'm²', price: 350000 },
        { key: 'build', num: '02', name: 'Gói Thi Công Trọn Gói', unit: 'm²', price: 3500000 },
        { key: 'combo', num: '03', name: 'Combo Premium Thượng Lưu', unit: 'm²', price: 4200000 },
        { key: 'landscape', num: '04', name: 'Cảnh Quan Nghệ Thuật', unit: 'm²', price: 800000 }
      ];
      await Package.insertMany(defaultPackages);
      console.log('Đã khởi tạo bảng giá định biên mặc định.');
    }

    const draftCount = await Draft.countDocuments();
    if (draftCount === 0) {
      const defaultDrafts = [
        { key: 'draft-industrial', name: 'Draft 01: Layout mặt bằng Industrial (2 Mặt tiền)', basePricePerM2: 350000, demoImage: 'assets/pic/dedrip.jpg', minArea: 50, maxArea: 150, siteStatus: 'dat-trong' },
        { key: 'draft-minimalism', name: 'Draft 02: Layout mặt bằng Minimalism (Nhà ống)', basePricePerM2: 300000, demoImage: 'assets/pic/themonic.jpg', minArea: 30, maxArea: 100, siteStatus: 'nha-san' },
        { key: 'draft-classic', name: 'Draft 03: Layout mặt bằng Modern Classic (Biệt thự)', basePricePerM2: 450000, demoImage: 'assets/pic/Under.jpg', minArea: 100, maxArea: 500, siteStatus: 'all' }
      ];
      await Draft.insertMany(defaultDrafts);
      console.log('Đã seeding 3 cấu trúc Draft Layout mẫu.');
    }

  } catch (err) {
    console.error('Lỗi tiến trình đồng bộ dữ liệu mẫu:', err.message);
  }
};

connectDB()
  .then(() => autoSeedDatabase())
  .catch(err => console.error('❌ Lỗi kết nối DB:', err.message));

// =============================================================
// 6. CÁC ROUTE INLINE KHÁC
// =============================================================
app.get('/api/packages', async (req, res) => {
  try {
    const packages = await Package.find();
    const formattedPriceList = {};
    packages.forEach(pkg => {
      formattedPriceList[pkg.key] = { name: pkg.name, price: pkg.price };
    });
    res.json(formattedPriceList);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi đồng bộ giá', error: error.message });
  }
});

app.get('/api/drafts', async (req, res) => {
  try {
    const drafts = await Draft.find();
    res.json(drafts);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi đọc dữ liệu Draft', error: error.message });
  }
});

app.post('/api/drafts', async (req, res) => {
  try {
    const { key, name, basePricePerM2, demoImage, minArea, maxArea, siteStatus } = req.body;
    const newDraft = new Draft({
      key, name, basePricePerM2, demoImage,
      minArea: minArea || 0,
      maxArea: maxArea || 5000,
      siteStatus: siteStatus || 'all'
    });
    await newDraft.save();
    res.json(newDraft);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tạo mới Draft Layout', error: error.message });
  }
});

app.put('/api/drafts/:id', async (req, res) => {
  try {
    const { basePricePerM2, name, demoImage, minArea, maxArea, siteStatus } = req.body;
    const updatedDraft = await Draft.findByIdAndUpdate(
      req.params.id,
      { basePricePerM2, name, demoImage, minArea, maxArea, siteStatus },
      { new: true }
    );
    res.json(updatedDraft);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi biên tập Draft', error: error.message });
  }
});

app.delete('/api/drafts/:id', async (req, res) => {
  try {
    await Draft.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa vĩnh viễn cấu trúc Draft thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi loại bỏ Draft Layout', error: error.message });
  }
});

// =============================================================
// AI CONSULT — FREE
// =============================================================
app.post(
  '/api/ai-consult-free',
  optionalAuth,
  checkAIQuota,
  async (req, res) => {
    try {
      const { userMessage } = req.body;

      if (!userMessage || !userMessage.trim()) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập câu hỏi.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      let replyText = '';

      if (apiKey) {
        try {
          const currentDate = new Date().toLocaleDateString('vi-VN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          });

          const systemPrompt = `You are a Senior Architect AI at MAC Concept. You can chat freely in ANY language about ANY topic.
Today's Date: ${currentDate}.
Analyze the user's message intent and return ONLY a valid JSON without markdown formatting:
{
  "replyText": string,
  "topic": string
}`;

          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent`;
          const headers = { 
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey 
          };

          const apiRes = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemPrompt}\n\nUser: "${userMessage}"` }] }]
            })
          });

          if (apiRes.ok) {
            const resData = await apiRes.json();
            const responseText = resData.candidates[0].content.parts[0].text;
            const rawJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(rawJson);
            replyText = parsed.replyText || '';
          }
        } catch (err) {
          console.log('Lỗi gọi Gemini Free:', err.message);
        }
      }

      if (!replyText) {
        replyText = 'Cảm ơn bạn đã chia sẻ. Để được tư vấn sâu hơn, bạn hãy nâng cấp lên gói Pro.';
      }

      await AIUsage.create({
        userId: req.user?.userId || null,
        tier: req.aiTier,
        endpoint: '/api/ai-consult-free',
        requestType: 'chat',
        userMessage: userMessage.substring(0, 500),
        generatedImage: false,
        success: true,
        ipAddress: req.ip || ''
      }).catch(() => {});

      return res.json({
        success: true,
        tier: req.aiTier,
        remaining: req.aiRemaining,
        replyText,
        isPureChat: true
      });
    } catch (error) {
      console.error('Lỗi AI Free:', error);
      return res.status(500).json({ success: false, message: 'Không thể kết nối AI.' });
    }
  }
);

// =============================================================
// AI CONSULT — PRO
// =============================================================
app.post(
  '/api/ai-consult-pro',
  optionalAuth,
  requirePro,
  checkAIQuota,
  async (req, res) => {
    try {
      const { style: reqStyle, area: reqArea, spaceType: reqSpaceType, userMessage } = req.body;

      let spaceType = reqSpaceType || 'Quán Kafe & Trà Sữa';
      let style = reqStyle || 'Industrial';
      let numArea = Number(reqArea) || 120;
      let replyText = '';
      let spaceTypeEn = 'Coffee Shop';

      if (userMessage && !reqStyle) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
          try {
            const currentDate = new Date().toLocaleDateString('vi-VN', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });

            const systemPrompt = `You are a Senior Architect AI at MAC Concept.
Today's Date: ${currentDate}.
Return ONLY valid JSON: { "replyText": string, "spaceTypeVi": string, "spaceTypeEn": string, "style": string, "area": number }`;

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent`;
            const headers = { 
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey 
            };

            const apiRes = await fetch(url, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemPrompt}\n\nUser: "${userMessage}"` }] }]
              })
            });

            if (apiRes.ok) {
              const resData = await apiRes.json();
              const text = resData.candidates[0].content.parts[0].text;
              const parsed = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
              spaceType = parsed.spaceTypeVi || spaceType;
              spaceTypeEn = parsed.spaceTypeEn || spaceTypeEn;
              style = parsed.style || style;
              numArea = parsed.area || numArea;
              replyText = parsed.replyText || '';
            }
          } catch (err) {}
        }
      }

      if (!replyText) {
        replyText = `Phương án thiết kế ${spaceType} phong cách ${style} quy mô ${numArea}m² đã hoàn thành phác thảo phối cảnh AI 8K.`;
      }

      let basePricePerM2 = 380000;
      if (spaceType.includes('Nhà Ở') || spaceType.includes('Residential')) basePricePerM2 = 350000;
      if (spaceType.includes('Biệt Thự') || spaceType.includes('Villa')) basePricePerM2 = 480000;
      if (spaceType.includes('Nhà Hàng') || spaceType.includes('Restaurant')) basePricePerM2 = 420000;
      if (spaceType.includes('Bar')) basePricePerM2 = 450000;

      const baseCost = numArea * basePricePerM2;
      const boqCost = baseCost * 0.05;
      const totalCost = baseCost + boqCost;

            // NÂNG CẤP: Render ảnh 2K chất lượng cao
            const promptText = `photorealistic 8k architectural visualization, interior design rendering of a ${spaceTypeEn}, ${style} style, ${numArea} square meters, professional architectural photography, cinematic warm lighting, high end materials, ray tracing, ultra detailed, masterpiece`;
            const aiImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?model=flux-realism&width=2048&height=1152&nologo=true&seed=${Math.floor(Math.random() * 900000 + 100000)}`;
      await AIUsage.create({
        userId: req.user?.userId || null,
        tier: req.aiTier,
        endpoint: '/api/ai-consult-pro',
        requestType: userMessage ? 'chat' : 'form',
        userMessage: (userMessage || '').substring(0, 500),
        generatedImage: true,
        success: true,
        ipAddress: req.ip || ''
      }).catch(() => {});

      return res.json({
        success: true,
        tier: req.aiTier,
        remaining: req.aiRemaining,
        replyText,
        style,
        spaceType,
        area: numArea,
        basePricePerM2,
        baseCost,
        boqCost,
        totalCost,
        aiImageUrl,
        isPureChat: false
      });
    } catch (error) {
      console.error('Lỗi AI Pro:', error);
      return res.status(500).json({ success: false, message: 'Không thể kết nối AI Pro.' });
    }
  }
);

// =============================================================
// HEALTH CHECK & START
// =============================================================
app.get('/', (req, res) => {
  res.send('API Hệ Thống MAC Concept đang chạy ổn định...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server Backend đang kích hoạt trên cổng ${PORT}`);
});