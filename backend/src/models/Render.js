const mongoose = require('mongoose');

// Mỗi lần AI Studio diễn hoạ = 1 bản ghi: ảnh, phân tích, dự toán sơ bộ.
// Dùng để: hiển thị lại cho khách, thống kê mức độ quan tâm, cung cấp ngữ cảnh cho telesale.
const RenderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  floorPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'FloorPlan', required: true, index: true },
  conceptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Concept', default: null },

  prompt: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  seed: { type: Number, default: 0 },
  provider: { type: String, default: 'pollinations' },

  // Kết quả phân tích mặt bằng + concept (JSON do AI hoặc bộ quy tắc dự phòng tạo ra)
  analysis: { type: mongoose.Schema.Types.Mixed, default: {} },
  analysisSource: { type: String, enum: ['gemini', 'rules'], default: 'rules' },
  model: { type: String, default: '' },

  // Dự toán sơ bộ đầy đủ (chỉ staff xem chi tiết hạng mục)
  estimate: { type: mongoose.Schema.Types.Mixed, default: {} },
  boqId: { type: mongoose.Schema.Types.ObjectId, ref: 'BOQ', default: null }
}, { timestamps: true });

module.exports = mongoose.model('Render', RenderSchema);
