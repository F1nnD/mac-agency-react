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

  // Định mức: khối lượng vật tư cần cho 1 m² sàn xây dựng (cùng đơn vị `unit`).
  // = 0 nghĩa là vật tư này không tham gia dự toán sơ bộ tự động.
  normPerM2: {
    type: Number,
    default: 0,
    min: 0
  },

  // Chỉ đưa vào dự toán khi concept thuộc các style này (để trống = áp dụng mọi style)
  styleTags: [{
    type: String,
    trim: true
  }],

  // Chỉ áp dụng cho các loại công trình này (để trống = áp dụng mọi loại)
  spaceTypes: [{
    type: String,
    trim: true
  }],

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