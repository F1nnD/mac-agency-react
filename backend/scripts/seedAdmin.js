// backend/scripts/seedAdmin.js
// Dùng:  ADMIN_USERNAME=admin ADMIN_PASSWORD='mat-khau-manh-cua-ban' node scripts/seedAdmin.js
// Mật khẩu KHÔNG còn nằm cứng trong mã nguồn.
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../src/models/User');

async function run() {
  const username = String(process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const rawPassword = process.env.ADMIN_PASSWORD;

  if (!process.env.MONGO_URI) {
    console.error('Thiếu MONGO_URI trong backend/.env');
    process.exit(1);
  }
  if (!rawPassword || rawPassword.length < 10) {
    console.error('Cần đặt ADMIN_PASSWORD (tối thiểu 10 ký tự) khi chạy script.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Da ket noi DB');
    const hashed = await bcrypt.hash(rawPassword, 10);

    const existing = await User.findOne({ username });
    if (existing) {
      existing.password = hashed;
      existing.role = 'admin';
      existing.isActive = true;
      await existing.save();
      console.log(`Da cap nhat user "${username}" -> role admin, mat khau moi.`);
    } else {
      await User.create({ username, password: hashed, role: 'admin', fullName: 'Quan tri MAC', isActive: true });
      console.log(`Da tao user "${username}" voi role admin.`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Loi seed admin:', err.message);
    process.exit(1);
  }
}

run();
