// Quản lý người dùng — chỉ admin: cấp quyền staff, nâng Pro, khoá tài khoản
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const User = require('../models/User');

const ROLES = ['admin', 'staff', 'customer_pro', 'customer_free'];
const fail = (res, message, status = 400) => res.status(status).json({ success: false, message });

router.use(verifyToken, requireRole('admin'));

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (ROLES.includes(req.query.role)) filter.role = req.query.role;
    if (req.query.q) {
      const q = String(req.query.q).slice(0, 50).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ username: new RegExp(q, 'i') }, { fullName: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];
    }
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(300);
    res.json({ success: true, data: users });
  } catch (error) {
    fail(res, error.message, 500);
  }
});

// Tạo tài khoản nhân viên
router.post('/', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const role = req.body.role || 'staff';
    if (username.length < 3) return fail(res, 'Tên đăng nhập tối thiểu 3 ký tự.');
    if (password.length < 8) return fail(res, 'Mật khẩu tối thiểu 8 ký tự.');
    if (!ROLES.includes(role)) return fail(res, 'Quyền không hợp lệ.');
    if (await User.findOne({ username })) return fail(res, 'Tên đăng nhập đã tồn tại.');

    const user = await User.create({
      username,
      password: await bcrypt.hash(password, 10),
      role,
      fullName: String(req.body.fullName || username).slice(0, 100),
      email: String(req.body.email || '').slice(0, 120)
    });
    const { password: _omit, ...safe } = user.toObject();
    res.status(201).json({ success: true, data: safe });
  } catch (error) {
    fail(res, error.message);
  }
});

// Đổi quyền / khoá / gia hạn Pro
router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 'Mã không hợp lệ.');
    const target = await User.findById(req.params.id);
    if (!target) return fail(res, 'Không tìm thấy người dùng.', 404);

    const isSelf = target._id.toString() === req.user.userId;
    const update = {};

    if (req.body.role !== undefined) {
      if (!ROLES.includes(req.body.role)) return fail(res, 'Quyền không hợp lệ.');
      if (isSelf && req.body.role !== 'admin') return fail(res, 'Không thể tự hạ quyền của chính mình.');
      update.role = req.body.role;
      update.tier = req.body.role === 'customer_pro' ? 'pro' : 'free';
    }
    if (req.body.isActive !== undefined) {
      if (isSelf && req.body.isActive === false) return fail(res, 'Không thể tự khoá tài khoản của chính mình.');
      update.isActive = Boolean(req.body.isActive);
    }
    if (req.body.proExpiresAt !== undefined) {
      const d = req.body.proExpiresAt ? new Date(req.body.proExpiresAt) : null;
      if (d && Number.isNaN(d.getTime())) return fail(res, 'Ngày hết hạn không hợp lệ.');
      update.proExpiresAt = d;
    }
    if (req.body.password) {
      if (String(req.body.password).length < 8) return fail(res, 'Mật khẩu tối thiểu 8 ký tự.');
      update.password = await bcrypt.hash(String(req.body.password), 10);
      update.passwordChangedAt = new Date(); // đăng xuất mọi phiên cũ
      update.resetTokenHash = undefined;
    }

    const updated = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    res.json({ success: true, data: updated });
  } catch (error) {
    fail(res, error.message);
  }
});

module.exports = router;
