const mongoose = require('mongoose');

const PackageSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  num: { type: String, required: true },
  name: { type: String, required: true },
  unit: { type: String, required: true },
  price: { type: Number, required: true }
}, { timestamps: true });

// ĐẢM BẢO DÒNG NÀY PHẢI ĐÚNG CHUẨN:
module.exports = mongoose.model('Package', PackageSchema);