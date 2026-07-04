const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Chủ doanh nghiệp (Admin)', 'Nhân viên quầy / Thu ngân'], default: 'Nhân viên quầy / Thu ngân' }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);