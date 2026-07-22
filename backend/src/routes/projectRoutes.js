const express = require('express');
const router = express.Router();
const Project = require('../models/Project'); 

// 🟢 API 1: LẤY TOÀN BỘ DANH SÁCH DỰ ÁN TỪ DATABASE ATLAS
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 }); // Dự án mới tạo xếp lên đầu
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🟢 API 2: LẤY CHI TIẾT MỘT DỰ ÁN QUA SLUG ĐỂ ĐỔ LÊN TRANG PROJECT-DETAIL
router.get('/by-slug', async (req, res) => {
  try {
    const slug = req.query.breadcrumb;
    const project = await Project.findOne({ breadcrumb: slug });
    if (!project) return res.status(404).json({ message: "Không tìm thấy dữ liệu không gian kiến trúc này!" });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🟢 API 3: TẠO MỚI DỰ ÁN HOÀN TOÀN (Lưu thẳng bối cảnh chuyên sâu và bộ 4 ảnh)
router.post('/', async (req, res) => {
  try {
    // Bốc trọn gói dữ liệu dynamic từ req.body gửi lên để ném thẳng xuống DB
    const newProject = new Project(req.body);
    const savedProject = await newProject.save();
    res.status(201).json({ message: "✅ Đã tạo mới dự án thành công xuống Database!", data: savedProject });
  } catch (error) {
    res.status(400).json({ message: "❌ Lỗi cấu trúc dữ liệu không hợp lệ!", error: error.message });
  }
});

// 🟢 API 4: CẬP NHẬT / SỬA ĐỔI THÔNG TIN DỰ ÁN ĐÃ CÓ SẴN TRÊN ATLAS
router.put('/:id', async (req, res) => {
  try {
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: req.body }, // Dùng toán tử $set để cập nhật linh hoạt mọi trường bối cảnh mới gửi lên
      { new: true, runValidators: true } 
    );
    
    if (!updatedProject) return res.status(404).json({ message: "Không tìm thấy dự án hợp lệ trên hệ thống!" });
    res.json({ message: "✅ Cập nhật thông tin dự án thành công!", data: updatedProject });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔴 API 5: XÓA VĨNH VIỄN DỰ ÁN KHỎI HỆ THỐNG DATABASE
router.delete('/:id', async (req, res) => {
  try {
    const deletedProject = await Project.findByIdAndDelete(req.params.id);
    if (!deletedProject) return res.status(404).json({ message: "Không tìm thấy mã dự án hợp lệ để xóa!" });
    res.json({ message: "🗑️ Đã xóa hoàn toàn dự án thành công khỏi hệ thống!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;