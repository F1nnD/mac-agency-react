// backend/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

// =============================================================
// VERIFY TOKEN — Bắt buộc đăng nhập
// =============================================================
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Thiếu token xác thực. Vui lòng đăng nhập lại.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token đã hết hạn. Vui lòng đăng nhập lại.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ.'
    });
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
// Nếu có token hợp lệ → gán req.user
// Nếu không có token → req.user = null, vẫn cho đi tiếp
// =============================================================
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role
    };
    next();
  } catch (error) {
    // Token sai/hết hạn → coi như khách vãng lai, không chặn
    req.user = null;
    next();
  }
};

// =============================================================
// REQUIRE PRO — Chỉ cho phép role Pro trở lên
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
      message: 'Tính năng AI Pro chỉ dành cho khách hàng Pro. Vui lòng nâng cấp gói.'
    });
  }

  next();
};

// =============================================================
// EXPORTS — 4 middleware
// =============================================================
module.exports = {
  verifyToken,
  requireRole,
  optionalAuth,
  requirePro
};