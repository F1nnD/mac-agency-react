// backend/scripts/seedAdmin.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../src/models/User');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Da ket noi DB');

    const username = 'admin';
    const rawPassword = 'Mac@2026!Strong';
    const hashed = await bcrypt.hash(rawPassword, 10);

    const existing = await User.findOne({ username });
    if (existing) {
      existing.password = hashed;
      existing.role = 'admin';
      existing.isActive = true;
      await existing.save();
      console.log(`Da cap nhat user "${username}" -> role admin, mat khau moi.`);
    } else {
      await User.create({
        username,
        password: hashed,
        role: 'admin',
        fullName: 'Quan tri MAC',
        isActive: true
      });
      console.log(`Da tao user "${username}" voi role admin.`);
    }

    console.log(`Username: ${username}`);
    console.log(`Password: ${rawPassword}`);
    console.log('Hay doi mat khau ngay sau khi dang nhap lan dau!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Loi seed admin:', err);
    process.exit(1);
  }
}

run();