const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  breadcrumb: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  location: { type: String, required: true },
  area: { type: String, required: true },
  year: { type: String, required: true },
  subtitle: String,
  quote: String,
  desc1: String,
  desc2: String,
  projectDesc: { type: String, default: '' }, // Ô mô tả chi tiết của Admin
  img1: { type: String, required: true },
  img2: String,
  img3: String,
  img4: String
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);