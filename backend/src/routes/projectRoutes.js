const express = require('express');
const router = express.Router();
const Project = require('../models/Project'); // Đường dẫn tới Model Project của bạn

// 🟢 API 1: CẬP NHẬT/SỬA DỰ ÁN (Bao gồm cả Tên, Thẻ và Mô tả chi tiết)
router.put('/:id', async (req, res) => {
  try {
    const { name, breadcrumb, type, location, area, year, projectDesc, heading, shortDesc } = req.body;
    
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      {
        name,
        breadcrumb,
        type,
        location,
        area,
        year,
        projectDesc, // Ô nhập văn bản lớn dưới cùng
        heading,     // Dòng chữ in hoa ở trang chi tiết (Ví dụ: SETUP KHÔNG GIAN NGHỆ THUẬT...)
        shortDesc    // Đoạn văn ngắn (Ví dụ: Underhood Kafe là sự kết hợp táo bạo...)
      },
      { new: true } // Trả về dữ liệu mới nhất sau khi sửa
    );
    
    if (!updatedProject) return res.status(404).json({ message: "Không tìm thấy dự án!" });
    res.json({ message: "✅ Cập nhật dự án thành công!", data: updatedProject });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔴 API 2: XÓA DỰ ÁN KHỎI HỆ THỐNG
router.delete('/:id', async (req, res) => {
  try {
    const deletedProject = await Project.findByIdAndDelete(req.params.id);
    if (!deletedProject) return res.status(404).json({ message: "Không tìm thấy dự án để xóa!" });
    res.json({ message: "🗑️ Đã xóa dự án thành công khỏi hệ thống!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;