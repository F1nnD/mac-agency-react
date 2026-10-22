const mongoose = require('mongoose');

const FloorPlanSchema = new mongoose.Schema({
  // Người tạo
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Thông tin dự án
  projectName: {
    type: String,
    required: true,
    trim: true
  },

  // Kích thước (Ngang x Rộng)
  width: {
    type: Number,
    required: true,
    min: 1
  },
  length: {
    type: Number,
    required: true,
    min: 1
  },
  totalArea: {
    type: Number,
    required: true
  },

  // Địa chỉ
  address: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    default: ''
  },
  district: {
    type: String,
    default: ''
  },

  // Loại mặt bằng
  siteStatus: {
    type: String,
    enum: ['dat-trong', 'co-nha-tren-dat'],
    required: true
  },

  // Hình ảnh (base64 hoặc URL)
  images: [{
    type: String
  }],

  // Trạng thái
  status: {
    type: String,
    enum: ['draft', 'submitted', 'processing', 'completed'],
    default: 'draft'
  },

  // Ghi chú
  notes: {
    type: String,
    default: ''
  }

}, { timestamps: true });

module.exports = mongoose.model('FloorPlan', FloorPlanSchema);