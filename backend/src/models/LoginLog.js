const mongoose = require('mongoose');

const LoginLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
  username: { type: String, required: true },
  role: { type: String, default: '' },
  loginAt: { type: Date, default: Date.now, index: true },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  success: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('LoginLog', LoginLogSchema);