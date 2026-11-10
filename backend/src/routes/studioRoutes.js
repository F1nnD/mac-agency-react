// =============================================================
// AI STUDIO — diễn hoạ không gian từ mặt bằng + concept của khách
//   POST /api/studio/render      tạo bản diễn hoạ (mất 1 lượt render)
//   GET  /api/studio/quota       xem lượt còn lại
//   GET  /api/studio/renders     lịch sử diễn hoạ của tôi
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
    const imageUrl = ai.buildImageUrl({ prompt: analysis.imagePrompt, seed });

    // 3. Dự toán sơ bộ từ vật tư + giá thị trường trong database
    const estimate = await buildEstimateForPlan(floorPlan, concept);

    // 4. Lưu lại
    const render = await Render.create({
      userId: req.user.userId,
      floorPlanId: floorPlan._id,
      conceptId: concept._id,
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
        analysis,
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

router.get('/renders', verifyToken, async (req, res) => {
  try {
    const filter = isStaff(req.user) && req.query.all === 'true' ? {} : { userId: req.user.userId };
    const renders = await Render.find(filter)
      .select('-estimate.items -prompt')
      .populate('floorPlanId', 'projectName totalArea')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const data = renders.map(r => ({
      ...r,
      estimate: isStaff(req.user) ? r.estimate : toPublicEstimate(r.estimate)
    }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('Lỗi đọc lịch sử diễn hoạ:', error);
    fail(res, 'Không đọc được lịch sử.', 500);
  }
});

module.exports = router;
