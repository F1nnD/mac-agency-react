const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  breadcrumb: { type: String, required: true, unique: true }, // Dùng làm slug định danh trên URL
  type: { type: String, required: true },
  location: { type: String, required: true },
  area: { type: String, required: true },
  year: { type: String, required: true },
  
  // Bổ sung đầy đủ các trường bối cảnh chuyên sâu
  subtitle: { type: String, default: '' },
  quote: { type: String, default: '' },
  desc1: { type: String, default: '' },
  desc2: { type: String, default: '' },
  projectDesc: { type: String, default: '' }, 

  // Mở rộng đủ bộ khung cấu trúc bố cục 4 ảnh cinematic
  img1: { type: String, required: true }, // Ảnh Banner lớn (16/9)
  img2: { type: String, default: '' },   // Ảnh lưới trái (Square)
  img3: { type: String, default: '' },   // Ảnh lưới phải (Square)
  img4: { type: String, default: '' }    // Ảnh chốt hạ dưới cùng (16/9)
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);