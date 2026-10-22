const AIUsage = require('../models/AIUsage');

// Giới hạn quota theo ngày
const DAILY_QUOTA = {
  guest: 3,           // khách vãng lai: 3 lần/ngày
  free: 5,            // khách free: 5 lần/ngày
  customer_pro: 20,   // khách Pro: 20 lần/ngày
  staff: 100,         // nhân viên: 100 lần/ngày
  admin: 999999       // admin: không giới hạn
};

// Map role → tier
function getTierFromRole(role) {
  if (!role) return 'guest';
  if (role === 'admin') return 'admin';
  if (role === 'staff') return 'staff';
  if (role === 'customer_pro') return 'customer_pro';
  if (role === 'customer_free') return 'free';
  return 'guest';
}

const checkAIQuota = async (req, res, next) => {
  try {
    const tier = getTierFromRole(req.user?.role);
    req.aiTier = tier;

    const limit = DAILY_QUOTA[tier] || 3;

    // Nếu admin → bỏ qua check
    if (tier === 'admin') {
      req.aiRemaining = limit;
      return next();
    }

    // Đếm số lần dùng AI trong ngày hôm nay
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const filter = {
      usedAt: { $gte: startOfDay },
      success: true,
      tier
    };

    // Nếu có user → lọc theo userId
    if (req.user?.userId) {
      filter.userId = req.user.userId;
    } else {
      // Khách vãng lai → lọc theo IP
      filter.ipAddress = req.ip || '';
      filter.userId = { $exists: false };
    }

    const usedToday = await AIUsage.countDocuments(filter);

    if (usedToday >= limit) {
      return res.status(429).json({
        success: false,
        message: `Bạn đã dùng hết ${limit} lượt AI hôm nay. Vui lòng quay lại vào ngày mai.`,
        tier,
        limit,
        usedToday
      });
    }

    req.aiRemaining = limit - usedToday;
    req.aiLimit = limit;
    next();
  } catch (error) {
    console.error('Lỗi check quota AI:', error);
    // Không chặn nếu middleware lỗi — để endpoint tự xử lý
    req.aiTier = req.aiTier || 'guest';
    req.aiRemaining = 0;
    next();
  }
};

module.exports = { checkAIQuota, getTierFromRole, DAILY_QUOTA };