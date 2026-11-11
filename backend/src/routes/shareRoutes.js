// =============================================================
// Liên kết chia sẻ công khai (chỉ đọc, không cần đăng nhập) — lead mount ở /api/share
//   GET /api/share/:token
// Chỉ trả dữ liệu đã làm sạch: không userId, không thông tin khách, không địa chỉ,
// không prompt, không hạng mục / đơn giá. Token sai hoặc đã thu hồi → 404 chung.
// =============================================================
const express = require('express');
const router = express.Router();

const Render = require('../models/Render');
const ai = require('../services/aiService');
const { toPublicEstimate } = require('../services/estimateService');

const NOT_FOUND = { success: false, message: 'Liên kết không tồn tại hoặc đã bị thu hồi.' };

// Các khoá có thể lặp lại địa chỉ / ghi chú riêng của khách nên không công khai
const PRIVATE_ANALYSIS_KEYS = ['imagePrompt', 'siteObservations', 'risks'];

function shapeShared(render) {
  const analysis = ai.publicAnalysis(render.analysis, false);
  for (const key of PRIVATE_ANALYSIS_KEYS) delete analysis[key];

  let estimate = null;
  try { estimate = toPublicEstimate(render.estimate); } catch { estimate = null; }

  const concept = render.conceptId && typeof render.conceptId === 'object' ? render.conceptId : {};
  const plan = render.floorPlanId && typeof render.floorPlanId === 'object' ? render.floorPlanId : {};
  return {
    // Không dùng tên dự án do khách nhập (có thể chứa tên người/địa chỉ)
    title: [concept.style, (plan.totalArea || render.estimate?.area) ? `${plan.totalArea || render.estimate?.area} m²` : ''].filter(Boolean).join(' · ') || 'Phối cảnh MAC Concept',
    imageUrl: render.imageUrl || '',
    summary: analysis.summary || '',
    analysis,
    estimate,
    style: concept.style || '',
    area: plan.totalArea || render.estimate?.area || 0,
    createdAt: render.createdAt
  };
}

router.get('/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '');
    if (!/^[a-f0-9]{32}$/.test(token)) return res.status(404).json(NOT_FOUND);

    const render = await Render.findOne({ shareToken: token })
      .populate('conceptId', 'style')
      .populate('floorPlanId', 'totalArea')
      .lean();
    if (!render) return res.status(404).json(NOT_FOUND);

    res.set('X-Robots-Tag', 'noindex, nofollow');
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, data: shapeShared(render) });
  } catch (error) {
    console.error('Lỗi đọc liên kết chia sẻ:', error.message);
    res.status(404).json(NOT_FOUND);
  }
});

router.shapeShared = shapeShared;
module.exports = router;
