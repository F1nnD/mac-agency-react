const AIUsage = require('../models/AIUsage');

// Cấu hình số ngày reset quota
const QUOTA_CONFIG = {
  guest: { limit: 1, days: 3, message: 'Khách vãng lai được dùng thử 1 ảnh/3 ngày.' },
  free: { limit: 1, days: 3, message: 'Tài khoản Free được tạo 1 ảnh/3 ngày. Vui lòng nâng cấp Pro để dùng 3 ảnh/ngày.' },
  customer_pro: { limit: 3, days: 1, message: 'Tài khoản Pro được tạo 3 ảnh/ngày. Vui lòng quay lại vào ngày mai.' },
  staff: { limit: 100, days: 1, message: 'Nhân viên được tạo 100 ảnh/ngày.' },
  admin: { limit: 999999, days: 1, message: 'Admin không giới hạn.' }
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

    const config = QUOTA_CONFIG[tier] || QUOTA_CONFIG.guest;
    const limit = config.limit;

    // Nếu admin → bỏ qua check
    if (tier === 'admin') {
      req.aiRemaining = limit;
      return next();
    }

    // Tính toán thời gian bắt đầu chu kỳ quota
    const now = new Date();
    const startDate = new Date();
    
    // Nếu là Free (3 ngày) -> lùi lại 3 ngày
    // Nếu là Pro (1 ngày) -> set về 0h sáng hôm nay
    if (config.days > 1) {
      startDate.setDate(now.getDate() - config.days);
    } else {
      startDate.setHours(0, 0, 0, 0);
    }

    const filter = {
      usedAt: { $gte: startDate },
      success: true,
      tier,
      // Chỉ đếm những lần gọi endpoint tạo ảnh (pro/admin)
      endpoint: { $regex: 'pro|admin' } 
    };

    // Nếu có user → lọc theo userId
    if (req.user?.userId) {
      filter.userId = req.user.userId;
    } else {
      // Khách vãng lai → lọc theo IP
      filter.ipAddress = req.ip || '';
      filter.userId = { $exists: false };
    }

    const used = await AIUsage.countDocuments(filter);

    if (used >= limit) {
      return res.status(429).json({
        success: false,
        message: config.message,
        tier,
        limit,
        usedToday: used,
        requireUpgrade: tier === 'free' || tier === 'guest'
      });
    }

    req.aiRemaining = limit - used;
    req.aiLimit = limit;
    next();
  } catch (error) {
    console.error('Lỗi check quota AI:', error);
    req.aiTier = req.aiTier || 'guest';
    req.aiRemaining = 0;
    next();
  }
};

module.exports = { checkAIQuota, getTierFromRole, QUOTA_CONFIG };