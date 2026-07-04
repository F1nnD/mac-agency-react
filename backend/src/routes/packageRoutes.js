const express = require('express');
const router = express.Router();
const Package = require('../models/Package'); // Đường dẫn tới Model của bạn

// API lấy bảng giá - Sửa lại để cấu trúc bám đuổi 100% theo giao diện Home.jsx
router.get('/', async (req, res) => {
  try {
    const packages = await Package.find();
    
    // Nén mảng từ MongoDB thành định dạng Object cấu trúc phẳng mà Home.jsx đang chờ
    const formattedPriceList = {};
    packages.forEach(pkg => {
      formattedPriceList[pkg.key] = {
        name: pkg.name,
        price: pkg.price
      };
    });
    
    // Trả về Object chuẩn: { concept: { price: ... }, build: { price: ... } }
    res.json(formattedPriceList);
  } catch (error) {
    res.status(500).json({ message: "Lỗi đồng bộ cấu trúc bảng giá", error: error.message });
  }
});

module.exports = router;