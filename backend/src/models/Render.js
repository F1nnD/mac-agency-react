const mongoose = require('mongoose');

// Mỗi lần AI Studio diễn hoạ = 1 bản ghi: ảnh, phân tích, dự toán sơ bộ.
// Dùng để: hiển thị lại cho khách, thống kê mức độ quan tâm, cung cấp ngữ cảnh cho telesale.
const RenderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // Bản diễn hoạ nhanh từ trang chủ không có mặt bằng đi kèm nên floorPlanId có thể rỗng
  floorPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'FloorPlan', default: null, index: true },
  conceptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Concept', default: null },

  // Nguồn tạo: 'studio' (AI Studio, đủ mặt bằng + concept) hoặc 'quick' (form nhanh ở trang chủ)
  source: { type: String, enum: ['studio', 'quick'], default: 'studio' },
  // Tầng AI lúc tạo (quyết định độ sâu phân tích và kích thước ảnh)
  tier: { type: String, default: 'free' },
  title: { type: String, default: '' },

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
