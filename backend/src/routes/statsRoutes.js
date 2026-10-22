const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Lead = require('../models/Lead');
const FloorPlan = require('../models/FloorPlan');
const Concept = require('../models/Concept');
const AIUsage = require('../models/AIUsage');

// Thống kê tổng quan
router.get('/overview', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const [totalUsers, totalLeads, totalFloorPlans, totalConcepts] = await Promise.all([
      User.countDocuments(),
      Lead.countDocuments(),
      FloorPlan.countDocuments(),
      Concept.countDocuments()
    ]);

    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const leadsByStatus = await Lead.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalLeads,
        totalFloorPlans,
        totalConcepts,
        usersByRole,
        leadsByStatus
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Top user quan tâm nhất
router.get('/top-users', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ['customer_free', 'customer_pro'] } })
      .select('username fullName email loginCount renderCount lastLoginAt tier role')
      .sort({ loginCount: -1, renderCount: -1 })
      .limit(20);

    // Tính điểm quan tâm cho từng user
    const usersWithScore = await Promise.all(users.map(async (u) => {
      const [fpCount, cCount, lCount] = await Promise.all([
        FloorPlan.countDocuments({ userId: u._id }),
        Concept.countDocuments({ userId: u._id }),
        Lead.countDocuments({ userId: u._id })
      ]);

      const score = Math.min(100,
        (u.loginCount || 0) * 5 +
        (u.renderCount || 0) * 15 +
        fpCount * 20 +
        cCount * 20 +
        lCount * 40
      );

      return {
        ...u.toObject(),
        engagementScore: score,
        floorPlanCount: fpCount,
        conceptCount: cCount,
        leadCount: lCount
      };
    }));

    usersWithScore.sort((a, b) => b.engagementScore - a.engagementScore);

    res.json({ success: true, data: usersWithScore });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Hoạt động 7 ngày qua
router.get('/activity-7days', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const loginsByDay = await User.aggregate([
      { $match: { lastLoginAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$lastLoginAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ success: true, data: { loginsByDay } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;