const mongoose = require('mongoose');

const BOQItemSchema = new mongoose.Schema({
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    required: true
  },
  materialName: { type: String, required: true },
  unit: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  notes: { type: String, default: '' }
});

const BOQSchema = new mongoose.Schema({
  // Liên kết dự án
  floorPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FloorPlan',
    required: true,
    index: true
  },

  // Người tạo
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Tên dự toán
  title: {
    type: String,
    required: true
  },

  // Danh sách vật tư
  items: [BOQItemSchema],

  // Tỷ lệ % dự phòng và VAT (lưu để chỉnh sửa lại mà không mất cấu hình)
  contingencyPct: { type: Number, default: 5, min: 0 },
  vatPct: { type: Number, default: 0, min: 0 },

  // Tổng hợp (số tiền)
  subtotal: { type: Number, default: 0 },
  contingency: { type: Number, default: 0 },
  vat: { type: Number, default: 0 },
  total: { type: Number, default: 0 },

  // Khoảng giá AI ước lượng ban đầu (thấp - cao) và độ tin cậy
  rangeLow: { type: Number, default: 0 },
  rangeHigh: { type: Number, default: 0 },
  confidence: { type: String, enum: ['cao', 'trung-binh', 'thap', ''], default: '' },
  assumptions: [{ type: String }],

  // Bản diễn hoạ sinh ra dự toán này
  renderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Render', default: null },

  // Nguồn tạo
  source: {
    type: String,
    enum: ['ai-generated', 'manual', 'staff-edited'],
    default: 'ai-generated'
  },

  // Trạng thái
  status: {
    type: String,
    enum: ['draft', 'reviewing', 'approved', 'rejected'],
    default: 'draft'
  },

  // Người duyệt
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }

}, { timestamps: true });

module.exports = mongoose.model('BOQ', BOQSchema);
