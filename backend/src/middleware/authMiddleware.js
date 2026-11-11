// backend/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// =============================================================
// Quyền hiệu lực: customer_pro hết hạn (proExpiresAt) → customer_free
// =============================================================
function effectiveRole(user) {
  if (user.role === 'customer_pro' && user.proExpiresAt && user.proExpiresAt < new Date()) {
    return 'customer_free';
  }
  return user.role;
}

function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
}

// Giải mã token và đọc quyền MỚI NHẤT từ DB để:
//  - tài khoản bị khoá có hiệu lực ngay (không đợi token hết hạn)
//  - đổi quyền (nâng Pro, cấp staff...) có hiệu lực ngay
// iat tính bằng giây; so với mốc đổi mật khẩu (làm tròn xuống giây)
function isStaleToken(decoded, user) {
  if (!user.passwordChangedAt) return false;
  const changedSec = Math.floor(new Date(user.passwordChangedAt).getTime() / 1000);
  return !decoded.iat || decoded.iat < changedSec;
}

async function resolveUser(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.userId).select('username role isActive proExpiresAt passwordChangedAt');
  if (!user) {
    const e = new Error('Người dùng không tồn tại');
    e.name = 'UserGone';
    throw e;
  }
  if (!user.isActive) {
    const e = new Error('Tài khoản đã bị khoá');
    e.name = 'InactiveUser';
    throw e;
  }
  // Token cấp trước lúc đổi mật khẩu thì không còn giá trị (đăng xuất mọi thiết bị)
  if (isStaleToken(decoded, user)) {
    const e = new Error('Token đã bị thu hồi do đổi mật khẩu');
    e.name = 'StaleToken';
    throw e;
  }
  return {
    userId: user._id.toString(),
    username: user.username,
    role: effectiveRole(user)
  };
}

// =============================================================
// VERIFY TOKEN — Bắt buộc đăng nhập
// =============================================================
const verifyToken = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Thiếu token xác thực. Vui lòng đăng nhập lại.'
    });
  }

  try {
    req.user = await resolveUser(token);
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token đã hết hạn. Vui lòng đăng nhập lại.' });
    }
    if (error.name === 'InactiveUser') {
      return res.status(401).json({ success: false, message: 'Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên.' });
    }
    if (error.name === 'UserGone' || error.name === 'StaleToken' || error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
      return res.status(401).json({ success: false, message: 'Token không hợp lệ.' });
    }
    console.error('Lỗi xác thực:', error.message);
    return res.status(500).json({ success: false, message: 'Lỗi xác thực hệ thống.' });
  }
};

// =============================================================
// REQUIRE ROLE — Phân quyền theo role
// Dùng: requireRole('admin', 'staff')
// =============================================================
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Chưa xác thực người dùng.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Bạn không có quyền truy cập. Yêu cầu role: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

// =============================================================
// OPTIONAL AUTH — Cho phép khách vãng lai đi qua
// Token hợp lệ → gán req.user, ngược lại req.user = null
// =============================================================
const optionalAuth = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    req.user = await resolveUser(token);
  } catch {
    req.user = null;
  }
  next();
};

// =============================================================
// REQUIRE PRO — Chỉ admin / staff / customer_pro (còn hạn)
// Dùng cho endpoint AI Pro
// =============================================================
const requirePro = (req, res, next) => {
  const allowedRoles = ['admin', 'staff', 'customer_pro'];

  if (!req.user || !req.user.role) {
    return res.status(401).json({
      success: false,
      message: 'Bạn cần đăng nhập để dùng tính năng AI Pro.'
    });
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Tính năng AI Pro chỉ dành cho nhân viên MAC. Bạn có thể dùng AI Studio và trợ lý AI thường.'
    });
  }

  next();
};

module.exports = {
  verifyToken,
  requireRole,
  optionalAuth,
  requirePro,
  effectiveRole,
  isStaleToken,
  resolveUser
};
