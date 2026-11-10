const mongoose = require('mongoose');

const AIUsageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true
  },
  // 'guest' | 'free' | 'pro' | 'staff' | 'admin'
  tier: {
    type: String,
    enum: ['guest', 'free', 'pro', 'staff', 'admin'],
    default: 'guest',
    index: true
  },
  endpoint: {
    type: String,
    required: true
  },
  // 'chat' | 'form' | 'image'
  requestType: {
    type: String,
    default: 'chat'
  },
  userMessage: {
    type: String,
    default: ''
  },
  // true nếu AI tạo ảnh (Pro feature)
  generatedImage: {
    type: Boolean,
    default: false
  },
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String,
    default: ''
  },
  ipAddress: {
    type: String,
    default: ''
  },
  // Thời điểm dùng — phục vụ rate limit theo ngày
  usedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: true });

// Truy vấn quota luôn lọc theo (userId hoặc IP) + khoảng thời gian
AIUsageSchema.index({ userId: 1, requestType: 1, usedAt: -1 });
AIUsageSchema.index({ ipAddress: 1, requestType: 1, usedAt: -1 });

module.exports = mongoose.model('AIUsage', AIUsageSchema);