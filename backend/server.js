const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs'); 
const path = require('path'); 
const connectDB = require('./src/config/db');

// Import các Models
const Project = require('./src/models/Project');
const Package = require('./src/models/Package');
// =========================================================================
// 📁 MODEL DRAFT (RÀNG BUỘC DIỆN TÍCH & HIỆN TRẠNG)
// =========================================================================
const mongoose = require('mongoose');
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

// Import các Routes
const projectRoutes = require('./src/routes/projectRoutes');
const billRoutes = require('./src/routes/billRoutes');
const packageRoutes = require('./src/routes/packageRoutes');
const authRoutes = require('./src/routes/authRoutes');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 🟢 TIẾN TRÌNH ÉP DATABASE ĐỒNG BỘ 100% DỮ LIỆU CŨ LÊN ATLAS
const autoSeedDatabase = async () => {
  try {
    const projectCount = await Project.countDocuments();
    
    if (projectCount === 0) {
      console.log('📦 MongoDB Atlas trống! Đang quét tìm tệp dữ liệu cũ để đồng bộ...');
      let rawData = null;
      const pathsToTry = [
        './projects.json',
        './src/data/projects.json',
        '../frontend/public/assets/data/projects.json',
        './public/assets/data/projects.json'
      ];

      for (const p of pathsToTry) {
        if (fs.existsSync(p)) {
          console.log(`🔍 Tìm thấy file dữ liệu cũ tại đường dẫn: ${p}`);
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
        console.log('✅ ĐỒNG BỘ THÀNH CÔNG TẤT CẢ DỰ ÁN CŨ LÊN MONGODB ATLAS!');
      } else {
        console.log('❌ Thất bại: Không tìm thấy tệp projects.json nào ở Backend để hốt dữ liệu.');
      }
    } else {
      console.log('📊 Dữ liệu danh mục dự án trên MongoDB Atlas đã sẵn sàng thông suốt.');
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
      console.log('✅ Đã khởi tạo bảng giá định biên mặc định lên MongoDB Atlas!');
    }

    const draftCount = await Draft.countDocuments();
    if (draftCount === 0) {
      const defaultDrafts = [
        { key: 'draft-industrial', name: 'Draft 01: Layout mặt bằng Industrial (2 Mặt tiền)', basePricePerM2: 350000, demoImage: 'assets/pic/dedrip.jpg', minArea: 50, maxArea: 150, siteStatus: 'dat-trong' },
        { key: 'draft-minimalism', name: 'Draft 02: Layout mặt bằng Minimalism (Nhà ống)', basePricePerM2: 300000, demoImage: 'assets/pic/themonic.jpg', minArea: 30, maxArea: 100, siteStatus: 'nha-san' },
        { key: 'draft-classic', name: 'Draft 03: Layout mặt bằng Modern Classic (Biệt thự)', basePricePerM2: 450000, demoImage: 'assets/pic/Under.jpg', minArea: 100, maxArea: 500, siteStatus: 'all' }
      ];
      await Draft.insertMany(defaultDrafts);
      console.log('✅ Đã seeding thành công 3 cấu trúc Draft Layout mẫu kèm ràng buộc lên cơ sở dữ liệu!');
    }

  } catch (err) {
    console.error('❌ Lỗi tiến trình đồng bộ dữ liệu mẫu:', err.message);
  }
};

connectDB().then(() => {
  autoSeedDatabase();
}).catch(err => {
  console.error('❌ Lỗi kết nối DB:', err.message);
});

app.use('/api/projects', projectRoutes);
app.use('/api/bills', billRoutes);

app.get('/api/packages', async (req, res) => {
  try {
    const packages = await Package.find();
    const formattedPriceList = {};
    packages.forEach(pkg => {
      formattedPriceList[pkg.key] = { name: pkg.name, price: pkg.price };
    });
    res.json(formattedPriceList);
  } catch (error) {
    res.status(500).json({ message: "Lỗi đồng bộ giá", error: error.message });
  }
});

app.get('/api/drafts', async (req, res) => {
  try {
    const drafts = await Draft.find();
    res.json(drafts);
  } catch (error) {
    res.status(500).json({ message: "Lỗi đọc dữ liệu Draft", error: error.message });
  }
});

app.post('/api/drafts', async (req, res) => {
  try {
    const { key, name, basePricePerM2, demoImage, minArea, maxArea, siteStatus } = req.body;
    const newDraft = new Draft({ key, name, basePricePerM2, demoImage, minArea: minArea || 0, maxArea: maxArea || 5000, siteStatus: siteStatus || 'all' });
    await newDraft.save();
    res.json(newDraft);
  } catch (error) {
    res.status(500).json({ message: "Lỗi tạo mới Draft Layout", error: error.message });
  }
});

app.put('/api/drafts/:id', async (req, res) => {
  try {
    const { basePricePerM2, name, demoImage, minArea, maxArea, siteStatus } = req.body;
    const updatedDraft = await Draft.findByIdAndUpdate(req.params.id, { basePricePerM2, name, demoImage, minArea, maxArea, siteStatus }, { new: true });
    res.json(updatedDraft);
  } catch (error) {
    res.status(500).json({ message: "Lỗi biên tập Draft", error: error.message });
  }
});

app.delete('/api/drafts/:id', async (req, res) => {
  try {
    await Draft.findByIdAndDelete(req.params.id);
    res.json({ message: "Đã xóa vĩnh viễn cấu trúc Draft thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi loại bỏ Draft Layout", error: error.message });
  }
});

app.use('/api/packages', packageRoutes);
app.use('/api/auth', authRoutes);

// =========================================================================
// 🤖 API CONVERSATIONAL AI CHATBOT (HIỂU MỌI NGÔN NGỮ - GEMINI 100%)
// =========================================================================
app.post('/api/ai-consult', async (req, res) => {
  try {
    const { style: reqStyle, area: reqArea, spaceType: reqSpaceType, userMessage } = req.body;

    // --- TRƯỜNG HỢP 1: TẠO TỪ FORM CHỌN TĨNH ---
    if (!userMessage) {
      const style = reqStyle || 'Industrial';
      const spaceType = reqSpaceType || 'Quán Kafe & Trà Sữa';
      const numArea = Number(reqArea) || 120;

      let basePricePerM2 = 380000;
      if (spaceType.includes('Nhà Ở') || spaceType.includes('Nhà Phố')) basePricePerM2 = 350000;
      if (spaceType.includes('Biệt Thự')) basePricePerM2 = 480000;
      if (spaceType.includes('Nhà Hàng')) basePricePerM2 = 420000;
      if (spaceType.includes('Bar')) basePricePerM2 = 450000;

      const baseCost = numArea * basePricePerM2;
      const boqCost = baseCost * 0.05;
      const totalCost = baseCost + boqCost;

      const promptText = `photorealistic 8k interior design rendering of a ${spaceType}, ${style} style, ${numArea} square meters, professional architectural photography, cinematic warm lighting, high end materials, ultra detailed`;
      const aiImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?model=flux&width=1280&height=800&nologo=true&seed=${Math.floor(Math.random() * 900000 + 100000)}`;

      return res.json({
        success: true,
        replyText: `Phương án thiết kế **${spaceType}** phong cách **${style}** quy mô **${numArea}m²** đã hoàn thành phác thảo phối cảnh AI 8K.`,
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
    }

    // --- TRƯỜNG HỢP 2: CHAT TỰ DO MỌI NGÔN NGỮ QUA GEMINI REST API ---
    const apiKey = process.env.GEMINI_API_KEY;
    let aiParsedData = null;

    if (apiKey) {
      try {
        const currentDate = new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        const systemPrompt = `You are a Senior Architect AI at MAC Concept. You can chat freely in ANY language about ANY topic (greetings, general chat, weather, today's date, casual talk). 
        Today's Date: ${currentDate}.
        Analyze the user's message intent and return ONLY a valid JSON without markdown formatting:
        {
          "isArchitectureRequest": boolean (set to true ONLY IF user explicitly requests to draw, design, render, build, or estimate cost for a specific building type like house, villa, cafe, restaurant, apartment, space with area in m2),
          "replyText": string (your natural, friendly, human-like response in the EXACT SAME language as user message),
          "spaceTypeEn": string (e.g. "Residential House", "Coffee Shop", "Villa"),
          "spaceTypeVi": string (e.g. "Nhà Ở Dân Dụng / Nhà Phố", "Quán Kafe & Trà Sữa"),
          "style": string (e.g. "Minimalism", "Modern Classic", "Industrial"),
          "area": number (extracted size in m2, default 100)
        }`;

        // Cấu hình URL + Headers linh hoạt (Chấp nhận cả Key AIzaSy... và Token AQ...)
        const isStandardKey = apiKey.startsWith('AIzaSy');
        const url = isStandardKey 
          ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
          : `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;

        const headers = { 'Content-Type': 'application/json' };
        if (!isStandardKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const apiRes = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\nUser Question: "${userMessage}"` }] }]
          })
        });

        if (apiRes.ok) {
          const resData = await apiRes.json();
          const responseText = resData.candidates[0].content.parts[0].text;
          const rawJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          aiParsedData = JSON.parse(rawJson);
        }
      } catch (err) {
        // Ignored error
      }
    }

    // 🤖 BỘ PHÂN TÍCH LOCAL DỰ PHÒNG TỰ NHIÊN (Khi gặp sự cố mạng/mã auth)
    if (!aiParsedData) {
      const msg = userMessage.toLowerCase().trim();
      const now = new Date();
      const dateStr = `Hôm nay là ${now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;

      let replyText = "";
      let isArch = false;

      if (msg.includes('chào') || msg.includes('hi') || msg.includes('hello')) {
        replyText = `Chào bạn! Rất vui được gặp bạn. Tôi có thể hỗ trợ gì cho bạn hoặc trao đổi về ý tưởng thiết kế không gian không?`;
      } else if (msg.includes('ngày') || msg.includes('bao nhiêu') || msg.includes('hôm nay') || msg.includes('thứ mấy')) {
        replyText = `Dạ, ${dateStr} nè bạn! Bạn đang muốn lên kế hoạch thiết kế cho dịp sắp tới đúng không?`;
      } else if (msg.includes('ai') || msg.includes('bạn là') || msg.includes('tên gì')) {
        replyText = `Tôi là KTS Trưởng AI của MAC Concept! Tôi có thể tán gẫu, tư vấn ý tưởng kiến trúc hoặc phác thảo 3D & bóc giá tự động cho bạn.`;
      } else if (msg.includes('cảm ơn') || msg.includes('thanks')) {
        replyText = `Không có chi nè! Cứ thoải mái chia sẻ thêm với tôi bất kỳ lúc nào nhé.`;
      }

      let spaceTypeVi = 'Quán Kafe & Trà Sữa';
      let spaceTypeEn = 'Coffee Shop';

      const areaMatch = msg.match(/(\d+)/);
      const numArea = areaMatch ? parseInt(areaMatch[0]) : 100;

      if (msg.includes('nhà') || msg.includes('ở') || msg.includes('phố') || msg.includes('house') || msg.includes('căn hộ') || msg.includes('apartment')) {
        spaceTypeVi = 'Nhà Ở Dân Dụng / Nhà Phố';
        spaceTypeEn = 'Residential House';
        isArch = true;
      } else if (msg.includes('biệt thự') || msg.includes('villa')) {
        spaceTypeVi = 'Biệt Thự Cao Cấp';
        spaceTypeEn = 'Luxury Villa';
        isArch = true;
      } else if (msg.includes('kafe') || msg.includes('cafe') || msg.includes('cà phê') || msg.includes('trà sữa')) {
        spaceTypeVi = 'Quán Kafe & Trà Sữa';
        spaceTypeEn = 'Coffee Shop';
        isArch = true;
      } else if (msg.includes('nhà hàng') || msg.includes('restaurant')) {
        spaceTypeVi = 'Nhà Hàng F&B Trọn Gói';
        spaceTypeEn = 'Restaurant';
        isArch = true;
      } else if (msg.includes('làm') || msg.includes('vẽ') || msg.includes('thiết kế') || msg.includes('draw') || msg.includes('design') || msg.includes('m2')) {
        isArch = true;
      }

      if (isArch && !replyText) {
        replyText = `Dựa trên ý tưởng "${userMessage}" của bạn, KTS MAC đề xuất phác thảo 3D FLUX 8K kèm bảng dự toán hạch toán sơ bộ dưới đây:`;
      } else if (!replyText) {
        replyText = `Ý tưởng của bạn nghe thú vị đấy! Bạn có muốn tôi phác thảo 3D thử phối cảnh hay tính toán dự toán tài chính sơ bộ không?`;
      }

      let style = 'Industrial';
      if (msg.includes('cổ điển') || msg.includes('classic')) style = 'Modern Classic';
      if (msg.includes('tối giản') || msg.includes('minimal')) style = 'Minimalism';

      aiParsedData = {
        isArchitectureRequest: isArch,
        replyText,
        spaceTypeEn,
        spaceTypeVi,
        style,
        area: numArea
      };
    }

    // Nếu người dùng chỉ nói chuyện / tán gẫu bình thường
    if (!aiParsedData.isArchitectureRequest) {
      return res.json({
        success: true,
        replyText: aiParsedData.replyText,
        isPureChat: true
      });
    }

    // Nếu người dùng yêu cầu chuyên môn vẽ / làm công trình -> Render FLUX 8K & Bóc giá
    const numArea = aiParsedData.area || 100;
    const spaceType = aiParsedData.spaceTypeVi || aiParsedData.spaceTypeEn;
    const style = aiParsedData.style || 'Industrial';

    let basePricePerM2 = 380000;
    if (spaceType.includes('Nhà Ở') || spaceType.includes('Residential')) basePricePerM2 = 350000;
    if (spaceType.includes('Biệt Thự') || spaceType.includes('Villa')) basePricePerM2 = 480000;
    if (spaceType.includes('Nhà Hàng') || spaceType.includes('Restaurant')) basePricePerM2 = 420000;

    const baseCost = numArea * basePricePerM2;
    const boqCost = baseCost * 0.05;
    const totalCost = baseCost + boqCost;

    const promptText = `photorealistic 8k interior design rendering of a ${aiParsedData.spaceTypeEn || spaceType}, ${style} style, ${numArea} square meters, professional architectural photography, cinematic warm lighting, high end materials, ultra detailed`;
    const aiImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?model=flux&width=1280&height=800&nologo=true&seed=${Math.floor(Math.random() * 900000 + 100000)}`;

    res.json({
      success: true,
      replyText: aiParsedData.replyText,
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
    console.error("Lỗi xử lý AI Consult:", error);
    res.status(500).json({ success: false, message: "Không thể kết nối KTS AI." });
  }
});

app.get('/', (req, res) => {
  res.send('API Hệ Thống MAC Concept đang chạy ổn định...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🔥 Server Backend đang kích hoạt trên cổng ${PORT}`);
});