const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Lead = require('../models/Lead');
const FloorPlan = require('../models/FloorPlan');
const Concept = require('../models/Concept');
const Render = require('../models/Render');
const LoginLog = require('../models/LoginLog');
const { scoreOf } = require('../services/engagementService');

const staffOnly = [verifyToken, requireRole('admin', 'staff')];
const fail = (res, error) => res.status(500).json({ success: false, message: error.message });
const TZ = 'Asia/Ho_Chi_Minh';

// Thống kê tổng quan
router.get('/overview', ...staffOnly, async (req, res) => {
  try {
    const [totalUsers, totalLeads, totalFloorPlans, totalConcepts, totalRenders] = await Promise.all([
      User.countDocuments(),
      Lead.countDocuments(),
      FloorPlan.countDocuments(),
      Concept.countDocuments(),
      Render.countDocuments()
    ]);

    const [usersByRole, leadsByStatus] = await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Lead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
    ]);

    res.json({
      success: true,
      data: { totalUsers, totalLeads, totalFloorPlans, totalConcepts, totalRenders, usersByRole, leadsByStatus }
    });
  } catch (error) {
    fail(res, error);
  }
});

// Top khách quan tâm nhất — đếm bằng aggregate (không còn N+1 truy vấn)
router.get('/top-users', ...staffOnly, async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ['customer_free', 'customer_pro'] } })
      .select('username fullName email loginCount lastLoginAt tier role')
      .sort({ loginCount: -1 })
      .limit(200)
      .lean();
    const ids = users.map(u => u._id);

    const countBy = Model =>
      Model.aggregate([{ $match: { userId: { $in: ids } } }, { $group: { _id: '$userId', n: { $sum: 1 } } }])
        .then(rows => new Map(rows.map(r => [String(r._id), r.n])));

    const [fp, cc, ld, rd] = await Promise.all([
      countBy(FloorPlan), countBy(Concept), countBy(Lead), countBy(Render)
    ]);

    const ranked = users.map(u => {
      const key = String(u._id);
      const counts = {
        loginCount: u.loginCount || 0,
        renderCount: rd.get(key) || 0,
        floorPlanCount: fp.get(key) || 0,
        conceptCount: cc.get(key) || 0,
        leadCount: ld.get(key) || 0
      };
      return { ...u, ...counts, engagementScore: scoreOf(counts) };
    });

    ranked.sort((a, b) => b.engagementScore - a.engagementScore);
    res.json({ success: true, data: ranked.slice(0, 20) });
  } catch (error) {
    fail(res, error);
  }
});

// Đăng nhập 7 ngày: đếm từng lượt đăng nhập thật (LoginLog), theo giờ Việt Nam
router.get('/activity-7days', ...staffOnly, async (req, res) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const rows = await LoginLog.aggregate([
      { $match: { loginAt: { $gte: since }, success: true } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$loginAt', timezone: TZ } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    // Giữ cả hai khoá: giao diện cũ đọc `id`
    res.json({ success: true, data: { loginsByDay: rows.map(r => ({ id: r._id, _id: r._id, count: r.count })) } });
  } catch (error) {
    fail(res, error);
  }
});

// Phễu chuyển đổi: khách rơi ở bước nào + style nào được quan tâm nhiều nhất
router.get('/funnel', ...staffOnly, async (req, res) => {
  try {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const inRange = { createdAt: { $gte: since } };

    const customerRoles = { $in: ['customer_free', 'customer_pro'] };
    const [registered, withFloorPlan, withConcept, withRender, withLead, converted, styles, spaceTypes] = await Promise.all([
      User.countDocuments({ role: customerRoles, ...inRange }),
      FloorPlan.distinct('userId', inRange).then(a => a.length),
      Concept.distinct('userId', inRange).then(a => a.length),
      Render.distinct('userId', inRange).then(a => a.length),
      Lead.distinct('userId', inRange).then(a => a.length),
      Lead.countDocuments({ status: 'converted', ...inRange }),
      Concept.aggregate([
        { $match: inRange },
        { $group: { _id: '$style', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Concept.aggregate([
        { $match: { ...inRange, spaceType: { $ne: '' } } },
        { $group: { _id: '$spaceType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    const steps = [
      { key: 'registered', label: 'Đăng ký', count: registered },
      { key: 'floorPlan', label: 'Nhập mặt bằng', count: withFloorPlan },
      { key: 'concept', label: 'Chọn concept', count: withConcept },
      { key: 'render', label: 'Xem diễn hoạ', count: withRender },
      { key: 'lead', label: 'Để lại số điện thoại', count: withLead },
      { key: 'converted', label: 'Đã chốt', count: converted }
    ];
    const top = steps[0].count || Math.max(...steps.map(s => s.count), 1);
    steps.forEach((s, i) => {
      s.pctOfFirst = top ? Math.round((s.count / top) * 100) : 0;
      s.pctOfPrev = i === 0 ? 100 : steps[i - 1].count ? Math.round((s.count / steps[i - 1].count) * 100) : 0;
    });

    res.json({ success: true, data: { days, steps, styles, spaceTypes } });
  } catch (error) {
    fail(res, error);
  }
});

module.exports = router;
