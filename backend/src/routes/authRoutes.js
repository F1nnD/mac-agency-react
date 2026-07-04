const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// API Đăng nhập hệ thống quản trị
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({ message: "Tài khoản không tồn tại trên hệ thống!" });
    }

    // So sánh mật khẩu nhập vào với mật khẩu đã mã hóa trong DB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu quản trị chưa chính xác!" });
    }

    res.json({
      message: "Đăng nhập thành công!",
      user: { username: user.username, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống đăng nhập", error: error.message });
  }
});

module.exports = router;