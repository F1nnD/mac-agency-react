// =============================================================
// AI STUDIO — diễn hoạ không gian từ mặt bằng + concept của khách
//   POST /api/studio/render      tạo bản diễn hoạ (mất 1 lượt render)
//   GET  /api/studio/quota       xem lượt còn lại
//   GET  /api/studio/renders     lịch sử diễn hoạ của tôi (phân trang)
//   GET  /api/studio/renders/:id mở lại một bản
//   DELETE /api/studio/renders/:id xoá khỏi lịch sử
// =============================================================
const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const router = express.Router();

const { verifyToken } = require('../middleware/authMiddleware');
const { checkAIQuota, computeQuota, recordUsage } = require('../middleware/aiQuotaMiddleware');

const FloorPlan = require('../models/FloorPlan');
const Concept = require('../models/Concept');
const Render = require('../models/Render');

const ai = require('../services/aiService');
const { buildEstimateForPlan, toPublicEstimate, upsertBoqDraft } = require('../services/estimateService');
const { refreshEngagementSafe } = require('../services/engagementService');
const { processLeadsInBackground } = require('../services/leadService');

const isStaff = user => ['admin', 'staff'].includes(user?.role);
const fail = (res, message, status = 400) => res.status(status).json({ success: false, message });

function shapeQuota(q) {
  return {
    tier: q.tier,
    limit: q.limit === Infinity ? null : q.limit,
    used: q.used,
    remaining: q.remaining === Infinity ? null : q.remaining,
    windowDays: q.days,
    unlimited: q.limit === Infinity
  };
}

router.get('/quota', verifyToken, async (req, res) => {
  try {
    res.json({ success: true, data: shapeQuota(await computeQuota(req.user, req.ip)) });
  } catch (error) {
    console.error('Lỗi đọc quota:', error);
    fail(res, 'Không đọc được hạn mức.', 500);
  }
});

router.post('/render', verifyToken, checkAIQuota, async (req, res) => {
  try {
    const { floorPlanId, conceptId } = req.body || {};
    if (!mongoose.isValidObjectId(floorPlanId)) return fail(res, 'Thiếu thông tin mặt bằng.');

    const floorPlan = await FloorPlan.findById(floorPlanId);
    if (!floorPlan) return fail(res, 'Không tìm thấy mặt bằng.', 404);
    if (floorPlan.userId.toString() !== req.user.userId && !isStaff(req.user)) {
      return fail(res, 'Bạn không có quyền với mặt bằng này.', 403);
    }

    const concept = mongoose.isValidObjectId(conceptId)
      ? await Concept.findOne({ _id: conceptId, floorPlanId })
      : await Concept.findOne({ floorPlanId }).sort({ createdAt: -1 });
    if (!concept) return fail(res, 'Vui lòng nhập concept trước khi diễn hoạ.');

    // 1. AI phân tích (có dự phòng, luôn trả được kết quả)
    const { analysis, source, model } = await ai.analyzeSite({ tier: req.aiTier, floorPlan, concept });

    // 2. Ảnh phối cảnh
    const seed = crypto.randomInt(1, 2_000_000_000);
    const imageUrl = ai.buildImageUrl({ prompt: analysis.imagePrompt, seed, tier: req.aiTier });

    // 3. Dự toán sơ bộ từ vật tư + giá thị trường trong database
    const estimate = await buildEstimateForPlan(floorPlan, concept);

    // 4. Lưu lại
    const render = await Render.create({
      userId: req.user.userId,
      floorPlanId: floorPlan._id,
      conceptId: concept._id,
      source: 'studio',
      tier: req.aiTier,
      title: `${concept.style} · ${floorPlan.projectName}`.slice(0, 160),
      prompt: analysis.imagePrompt,
      imageUrl,
      seed,
      analysis,
      analysisSource: source,
      model,
      estimate
    });

    const boq = await upsertBoqDraft({ floorPlan, estimate, renderId: render._id }).catch(err => {
      console.error('Không tạo được BOQ nháp:', err.message);
      return null;
    });
    if (boq) await Render.updateOne({ _id: render._id }, { $set: { boqId: boq._id } });

    // 5. Trừ lượt, cập nhật điểm quan tâm cho telesale
    await recordUsage(req, {
      endpoint: '/api/studio/render',
      requestType: 'render',
      generatedImage: true,
      userMessage: `${concept.style} - ${floorPlan.projectName}`
    });
    await refreshEngagementSafe(req.user.userId);
    processLeadsInBackground(req.user.userId);

    const quota = await computeQuota(req.user, req.ip);
    res.status(201).json({
      success: true,
      data: {
        renderId: render._id,
        imageUrl,
        analysis: ai.publicAnalysis(analysis, isStaff(req.user)),
        analysisSource: source,
        estimate: isStaff(req.user) ? estimate : toPublicEstimate(estimate),
        quota: shapeQuota(quota)
      }
    });
  } catch (error) {
    console.error('Lỗi AI Studio:', error);
    fail(res, 'Không thể diễn hoạ lúc này, vui lòng thử lại sau ít phút.', 500);
  }
});

// Hình dạng bản ghi trả về cho giao diện: khách không thấy hạng mục / đơn giá nội bộ và khoá phân tích nội bộ
function shapeRender(r, internal) {
  let estimate = null;
  try {
    estimate = internal ? r.estimate : toPublicEstimate(r.estimate);
  } catch (err) {
    estimate = null;
  }
  const out = { ...r, analysis: ai.publicAnalysis(r.analysis, internal), estimate };
  if (!internal) delete out.prompt;
  return out;
}

// Lịch sử diễn hoạ của tôi (staff thêm ?all=true để xem của mọi người). Phân trang: ?page=1&limit=20
router.get('/renders', verifyToken, async (req, res) => {
  try {
    const internal = isStaff(req.user);
    const filter = internal && req.query.all === 'true' ? {} : { userId: req.user.userId };
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);

    const [renders, total] = await Promise.all([
      Render.find(filter)
        .select('-estimate.items -prompt')
        .populate('floorPlanId', 'projectName totalArea')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Render.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: renders.map(r => shapeRender(r, internal)),
      meta: { page, limit, total, hasMore: page * limit < total }
    });
  } catch (error) {
    console.error('Lỗi đọc lịch sử diễn hoạ:', error);
    fail(res, 'Không đọc được lịch sử.', 500);
  }
});

// Mở lại một bản diễn hoạ (chủ sở hữu hoặc nhân viên MAC)
router.get('/renders/:id', verifyToken, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 'Mã không hợp lệ.');
    const internal = isStaff(req.user);
    const render = await Render.findById(req.params.id)
      .populate('floorPlanId', 'projectName totalArea width length')
      .populate('conceptId', 'style spaceType mainColors mainMaterials')
      .lean();
    if (!render) return fail(res, 'Không tìm thấy bản diễn hoạ.', 404);
    if (String(render.userId) !== String(req.user.userId) && !internal) {
      return fail(res, 'Bạn không có quyền xem bản này.', 403);
    }
    res.json({ success: true, data: shapeRender(render, internal) });
  } catch (error) {
    console.error('Lỗi đọc bản diễn hoạ:', error);
    fail(res, 'Không đọc được bản diễn hoạ.', 500);
  }
});

// Xoá khỏi lịch sử của tôi. Không hoàn lại lượt đã dùng, không xoá BOQ nháp của đội MAC.
router.delete('/renders/:id', verifyToken, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 'Mã không hợp lệ.');
    const render = await Render.findById(req.params.id).select('userId');
    if (!render) return fail(res, 'Không tìm thấy bản diễn hoạ.', 404);
    if (String(render.userId) !== String(req.user.userId) && req.user.role !== 'admin') {
      return fail(res, 'Bạn không có quyền xoá bản này.', 403);
    }
    await Render.deleteOne({ _id: render._id });
    res.json({ success: true });
  } catch (error) {
    console.error('Lỗi xoá bản diễn hoạ:', error);
    fail(res, 'Không xoá được.', 500);
  }
});

module.exports = router;
