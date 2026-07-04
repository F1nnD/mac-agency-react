const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs'); 
const path = require('path'); // 🟢 Đã thêm thư viện path để tránh lỗi crash hệ thống nâng cao
const connectDB = require('./src/config/db');

// Import các Models
const Project = require('./src/models/Project');
const Package = require('./src/models/Package');

// Import các Tuyến đường API (Routes)
const projectRoutes = require('./src/routes/projectRoutes');
const billRoutes = require('./src/routes/billRoutes');
const packageRoutes = require('./src/routes/packageRoutes');
const authRoutes = require('./src/routes/authRoutes');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json()); 

// 🟢 TIẾN TRÌNH ÉP DATABASE ĐỒNG BỘ 100% DỮ LIỆU CŨ LÊN ATLAS
const autoSeedDatabase = async () => {
  try {
    // 1. Kiểm tra xem MongoDB có đang rỗng hay không
    const projectCount = await Project.countDocuments();
    
    if (projectCount === 0) {
      console.log('📦 MongoDB Atlas trống! Đang quét tìm tệp dữ liệu cũ để đồng bộ...');
      
      // Thử quét tất cả các đường dẫn có khả năng chứa file projects.json của bạn
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

      // Nếu tìm thấy file, tiến hành cấu trúc lại và "bơm" thẳng lên MongoDB Atlas
      if (rawData) {
        const localProjects = JSON.parse(rawData);
        
        const projectArray = Object.keys(localProjects).map(key => ({
          breadcrumb: key,
          name: localProjects[key].name || key,
          type: localProjects[key].type || 'Architecture • Interior',
          location: localProjects[key].location || 'TP. Hồ Chí Minh',
          area: localProjects[key].area || '100 m²',
          year: localProjects[key].year || '2026',
          heading: localProjects[key].heading || '',      // Đấu nối trường mới
          shortDesc: localProjects[key].shortDesc || '',  // Đấu nối trường mới
          img1: localProjects[key].img1 || '',
          projectDesc: localProjects[key].projectDesc || localProjects[key].desc1 || 'Chưa có mô tả chi tiết từ Admin.'
        }));

        await Project.insertMany(projectArray);
        console.log('✅ ĐỒNG BỘ THÀNH CÔNG TẤT CẢ DỰ ÁN CŨ LÊN MONGODB ATLAS!');
      } else {
        console.log('❌ Thất bại: Không tìm thấy tệp projects.json nào ở Backend để hốt dữ liệu.');
      }
    } else {
      console.log('📊 Dữ liệu danh mục dự án trên MongoDB Atlas đã sẵn sàng thông suốt.');
    }

    // B. Đồng bộ bảng giá mặc định (Giữ nguyên)
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

  } catch (err) {
    console.error('❌ Lỗi tiến trình đồng bộ dữ liệu mẫu:', err.message);
  }
};

// 🟢 1. KẾT NỐI DATABASE VÀ CHỈ KÍCH HOẠT SEED KHI ĐÃ THÔNG MẠNG
connectDB().then(() => {
  autoSeedDatabase();
}).catch(err => {
  console.error('❌ Không thể khởi chạy tiến trình Seeding do lỗi kết nối DB:', err.message);
});

// Đấu nối hệ thống API vào Server
app.use('/api/projects', projectRoutes);
app.use('/api/bills', billRoutes);

// 🔥 2. ĐÈ TRỰC TIẾP ĐƯỜNG DẪN ĐỒNG BỘ GIÁ VÀO ĐÂY ĐỂ ÉP ĐỊNH DẠNG ĐƯỢC ĐỒNG NHẤT VỚI HOME
app.get('/api/packages', async (req, res) => {
  try {
    const packages = await Package.find();
    
    // Nén mảng từ Database thành một Object cấu trúc phẳng mà file Home.jsx của bạn đang chờ đợi
    const formattedPriceList = {};
    packages.forEach(pkg => {
      formattedPriceList[pkg.key] = {
        name: pkg.name,
        price: pkg.price // Giữ nguyên 100% con số khổng lồ Admin nhập, không can thiệp!
      };
    });
    
    res.json(formattedPriceList);
  } catch (error) {
    res.status(500).json({ message: "Lỗi chuyển đổi cấu trúc đồng bộ giá", error: error.message });
  }
});

// Các route còn lại giữ nguyên
app.use('/api/packages', packageRoutes);
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('API Hệ Thống MAC Concept đang chạy ổn định...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🔥 Server Backend đang kích hoạt trên cổng ${PORT}`);
});