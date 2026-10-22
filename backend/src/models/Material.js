const mongoose = require('mongoose');

const MaterialSchema = new mongoose.Schema({
  // Tên vật tư
  name: {
    type: String,
    required: true,
    trim: true
  },

  // Mã vật tư (duy nhất)
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },

  // Phân loại
  category: {
    type: String,
    required: true,
    enum: [
      'ket-cau',
      'hoan-thien',
      'noi-that',
      'dien',
      'nuoc',
      'den',
      'san',
      'tran',
      'tuong',
      'cua',
      'khac'
    ]
  },

  // Đơn vị tính
  unit: {
    type: String,
    required: true
  },

  // Quy cách
  specification: {
    type: String,
    default: ''
  },

  // Thương hiệu
  brand: {
    type: String,
    default: ''
  },

  // Xuất xứ
  origin: {
    type: String,
    default: ''
  },

  // Ghi chú
  notes: {
    type: String,
    default: ''
  },

  // Trạng thái
  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

module.exports = mongoose.model('Material', MaterialSchema);