const mongoose = require('mongoose');

// Kết nối MongoDB của MAC. Tên database nằm trong chính MONGO_URI (vd .../mac_agency?...),
// nhờ vậy MAC và các dự án khác (vd Underhood) dùng dữ liệu hoàn toàn tách biệt.
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error('Thiếu MONGO_URI trong biến môi trường.');
    const conn = await mongoose.connect(process.env.MONGO_URI);
    const dbName = conn.connection.name;
    console.log(`MongoDB đã kết nối: máy chủ ${conn.connection.host}, database "${dbName}"`);
    // Không có tên database trong chuỗi kết nối thì Mongo dùng database mặc định "test": dễ lẫn dữ liệu
    if (dbName === 'test') {
      console.warn('Cảnh báo: đang dùng database mặc định "test". Hãy thêm tên database của MAC vào MONGO_URI (vd /mac_agency).');
    }
  } catch (error) {
    console.error(`Lỗi kết nối DB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
