const mongoose = require('mongoose');

const ConceptSchema = new mongoose.Schema({
  // Liên kết với FloorPlan
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

  // Style concept
  style: {
    type: String,
    required: true,
    enum: [
      'Industrial',
      'Minimalism',
      'Vintage',
      'Retro',
      'Japandi',
      'Modern Classic',
      'Tropical Eco',
      'Scandinavian',
      'Bohemian',
      'Other'
    ]
  },

  // Màu sắc chủ đạo
  mainColors: [{
    type: String
  }],

  // Chất liệu chủ đạo
  mainMaterials: [{
    type: String
  }],

  // Mô tả sơ bộ ý tưởng
  description: {
    type: String,
    default: ''
  },

  // Loại công trình mong muốn
  spaceType: {
    type: String,
    default: ''
  },

  // Ngân sách dự kiến (VNĐ)
  estimatedBudget: {
    type: Number,
    default: 0
  },

  // Trạng thái
  status: {
    type: String,
    enum: ['draft', 'submitted', 'processing', 'completed'],
    default: 'draft'
  }

}, { timestamps: true });

module.exports = mongoose.model('Concept', ConceptSchema);