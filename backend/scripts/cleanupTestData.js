// Dọn dữ liệu thử nghiệm trong database.
//
//   Xem trước (KHÔNG xoá gì):  node scripts/cleanupTestData.js --db mac_agency --users test,demo
//   Xoá thật:                  node scripts/cleanupTestData.js --db mac_agency --users test,demo --apply
//   --db <tên> BẮT BUỘC và phải đúng tên database đang kết nối, để không xoá nhầm dữ liệu dự án khác (vd Underhood).
//   Xoá luôn cả tài khoản:     thêm --delete-users
//   Chọn theo tên dự án:       --project-match "test|thử"
//
// Mặc định chỉ liệt kê. Chỉ xoá khi có cờ --apply.
// Không bao giờ đụng tới tài khoản admin/staff, và không xoá các dự án portfolio (collection Project).
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../src/models/User');
const FloorPlan = require('../src/models/FloorPlan');
const Concept = require('../src/models/Concept');
const Lead = require('../src/models/Lead');
const Render = require('../src/models/Render');
const BOQ = require('../src/models/BOQ');
const AIUsage = require('../src/models/AIUsage');
const LoginLog = require('../src/models/LoginLog');

const argv = process.argv.slice(2);
const flag = name => argv.includes(name);
const value = name => { const i = argv.indexOf(name); return i !== -1 ? argv[i + 1] : ''; };

async function run() {
  const apply = flag('--apply');
  const usernames = value('--users').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const projectMatch = value('--project-match');

  if (!process.env.MONGO_URI) { console.error('Thiếu MONGO_URI trong backend/.env'); process.exit(1); }
  if (!usernames.length && !projectMatch) {
    console.error('Cần --users a,b hoặc --project-match "regex" để biết xoá dữ liệu nào.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  // Chốt chặn: phải gõ đúng tên database đang kết nối mới được chạy
  const expectedDb = value('--db');
  const actualDb = mongoose.connection.name;
  console.log(`Đang kết nối database "${actualDb}"`);
  if (!expectedDb || expectedDb !== actualDb) {
    console.error(`Dừng lại: cần --db ${actualDb} (bạn đã gõ "${expectedDb || ''}"). Kiểm tra MONGO_URI trước khi xoá.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const users = usernames.length
    ? await User.find({ username: { $in: usernames }, role: { $in: ['customer_free', 'customer_pro'] } }).select('_id username')
    : [];
  const skipped = usernames.filter(u => !users.some(x => x.username === u));
  if (skipped.length) console.log(`Bỏ qua (không có hoặc không phải khách): ${skipped.join(', ')}`);
  const userIds = users.map(u => u._id);

  const planFilter = { $or: [] };
  if (userIds.length) planFilter.$or.push({ userId: { $in: userIds } });
  if (projectMatch) planFilter.$or.push({ projectName: new RegExp(projectMatch, 'i') });
  const plans = await FloorPlan.find(planFilter).select('_id projectName');
  const planIds = plans.map(p => p._id);

  const targets = [
    ['Mặt bằng', FloorPlan, { _id: { $in: planIds } }],
    ['Concept', Concept, { $or: [{ floorPlanId: { $in: planIds } }, { userId: { $in: userIds } }] }],
    ['Lead', Lead, { $or: [{ floorPlanId: { $in: planIds } }, { userId: { $in: userIds } }] }],
    ['Bản diễn hoạ', Render, { $or: [{ floorPlanId: { $in: planIds } }, { userId: { $in: userIds } }] }],
    ['Dự toán BOQ', BOQ, { floorPlanId: { $in: planIds } }],
    ['Lịch sử dùng AI', AIUsage, { userId: { $in: userIds } }],
    ['Nhật ký đăng nhập', LoginLog, { userId: { $in: userIds } }]
  ];

  console.log(apply ? '== XOÁ THẬT ==' : '== XEM TRƯỚC (chưa xoá gì, thêm --apply để xoá) ==');
  plans.forEach(p => console.log(`  mặt bằng: ${p.projectName}`));
  for (const [label, Model, filter] of targets) {
    const n = await Model.countDocuments(filter);
    if (apply && n) await Model.deleteMany(filter);
    console.log(`${label}: ${n}`);
  }
  if (flag('--delete-users')) {
    const n = users.length;
    if (apply && n) await User.deleteMany({ _id: { $in: userIds } });
    console.log(`Tài khoản khách: ${n}`);
  } else if (users.length) {
    if (apply) {
      await User.updateMany({ _id: { $in: userIds } }, { $set: { renderCount: 0, floorPlanCount: 0, conceptCount: 0, leadCount: 0, engagementScore: 0 } });
    }
    console.log(`Giữ lại ${users.length} tài khoản (thêm --delete-users nếu muốn xoá).`);
  }

  await mongoose.disconnect();
}

run().catch(err => { console.error('Lỗi:', err.message); process.exit(1); });
