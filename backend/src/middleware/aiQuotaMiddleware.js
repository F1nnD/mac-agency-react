const AIUsage = require('../models/AIUsage');

// =============================================================
// CẤU HÌNH HẠN MỨC — chỉnh bằng biến môi trường, không cần sửa code
//   limit = số lần tạo ảnh (render) trong `days` ngày
// =============================================================
const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const QUOTA_CONFIG = {
  guest: {
    limit: num(process.env.AI_RENDER_LIMIT_GUEST, 0),
    days: 1,
    message: 'Vui lòng đăng nhập để dùng AI diễn hoạ không gian.'
  },
  free: {
    limit: num(process.env.AI_RENDER_LIMIT_FREE, 1),
    days: Math.max(1, num(process.env.AI_RENDER_DAYS_FREE, 3)),
    message: 'Bạn đã dùng hết lượt diễn hoạ miễn phí của chu kỳ này. Đội ngũ MAC sẽ liên hệ tư vấn chi tiết cho bạn, hoặc bạn quay lại sau nhé.'
  },
  pro: {
    limit: num(process.env.AI_RENDER_LIMIT_PRO, 3),
    days: 1,
    message: 'Tài khoản Pro đã dùng hết lượt hôm nay. Vui lòng quay lại vào ngày mai.'
  },
  staff: {
    limit: num(process.env.AI_RENDER_LIMIT_STAFF, 100),
    days: 1,
    message: 'Nhân viên đã dùng hết hạn mức tạo ảnh hôm nay.'
  },
  admin: {
    limit: Infinity,
    days: 1,
    message: 'Admin không giới hạn.'
  }
};

const CHAT_LIMITS = {
  guest: num(process.env.AI_CHAT_LIMIT_GUEST, 10),
  free: num(process.env.AI_CHAT_LIMIT_FREE, 30),
  pro: num(process.env.AI_CHAT_LIMIT_PRO, 300),
  staff: num(process.env.AI_CHAT_LIMIT_STAFF, 500),
  admin: Infinity
};

// Map role → tier (tier khớp enum của AIUsage)
function getTierFromRole(role) {
  if (!role) return 'guest';
  if (role === 'admin') return 'admin';
  if (role === 'staff') return 'staff';
  if (role === 'customer_pro') return 'pro';
  if (role === 'customer_free') return 'free';
  return 'guest';
}

// Mốc đầu ngày theo giờ Việt Nam (UTC+7), không phụ thuộc múi giờ máy chủ
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfVietnamDay(now = new Date()) {
  const local = now.getTime() + VN_OFFSET_MS;
  return new Date(Math.floor(local / DAY_MS) * DAY_MS - VN_OFFSET_MS);
}

// days = 1 → từ 0h hôm nay (giờ VN); days > 1 → cửa sổ trượt `days` ngày gần nhất
function windowStart(days, now = new Date()) {
  if (days > 1) return new Date(now.getTime() - days * DAY_MS);
  return startOfVietnamDay(now);
}

function ownerFilter(user, ip) {
  if (user?.userId) return { userId: user.userId };
  return { userId: null, ipAddress: ip || '' };
}

function bypassEnabled() {
  return process.env.AI_QUOTA_BYPASS === 'true' && process.env.NODE_ENV !== 'production';
}

// Tính hạn mức còn lại của người dùng hiện tại (dùng chung cho middleware và API hiển thị)
async function computeQuota(user, ip, now = new Date()) {
  const tier = getTierFromRole(user?.role);
  const config = QUOTA_CONFIG[tier] || QUOTA_CONFIG.guest;

  if (config.limit === Infinity) {
    return { tier, config, limit: Infinity, used: 0, remaining: Infinity, days: config.days };
  }

  const used = await AIUsage.countDocuments({
    ...ownerFilter(user, ip),
    usedAt: { $gte: windowStart(config.days, now) },
    success: true,
    requestType: 'render'
  });

  return {
    tier,
    config,
    limit: config.limit,
    used,
    remaining: Math.max(0, config.limit - used),
    days: config.days
  };
}

// Middleware: chặn khi hết lượt tạo ảnh. Lỗi DB → từ chối (không mở cửa miễn phí)
const checkAIQuota = async (req, res, next) => {
  try {
    const tier = getTierFromRole(req.user?.role);
    req.aiTier = tier;

    if (bypassEnabled()) {
      req.aiRemaining = 999;
      return next();
    }

    const q = await computeQuota(req.user, req.ip);
    if (q.remaining <= 0) {
      return res.status(429).json({
        success: false,
        message: q.config.message,
        tier,
        limit: q.limit,
        used: q.used,
        windowDays: q.days,
        requireLogin: tier === 'guest'
      });
    }

    req.aiRemaining = q.remaining;
    req.aiLimit = q.limit;
    next();
  } catch (error) {
    console.error('Lỗi check quota AI:', error);
    return res.status(503).json({
      success: false,
      message: 'Hệ thống đang bận, vui lòng thử lại sau ít phút.'
    });
  }
};

// Middleware: giới hạn số tin nhắn chat AI mỗi ngày (chống lạm dụng key miễn phí)
const checkChatQuota = async (req, res, next) => {
  try {
    const tier = getTierFromRole(req.user?.role);
    req.aiTier = tier;
    const limit = CHAT_LIMITS[tier] ?? CHAT_LIMITS.guest;

    if (limit === Infinity || bypassEnabled()) return next();

    const used = await AIUsage.countDocuments({
      ...ownerFilter(req.user, req.ip),
      usedAt: { $gte: startOfVietnamDay() },
      success: true,
      requestType: 'chat'
    });

    if (used >= limit) {
      return res.status(429).json({
        success: false,
        message: tier === 'guest'
          ? 'Bạn đã hết lượt trò chuyện thử hôm nay. Đăng nhập để tiếp tục nhé.'
          : 'Bạn đã dùng hết lượt trò chuyện với AI hôm nay. Hẹn bạn vào ngày mai.',
        tier,
        limit,
        used
      });
    }
    next();
  } catch (error) {
    console.error('Lỗi check chat quota:', error);
    return res.status(503).json({ success: false, message: 'Hệ thống đang bận, vui lòng thử lại sau.' });
  }
};

// Ghi nhận một lần dùng AI. Không nuốt lỗi âm thầm nữa: lỗi được log ra để phát hiện.
async function recordUsage(req, { endpoint, requestType = 'chat', generatedImage = false, success = true, errorMessage = '', userMessage = '' }) {
  try {
    await AIUsage.create({
      userId: req.user?.userId || undefined,
      tier: req.aiTier || getTierFromRole(req.user?.role),
      endpoint,
      requestType,
      userMessage: String(userMessage).slice(0, 500),
      generatedImage,
      success,
      errorMessage: String(errorMessage).slice(0, 300),
      ipAddress: req.ip || ''
    });
  } catch (error) {
    console.error('Không ghi được AIUsage:', error.message);
  }
}

module.exports = {
  checkAIQuota,
  checkChatQuota,
  computeQuota,
  recordUsage,
  getTierFromRole,
  startOfVietnamDay,
  windowStart,
  QUOTA_CONFIG,
  CHAT_LIMITS
};
