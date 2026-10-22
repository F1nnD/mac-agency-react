const mongoose = require('mongoose');

const MarketPriceSchema = new mongoose.Schema({
  // Liên kết vật tư
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    required: true,
    index: true
  },

  // Giá
  price: {
    type: Number,
    required: true,
    min: 0
  },

  // Đơn vị (thường theo material)
  unit: {
    type: String,
    required: true
  },

  // Nhà cung cấp
  supplier: {
    type: String,
    default: ''
  },

  // Khu vực
  region: {
    type: String,
    default: 'TP.HCM'
  },

  // Ngày cập nhật giá
  priceDate: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Nguồn giá
  source: {
    type: String,
    enum: ['khao-sat', 'bao-gia-ncc', 'website', 'noi-bo'],
    default: 'khao-sat'
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

// Index kép: material + ngày (để tra giá mới nhất)
MarketPriceSchema.index({ materialId: 1, priceDate: -1 });

module.exports = mongoose.model('MarketPrice', MarketPriceSchema);