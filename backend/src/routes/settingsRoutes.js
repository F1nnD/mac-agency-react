const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Lấy toàn bộ settings (Public - Ai cũng đọc được để hiển thị lên web)
router.get('/', async (req, res) => {
  try {
    const settings = await Setting.find();
    const formattedData = {};
    settings.forEach(s => {
      formattedData[s.key] = s.value;
    });
    res.json({ success: true, data: formattedData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cập nhật settings (Chỉ Admin)
router.put('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const updates = req.body; // Dạng { companyName: "...", hotline: "..." }
    
    const promises = Object.keys(updates).map(key => {
      return Setting.findOneAndUpdate(
        { key },
        { value: updates[key], updatedBy: req.user.userId },
        { upsert: true, new: true }
      );
    });

    await Promise.all(promises);
    res.json({ success: true, message: 'Đã lưu cấu hình thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
