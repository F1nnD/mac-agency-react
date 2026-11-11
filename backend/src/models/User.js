const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['admin', 'staff', 'customer_pro', 'customer_free'],
    default: 'customer_free'
  },
  loginCount: {
    type: Number,
    default: 0
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  renderCount: {
    type: Number,
    default: 0
  },
  floorPlanCount: {
    type: Number,
    default: 0
  },
  conceptCount: {
    type: Number,
    default: 0
  },
  leadCount: {
    type: Number,
    default: 0
  },
  engagementScore: {
    type: Number,
    default: 0
  },
  tier: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free'
  },
  proExpiresAt: {
    type: Date,
    default: null
  },
  // Đồng ý thu thập và xử lý dữ liệu (ghi nhận lúc đăng ký)
  consentAt: {
    type: Date,
    default: null
  },
  consentVersion: {
    type: String,
    default: ''
  },
  // Đặt lại mật khẩu: chỉ lưu băm sha256 của token, không lưu token gốc
  resetTokenHash: {
    type: String,
    default: '',
    select: false
  },
  resetTokenExpires: {
    type: Date,
    default: null,
    select: false
  },
  // Mốc đổi mật khẩu: token đăng nhập cấp trước mốc này bị từ chối
  passwordChangedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);