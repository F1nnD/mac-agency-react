const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
  // Người dùng
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Liên kết dự án
  floorPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FloorPlan',
    default: null
  },

  // Thông tin liên hệ
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  email: {
    type: String,
    default: '',
    trim: true
  },

  // Nhu cầu
  interestedService: {
    type: String,
    enum: ['thiet-ke', 'thi-cong', 'tron-goi', 'noi-that', 'khac'],
    default: 'tron-goi'
  },
  message: {
    type: String,
    default: ''
  },

  // Mức độ quan tâm (tự động tính)
  engagement: {
    loginCount: { type: Number, default: 0 },
    renderCount: { type: Number, default: 0 },
    lastActiveAt: { type: Date, default: Date.now },
    score: { type: Number, default: 0 } // 0-100
  },

  // Trạng thái chăm sóc
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'converted', 'lost'],
    default: 'new',
    index: true
  },

  // Ghi chú của telesale
  salesNotes: [{
    note: String,
    author: String,
    createdAt: { type: Date, default: Date.now }
  }],

  // Người phụ trách
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Lịch gọi lại và lần liên hệ gần nhất (telesale)
  followUpAt: { type: Date, default: null, index: true },
  followUpNote: { type: String, default: '', trim: true, maxlength: 500 },
  lastContactAt: { type: Date, default: null },

  // Tóm tắt AI cho telesale (tự tạo khi khách để lại thông tin, làm mới sau mỗi lần render)
  aiSummary: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },

  // Đã báo "lead nóng" tới kênh nội bộ chưa (tránh báo lặp)
  hotNotifiedAt: {
    type: Date,
    default: null
  }

}, { timestamps: true });

module.exports = mongoose.model('Lead', LeadSchema);
