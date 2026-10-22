const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// ===== CÔNG KHAI: Ai cũng xem được =====

// GET /api/projects — Lấy toàn bộ danh sách dự án
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/by-slug?breadcrumb=... — Chi tiết dự án theo slug
router.get('/by-slug', async (req, res) => {
  try {
    const slug = req.query.breadcrumb;
    const project = await Project.findOne({ breadcrumb: slug });
    if (!project) return res.status(404).json({ message: 'Không tìm thấy dự án!' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== BẢO VỆ: Chỉ admin/staff mới được ghi =====

// POST /api/projects — Tạo dự án mới
router.post(
  '/',
  verifyToken,
  requireRole('admin', 'staff'),
  async (req, res) => {
    try {
      const newProject = new Project(req.body);
      const savedProject = await newProject.save();
      res.status(201).json({
        success: true,
        message: 'Đã tạo mới dự án thành công!',
        data: savedProject
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Lỗi cấu trúc dữ liệu không hợp lệ!',
        error: error.message
      });
    }
  }
);

// PUT /api/projects/:id — Cập nhật dự án
router.put(
  '/:id',
  verifyToken,
  requireRole('admin', 'staff'),
  async (req, res) => {
    try {
      const updatedProject = await Project.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
      );
      if (!updatedProject) {
        return res.status(404).json({ message: 'Không tìm thấy dự án!' });
      }
      res.json({
        success: true,
        message: 'Cập nhật dự án thành công!',
        data: updatedProject
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// DELETE /api/projects/:id — Xoá dự án (chỉ admin)
router.delete(
  '/:id',
  verifyToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const deletedProject = await Project.findByIdAndDelete(req.params.id);
      if (!deletedProject) {
        return res.status(404).json({ message: 'Không tìm thấy dự án!' });
      }
      res.json({
        success: true,
        message: 'Đã xoá dự án thành công!'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

module.exports = router;