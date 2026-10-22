const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const LoginLog = require('../models/LoginLog');
const { verifyToken } = require('../middleware/authMiddleware');

// =============================================================
// API ĐĂNG NHẬP
// =============================================================
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || '';
  const userAgent = req.headers['user-agent'] || '';

  try {
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.'
      });
    }

    const user = await User.findOne({ username: username.trim().toLowerCase() });

    if (!user) {
      await LoginLog.create({
        userId: null,
        username: username.trim().toLowerCase(),
        success: false,
        ipAddress,
        userAgent
      }).catch(() => {});
      return res.status(400).json({
        success: false,
        message: 'Tài khoản không tồn tại trên hệ thống!'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await LoginLog.create({
        userId: user._id,
        username: user.username,
        role: user.role,
        success: false,
        ipAddress,
        userAgent
      }).catch(() => {});
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu quản trị chưa chính xác!'
      });
    }

    user.loginCount = (user.loginCount || 0) + 1;
    user.lastLoginAt = new Date();
    await user.save();

    await LoginLog.create({
      userId: user._id,
      username: user.username,
      role: user.role,
      success: true,
      ipAddress,
      userAgent
    }).catch(() => {});

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      token,
      user: {
        userId: user._id,
        username: user.username,
        role: user.role,
        fullName: user.fullName || user.username,
        loginCount: user.loginCount,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống đăng nhập.',
      error: error.message
    });
  }
});

// =============================================================
// API ĐĂNG KÝ KHÁCH HÀNG MỚI
// Mặc định role = customer_free
// =============================================================
router.post('/register', async (req, res) => {
  const { username, password, fullName, email } = req.body;
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || '';
  const userAgent = req.headers['user-agent'] || '';

  try {
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tên đăng nhập và mật khẩu.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có ít nhất 6 ký tự.'
      });
    }

    const normalizedUsername = username.trim().toLowerCase();

    if (normalizedUsername.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Tên đăng nhập phải có ít nhất 3 ký tự.'
      });
    }

    const existing = await User.findOne({ username: normalizedUsername });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.'
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username: normalizedUsername,
      password: hashed,
      role: 'customer_free',
      fullName: fullName || normalizedUsername,
      email: email || '',
      isActive: true,
      loginCount: 1,
      lastLoginAt: new Date()
    });

    await LoginLog.create({
      userId: newUser._id,
      username: newUser.username,
      role: newUser.role,
      success: true,
      ipAddress,
      userAgent
    }).catch(() => {});

    const token = jwt.sign(
      {
        userId: newUser._id.toString(),
        username: newUser.username,
        role: newUser.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Đăng ký thành công!',
      token,
      user: {
        userId: newUser._id,
        username: newUser.username,
        role: newUser.role,
        fullName: newUser.fullName,
        loginCount: newUser.loginCount,
        lastLoginAt: newUser.lastLoginAt
      }
    });
  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống đăng ký.',
      error: error.message
    });
  }
});

// =============================================================
// API LẤY THÔNG TIN USER HIỆN TẠI
// =============================================================
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại.'
      });
    }
    return res.json({ success: true, user });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi truy vấn thông tin.',
      error: error.message
    });
  }
});

// =============================================================
// API ĐĂNG XUẤT
// =============================================================
router.post('/logout', verifyToken, async (req, res) => {
  return res.json({ success: true, message: 'Đã đăng xuất.' });
});

module.exports = router;