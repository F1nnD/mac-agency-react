const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const LoginLog = require('../models/LoginLog');
const { verifyToken, effectiveRole } = require('../middleware/authMiddleware');
const { refreshEngagementSafe } = require('../services/engagementService');
const { sendPasswordResetEmail } = require('../services/mailService');
const crypto = require('crypto');

// Phiên bản điều khoản/chính sách đang áp dụng (đổi khi nội dung thay đổi)
const CONSENT_VERSION = '2026-11';
const MIN_PASSWORD = 8;
const RESET_TTL_MS = 30 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// =============================================================
// Chống dò mật khẩu: khoá tạm theo (username + IP), lưu trong bộ nhớ
// =============================================================
const LOCK_MAX_FAILS = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;
const loginFails = new Map(); // key -> { count, firstAt }

function lockKey(username, ip) {
  return `${String(username).toLowerCase()}|${ip}`;
}
function sweepLoginFails(now = Date.now()) {
  for (const [k, v] of loginFails) {
    if (now - v.firstAt > LOCK_WINDOW_MS) loginFails.delete(k);
  }
}
function isLocked(key, now = Date.now()) {
  const v = loginFails.get(key);
  if (!v) return false;
  if (now - v.firstAt > LOCK_WINDOW_MS) { loginFails.delete(key); return false; }
  return v.count >= LOCK_MAX_FAILS;
}
function recordFail(key, now = Date.now()) {
  const v = loginFails.get(key);
  if (!v || now - v.firstAt > LOCK_WINDOW_MS) loginFails.set(key, { count: 1, firstAt: now });
  else v.count += 1;
}
const sweeper = setInterval(sweepLoginFails, 5 * 60 * 1000);
if (sweeper.unref) sweeper.unref();

// Giới hạn số lần yêu cầu quên mật khẩu (theo IP + email), vẫn trả phản hồi chung
const forgotHits = new Map();
function forgotThrottled(key, now = Date.now()) {
  for (const [k, v] of forgotHits) if (now - v.firstAt > LOCK_WINDOW_MS) forgotHits.delete(k);
  const v = forgotHits.get(key);
  if (!v) { forgotHits.set(key, { count: 1, firstAt: now }); return false; }
  v.count += 1;
  return v.count > 5;
}

// =============================================================
// Token đặt lại mật khẩu: 32 byte ngẫu nhiên, chỉ lưu sha256
// =============================================================
function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}
function createResetToken(now = Date.now()) {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: hashToken(token), expires: new Date(now + RESET_TTL_MS) };
}

// =============================================================
// API ĐĂNG NHẬP
// =============================================================
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || '';
  const userAgent = req.headers['user-agent'] || '';

  try {
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.'
      });
    }

    const failKey = lockKey(username.trim(), ipAddress);
    if (isLocked(failKey)) {
      return res.status(429).json({
        success: false,
        message: 'Bạn đã thử đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.'
      });
    }

    const user = await User.findOne({ username: username.trim().toLowerCase() });

    if (!user) {
      recordFail(failKey);
      await LoginLog.create({
        userId: null,
        username: username.trim().toLowerCase(),
        success: false,
        ipAddress,
        userAgent
      }).catch(() => {});
      return res.status(400).json({
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu chưa chính xác.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      recordFail(failKey);
      await LoginLog.create({
        userId: user._id,
        username: user.username,
        role: user.role,
        success: false,
        ipAddress,
        userAgent
      }).catch(() => {});
      return res.status(400).json({
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu chưa chính xác.'
      });
    }

    loginFails.delete(failKey);
    user.loginCount = (user.loginCount || 0) + 1;
    user.lastLoginAt = new Date();
    await user.save();
    // Cập nhật điểm quan tâm cho telesale (không chờ, không làm chậm đăng nhập)
    if (user.role.startsWith('customer')) refreshEngagementSafe(user._id);

    await LoginLog.create({
      userId: user._id,
      username: user.username,
      role: user.role,
      success: true,
      ipAddress,
      userAgent
    }).catch(() => {});

    const role = effectiveRole(user);
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        username: user.username,
        role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      token,
      user: {
        userId: user._id,
        username: user.username,
        role,
        fullName: user.fullName || user.username,
        loginCount: user.loginCount,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống đăng nhập.'
    });
  }
});

// =============================================================
// API ĐĂNG KÝ KHÁCH HÀNG MỚI
// Mặc định role = customer_free
// =============================================================
router.post('/register', async (req, res) => {
  const { username, password, fullName, email, consent } = req.body;
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || '';
  const userAgent = req.headers['user-agent'] || '';

  try {
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tên đăng nhập và mật khẩu.'
      });
    }

    if (consent !== true) {
      return res.status(400).json({
        success: false,
        message: 'Bạn cần đồng ý với Chính sách quyền riêng tư và Điều khoản sử dụng để đăng ký.'
      });
    }

    if (password.length < MIN_PASSWORD) {
      return res.status(400).json({
        success: false,
        message: `Mật khẩu phải có ít nhất ${MIN_PASSWORD} ký tự.`
      });
    }

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!normalizedEmail || normalizedEmail.length > 120 || !EMAIL_RE.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email hợp lệ (dùng để khôi phục mật khẩu).'
      });
    }

    const normalizedUsername = username.trim().toLowerCase();

    if (!/^[a-z0-9._-]{3,30}$/.test(normalizedUsername)) {
      return res.status(400).json({
        success: false,
        message: 'Tên đăng nhập 3-30 ký tự, chỉ gồm chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang.'
      });
    }

    if (normalizedUsername.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Tên đăng nhập phải có ít nhất 3 ký tự.'
      });
    }

    const existing = await User.findOne({ username: normalizedUsername });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.'
      });
    }

    const emailTaken = await User.findOne({ email: normalizedEmail });
    if (emailTaken) {
      return res.status(400).json({
        success: false,
        message: 'Email này đã được dùng cho một tài khoản khác.'
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username: normalizedUsername,
      password: hashed,
      role: 'customer_free',
      fullName: String(fullName || normalizedUsername).slice(0, 100),
      email: normalizedEmail,
      consentAt: new Date(),
      consentVersion: CONSENT_VERSION,
      isActive: true,
      loginCount: 1,
      lastLoginAt: new Date()
    });

    await LoginLog.create({
      userId: newUser._id,
      username: newUser.username,
      role: newUser.role,
      success: true,
      ipAddress,
      userAgent
    }).catch(() => {});

    const token = jwt.sign(
      {
        userId: newUser._id.toString(),
        username: newUser.username,
        role: newUser.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Đăng ký thành công!',
      token,
      user: {
        userId: newUser._id,
        username: newUser.username,
        role: newUser.role,
        fullName: newUser.fullName,
        loginCount: newUser.loginCount,
        lastLoginAt: newUser.lastLoginAt
      }
    });
  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống đăng ký.'
    });
  }
});

// =============================================================
// API LẤY THÔNG TIN USER HIỆN TẠI
// =============================================================
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại.'
      });
    }
    return res.json({ success: true, user });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi truy vấn thông tin.'
    });
  }
});

// =============================================================
// API ĐĂNG XUẤT
// =============================================================
router.post('/logout', verifyToken, async (req, res) => {
  return res.json({ success: true, message: 'Đã đăng xuất.' });
});

// =============================================================
// QUÊN MẬT KHẨU — luôn trả 200 với thông báo chung
// =============================================================
const FORGOT_MESSAGE = 'Nếu email đã đăng ký tài khoản, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu. Liên kết có hiệu lực 30 phút.';

async function forgotPassword(req, res) {
  try {
    const raw = req.body && req.body.email;
    const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    const ip = req.ip || '';
    if (email && EMAIL_RE.test(email) && email.length <= 120 && !forgotThrottled(`${email}|${ip}`)) {
      const user = await User.findOne({ email, isActive: true });
      if (user) {
        const { token, hash, expires } = createResetToken();
        user.resetTokenHash = hash;
        user.resetTokenExpires = expires;
        await user.save();
        // Gửi thư nền để thời gian phản hồi không lộ email có tồn tại hay không
        sendPasswordResetEmail(user.email, token).catch(e => console.error('Lỗi gửi thư đặt lại:', e.message));
      }
    }
  } catch (error) {
    console.error('Lỗi quên mật khẩu:', error.message);
  }
  return res.json({ success: true, message: FORGOT_MESSAGE });
}
router.post('/forgot-password', forgotPassword);

// =============================================================
// ĐẶT LẠI MẬT KHẨU — token dùng một lần
// =============================================================
async function resetPassword(req, res) {
  try {
    const { token, password } = req.body || {};
    if (typeof token !== 'string' || !token || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Liên kết đặt lại mật khẩu không hợp lệ.' });
    }
    if (password.length < MIN_PASSWORD) {
      return res.status(400).json({ success: false, message: `Mật khẩu mới phải có ít nhất ${MIN_PASSWORD} ký tự.` });
    }
    // Thu hồi token ngay khi tra cứu để chỉ một yêu cầu dùng được
    const user = await User.findOneAndUpdate(
      { resetTokenHash: hashToken(token), resetTokenExpires: { $gt: new Date() } },
      { $set: { resetTokenHash: '', resetTokenExpires: null } }
    );
    if (!user) {
      return res.status(400).json({ success: false, message: 'Liên kết đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu lại.' });
    }
    const hashed = await bcrypt.hash(password, 10);
    await User.updateOne({ _id: user._id }, { $set: { password: hashed, passwordChangedAt: new Date() } });
    return res.json({ success: true, message: 'Đã đặt lại mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.' });
  } catch (error) {
    console.error('Lỗi đặt lại mật khẩu:', error.message);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống. Vui lòng thử lại.' });
  }
}
router.post('/reset-password', resetPassword);

// =============================================================
// XUẤT DỮ LIỆU CÁ NHÂN (quyền truy cập của chủ dữ liệu)
// =============================================================
async function exportMe(req, res) {
  try {
    const FloorPlan = require('../models/FloorPlan');
    const Concept = require('../models/Concept');
    const Lead = require('../models/Lead');
    const Render = require('../models/Render');
    const uid = req.user.userId;
    const profile = await User.findById(uid).select('-password -resetTokenHash -resetTokenExpires -__v').lean();
    if (!profile) return res.status(404).json({ success: false, message: 'Người dùng không tồn tại.' });
    const [floorPlans, concepts, leads, renders] = await Promise.all([
      FloorPlan.find({ userId: uid }).select('-__v').lean(),
      Concept.find({ userId: uid }).select('-__v').lean(),
      Lead.find({ userId: uid }).select('-__v -assignedTo -hotNotifiedAt -aiSummary').lean(),
      Render.find({ userId: uid }).select('-__v').lean()
    ]);
    // Bản xuất cho khách: chỉ dữ liệu công khai (không prompt, không hạng mục/đơn giá, không khoá nội bộ)
    const ai = require('../services/aiService');
    const { toPublicEstimate } = require('../services/estimateService');
    const safeRenders = (renders || []).map(r => {
      let estimate = null;
      try { estimate = toPublicEstimate(r.estimate); } catch { estimate = null; }
      return {
        _id: r._id, title: r.title, imageUrl: r.imageUrl, style: r.style, createdAt: r.createdAt,
        analysis: ai.publicAnalysis(r.analysis, false), estimate
      };
    });
    const safeLeads = (leads || []).map(l => ({
      ...l,
      salesNotes: undefined // ghi chú nội bộ của telesale không xuất cho khách
    }));
    res.setHeader('Content-Disposition', 'attachment; filename="du-lieu-cua-toi.json"');
    return res.json({
      exportedAt: new Date().toISOString(),
      profile,
      floorPlans: floorPlans || [],
      concepts: concepts || [],
      leads: safeLeads,
      renders: safeRenders
    });
  } catch (error) {
    console.error('Lỗi xuất dữ liệu:', error.message);
    return res.status(500).json({ success: false, message: 'Không xuất được dữ liệu. Vui lòng thử lại.' });
  }
}
router.get('/me/export', verifyToken, exportMe);

// =============================================================
// XOÁ TÀI KHOẢN: vô hiệu hoá + ẩn danh, xoá dữ liệu nghiệp vụ của khách
// - FloorPlan, Concept, Render, Lead: xoá hẳn
// - LoginLog, AIUsage: giữ bản ghi thống kê nhưng bỏ liên kết và dữ liệu cá nhân
//   (userId, tên đăng nhập, IP, user agent, nội dung tin nhắn)
// =============================================================
async function deleteMe(req, res) {
  try {
    const { password } = req.body || {};
    if (['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Tài khoản quản trị/nhân viên không thể tự xoá. Vui lòng liên hệ quản trị viên.' });
    }
    if (typeof password !== 'string' || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu để xác nhận xoá tài khoản.' });
    }
    const user = await User.findById(req.user.userId);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ success: false, message: 'Mật khẩu xác nhận chưa chính xác.' });
    }
    const FloorPlan = require('../models/FloorPlan');
    const Concept = require('../models/Concept');
    const Lead = require('../models/Lead');
    const Render = require('../models/Render');
    const AIUsage = require('../models/AIUsage');
    const uid = user._id;

    await Promise.all([
      FloorPlan.deleteMany({ userId: uid }),
      Concept.deleteMany({ userId: uid }),
      Render.deleteMany({ userId: uid }),
      Lead.deleteMany({ userId: uid }),
      AIUsage.updateMany({ userId: uid }, { $set: { userId: null, userMessage: '', ipAddress: '', errorMessage: '' } }),
      LoginLog.updateMany({ userId: uid }, { $set: { userId: null, username: 'da-xoa', ipAddress: '', userAgent: '' } })
    ]);

    const randomPass = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
    await User.updateOne({ _id: uid }, {
      $set: {
        username: `da-xoa-${uid.toString()}`,
        email: '',
        fullName: 'Người dùng đã xoá',
        password: randomPass,
        isActive: false,
        resetTokenHash: '',
        resetTokenExpires: null,
        passwordChangedAt: new Date(),
        renderCount: 0, floorPlanCount: 0, conceptCount: 0, leadCount: 0
      }
    });
    return res.json({ success: true, message: 'Đã xoá tài khoản và dữ liệu cá nhân của bạn.' });
  } catch (error) {
    console.error('Lỗi xoá tài khoản:', error.message);
    return res.status(500).json({ success: false, message: 'Không xoá được tài khoản. Vui lòng thử lại.' });
  }
}
router.delete('/me', verifyToken, deleteMe);

module.exports = router;
module.exports.__internals = {
  CONSENT_VERSION, hashToken, createResetToken, isLocked, recordFail, loginFails,
  LOCK_MAX_FAILS, forgotPassword, resetPassword, exportMe, deleteMe
};
