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
  }

}, { timestamps: true });

module.exports = mongoose.model('Lead', LeadSchema);
