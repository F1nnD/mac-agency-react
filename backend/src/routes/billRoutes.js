const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');

// API lưu hóa đơn hạch toán mới
router.post('/create', async (req, res) => {
  try {
    const newBill = new Bill(req.body);
    const savedBill = await newBill.save();
    res.status(201).json({ message: "Đã lưu trữ hóa đơn an toàn!", savedBill });
  } catch (error) {
    res.status(500).json({ message: "Lỗi ghi nhận hóa đơn", error: error.message });
  }
});

// API trích xuất chi tiết hóa đơn qua mã QR
router.get('/:billId', async (req, res) => {
  try {
    const bill = await Bill.findOne({ billId: req.params.billId });
    if (!bill) {
      return res.status(404).json({ message: "Không tìm thấy mã hóa đơn!" });
    }
    res.json(bill);
  } catch (error) {
    res.status(500).json({ message: "Lỗi truy vấn hóa đơn", error: error.message });
  }
});

module.exports = router;