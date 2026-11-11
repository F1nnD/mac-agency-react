// Giá cũ + CRM nhẹ cho telesale. Mount: app.use('/api/crm', require('./routes/crmRoutes'))
const express = require('express');
const mongoose = require('mongoose');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const Lead = require('../models/Lead');
const User = require('../models/User');
const estimate = require('../services/estimateService');
const crm = require('../services/crmService');

const router = express.Router();
router.use(verifyToken, requireRole('admin', 'staff'));

const isValidId = id => mongoose.isValidObjectId(id);
const fail = (res, error, status = 400) =>
  res.status(status).json({ success: false, message: error.message || String(error) });

// Tải lead và kiểm tra quyền sửa; trả null nếu đã phản hồi lỗi
async function loadEditableLead(req, res) {
  if (!isValidId(req.params.id)) { fail(res, 'Mã lead không hợp lệ.'); return null; }
  const lead = await Lead.findById(req.params.id);
  if (!lead) { fail(res, 'Không tìm thấy lead.', 404); return null; }
  if (!crm.canEditLead(req.user, lead)) {
    fail(res, 'Lead này do đồng nghiệp khác phụ trách. Chỉ người phụ trách hoặc quản trị viên được sửa.', 403);
    return null;
  }
  return lead;
}

async function respondLead(res, id) {
  const lead = await Lead.findById(id)
    .populate('assignedTo', 'username fullName role')
    .populate('userId', 'username fullName email');
  res.json({ success: true, data: lead });
}

// ---- Vật tư giá cũ ----
router.get('/stale-prices', async (req, res) => {
  try {
    const n = Math.floor(Number(req.query.days));
    const days = Number.isFinite(n) && n > 0 ? Math.min(n, 3650) : 120;
    const items = await estimate.loadStaleMaterials({ days });
    res.json({ success: true, data: { days, count: items.length, items } });
  } catch (error) {
    fail(res, error, 500);
  }
});

// ---- Nhân viên có thể giao lead ----
router.get('/staff', async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ['admin', 'staff'] }, isActive: true })
      .select('username fullName role').sort({ fullName: 1, username: 1 }).lean();
    res.json({
      success: true,
      data: users.map(u => ({ id: String(u._id), name: u.fullName || u.username, username: u.username, role: u.role }))
    });
  } catch (error) {
    fail(res, error, 500);
  }
});

// ---- Giao lead ----
router.put('/leads/:id/assign', async (req, res) => {
  try {
    const lead = await loadEditableLead(req, res);
    if (!lead) return;
    const { userId } = req.body || {};
    if (userId === null || userId === undefined || userId === '') {
      lead.assignedTo = null;
    } else {
      if (!isValidId(userId)) return fail(res, 'Mã nhân viên không hợp lệ.');
      const target = await User.findOne({ _id: userId, role: { $in: ['admin', 'staff'] }, isActive: true }).select('_id');
      if (!target) return fail(res, 'Nhân viên không tồn tại hoặc không thể nhận lead.');
      lead.assignedTo = target._id;
    }
    await lead.save();
    await respondLead(res, lead._id);
  } catch (error) {
    fail(res, error, 500);
  }
});

// ---- Hẹn gọi lại ----
router.put('/leads/:id/follow-up', async (req, res) => {
  try {
    const lead = await loadEditableLead(req, res);
    if (!lead) return;
    const { followUpAt, note } = req.body || {};
    if (followUpAt === null || followUpAt === undefined || followUpAt === '') {
      lead.followUpAt = null;
      lead.followUpNote = '';
    } else {
      const at = new Date(followUpAt);
      if (Number.isNaN(at.getTime())) return fail(res, 'Ngày giờ gọi lại không hợp lệ.');
      lead.followUpAt = at;
      lead.followUpNote = String(note ?? '').trim().slice(0, 500);
    }
    await lead.save();
    await respondLead(res, lead._id);
  } catch (error) {
    fail(res, error, 500);
  }
});

// ---- Đã gọi: ghi nhận lần liên hệ ----
// Body: { note?, followUpAt? } — không gửi followUpAt thì lịch gọi lại đã tới hạn được xoá (coi như đã xử lý)
router.post('/leads/:id/contact', async (req, res) => {
  try {
    const lead = await loadEditableLead(req, res);
    if (!lead) return;
    const now = new Date();
    const { note, followUpAt } = req.body || {};

    lead.lastContactAt = now;
    if (lead.status === 'new') lead.status = 'contacted';
    const text = String(note ?? '').trim().slice(0, 2000);
    if (text) lead.salesNotes.push({ note: text, author: req.user.username });

    if (followUpAt) {
      const at = new Date(followUpAt);
      if (Number.isNaN(at.getTime())) return fail(res, 'Ngày giờ gọi lại không hợp lệ.');
      lead.followUpAt = at;
    } else if (lead.followUpAt && lead.followUpAt.getTime() <= now.getTime()) {
      lead.followUpAt = null;
      lead.followUpNote = '';
    }
    // Lead chưa ai nhận: người gọi nhận luôn để không bị gọi trùng
    if (!lead.assignedTo) lead.assignedTo = req.user.userId;

    await lead.save();
    await respondLead(res, lead._id);
  } catch (error) {
    fail(res, error, 500);
  }
});

// ---- Danh sách cần gọi lại ----
router.get('/follow-ups', async (req, res) => {
  try {
    const scope = req.query.scope === 'all' ? 'all' : 'mine';
    const due = ['overdue', 'today', 'week'].includes(req.query.due) ? req.query.due : undefined;
    const query = { followUpAt: { $ne: null }, status: { $nin: crm.CLOSED_STATUSES } };
    if (scope === 'mine') query.assignedTo = req.user.userId;

    const leads = await Lead.find(query)
      .populate('assignedTo', 'username fullName role')
      .sort({ followUpAt: 1 }).limit(500).lean();
    const data = crm.filterFollowUps(leads, { scope, due, userId: req.user.userId, now: new Date() });
    res.json({ success: true, data });
  } catch (error) {
    fail(res, error, 500);
  }
});

// ---- Bảng đếm ----
router.get('/board', async (req, res) => {
  try {
    const [leads, staff] = await Promise.all([
      Lead.find({}).select('status assignedTo followUpAt').lean(),
      User.find({ role: { $in: ['admin', 'staff'] }, isActive: true }).select('username fullName role').lean()
    ]);
    res.json({ success: true, data: crm.buildBoard(leads, staff, new Date()) });
  } catch (error) {
    fail(res, error, 500);
  }
});

module.exports = router;
