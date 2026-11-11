const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

const FloorPlan = require('../models/FloorPlan');
const Concept = require('../models/Concept');
const Lead = require('../models/Lead');
const Material = require('../models/Material');
const MarketPrice = require('../models/MarketPrice');
const BOQ = require('../models/BOQ');

const storage = require('../services/storageService');
const { calcTotals } = require('../services/estimateService');
const { refreshEngagementSafe } = require('../services/engagementService');
const { summarizeLead, processLeadsInBackground } = require('../services/leadService');
const { canEditLead } = require('../services/crmService');

const isStaff = user => ['admin', 'staff'].includes(user?.role);
const isValidId = id => mongoose.isValidObjectId(id);
const pick = (obj, keys) =>
  keys.reduce((acc, k) => (obj && obj[k] !== undefined ? { ...acc, [k]: obj[k] } : acc), {});
const fail = (res, error, status = 400) => res.status(status).json({ success: false, message: error.message || error });

// Ảnh mặt bằng lưu dạng data URL: giới hạn số lượng và dung lượng để database không phình
const MAX_IMAGES = 5;
const MAX_IMAGE_CHARS = 3 * 1024 * 1024;
function cleanImages(images) {
  if (!Array.isArray(images)) return [];
  return images
    .filter(src => typeof src === 'string' && src.length <= MAX_IMAGE_CHARS &&
      (/^data:image\/(png|jpe?g|webp);base64,/.test(src) || storage.isAllowedRemoteUrl(src)))
    .slice(0, MAX_IMAGES);
}

// Nếu kho ảnh đã cấu hình: tải từng ảnh base64 lên và lưu URL (giữ database nhỏ); lỗi thì giữ base64 như cũ
async function storeImages(images) {
  if (!storage.isConfigured()) return images;
  return Promise.all(images.map(async src => {
    if (!src.startsWith('data:')) return src;
    const up = await storage.uploadImage(src, { folder: 'floorplans' });
    return up ? up.url : src;
  }));
}

// ============================================================
// FLOOR PLANS
// ============================================================
router.post('/floor-plans', verifyToken, async (req, res) => {
  try {
    const body = pick(req.body, ['projectName', 'address', 'city', 'district', 'siteStatus', 'notes']);
    const width = Number(req.body.width);
    const length = Number(req.body.length);
    if (!(width > 0) || !(length > 0) || width > 500 || length > 500) {
      return fail(res, 'Kích thước ngang/dài không hợp lệ.');
    }

    const floorPlan = await FloorPlan.create({
      ...body,
      userId: req.user.userId,
      width,
      length,
      totalArea: Math.round(width * length * 100) / 100,
      images: await storeImages(cleanImages(req.body.images))
    });
    refreshEngagementSafe(req.user.userId);

    res.status(201).json({ success: true, data: floorPlan });
  } catch (error) {
    fail(res, error);
  }
});

router.get('/floor-plans', verifyToken, async (req, res) => {
  try {
    const filter = isStaff(req.user) ? {} : { userId: req.user.userId };
    // Danh sách không cần kèm ảnh nặng
    const floorPlans = await FloorPlan.find(filter).select('-images').sort({ createdAt: -1 }).limit(500);
    res.json({ success: true, data: floorPlans });
  } catch (error) {
    fail(res, error, 500);
  }
});

// Chi tiết mặt bằng: chỉ chủ sở hữu hoặc nhân viên (trước đây ai biết ID cũng xem được)
router.get('/floor-plans/:id', verifyToken, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return fail(res, 'Mã không hợp lệ.');
    const floorPlan = await FloorPlan.findById(req.params.id);
    if (!floorPlan) return fail(res, 'Không tìm thấy', 404);
    if (floorPlan.userId.toString() !== req.user.userId && !isStaff(req.user)) {
      return fail(res, 'Không có quyền', 403);
    }
    res.json({ success: true, data: floorPlan });
  } catch (error) {
    fail(res, error, 500);
  }
});

router.put('/floor-plans/:id', verifyToken, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return fail(res, 'Mã không hợp lệ.');
    const floorPlan = await FloorPlan.findById(req.params.id);
    if (!floorPlan) return fail(res, 'Không tìm thấy', 404);
    if (floorPlan.userId.toString() !== req.user.userId && !isStaff(req.user)) {
      return fail(res, 'Không có quyền', 403);
    }

    const update = pick(req.body, ['projectName', 'address', 'city', 'district', 'siteStatus', 'notes']);
    if (isStaff(req.user) && req.body.status !== undefined) update.status = req.body.status;
    if (req.body.images !== undefined) update.images = await storeImages(cleanImages(req.body.images));

    const width = req.body.width !== undefined ? Number(req.body.width) : floorPlan.width;
    const length = req.body.length !== undefined ? Number(req.body.length) : floorPlan.length;
    if (!(width > 0) || !(length > 0) || width > 500 || length > 500) return fail(res, 'Kích thước không hợp lệ.');
    update.width = width;
    update.length = length;
    update.totalArea = Math.round(width * length * 100) / 100;

    const updated = await FloorPlan.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    res.json({ success: true, data: updated });
  } catch (error) {
    fail(res, error);
  }
});

router.delete('/floor-plans/:id', verifyToken, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return fail(res, 'Mã không hợp lệ.');
    const floorPlan = await FloorPlan.findById(req.params.id);
    if (!floorPlan) return fail(res, 'Không tìm thấy', 404);
    if (floorPlan.userId.toString() !== req.user.userId && req.user.role !== 'admin') {
      return fail(res, 'Không có quyền', 403);
    }
    await FloorPlan.findByIdAndDelete(req.params.id);
    refreshEngagementSafe(floorPlan.userId);
    res.json({ success: true, message: 'Đã xoá' });
  } catch (error) {
    fail(res, error, 500);
  }
});

// ============================================================
// CONCEPTS
// ============================================================
router.post('/concepts', verifyToken, async (req, res) => {
  try {
    if (!isValidId(req.body.floorPlanId)) return fail(res, 'Thiếu mặt bằng của concept.');
    const floorPlan = await FloorPlan.findById(req.body.floorPlanId).select('userId');
    if (!floorPlan) return fail(res, 'Không tìm thấy mặt bằng', 404);
    if (floorPlan.userId.toString() !== req.user.userId && !isStaff(req.user)) {
      return fail(res, 'Không có quyền', 403);
    }

    const data = pick(req.body, ['floorPlanId', 'style', 'mainColors', 'mainMaterials', 'description', 'spaceType']);
    data.estimatedBudget = Math.max(0, Number(req.body.estimatedBudget) || 0);

    const concept = await Concept.create({ ...data, userId: req.user.userId });
    refreshEngagementSafe(req.user.userId);
    res.status(201).json({ success: true, data: concept });
  } catch (error) {
    fail(res, error);
  }
});

router.get('/concepts', verifyToken, async (req, res) => {
  try {
    const filter = isStaff(req.user) ? {} : { userId: req.user.userId };
    const concepts = await Concept.find(filter).sort({ createdAt: -1 }).limit(500);
    res.json({ success: true, data: concepts });
  } catch (error) {
    fail(res, error, 500);
  }
});

router.get('/concepts/:id', verifyToken, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return fail(res, 'Mã không hợp lệ.');
    const concept = await Concept.findById(req.params.id);
    if (!concept) return fail(res, 'Không tìm thấy', 404);
    if (concept.userId.toString() !== req.user.userId && !isStaff(req.user)) {
      return fail(res, 'Không có quyền', 403);
    }
    res.json({ success: true, data: concept });
  } catch (error) {
    fail(res, error, 500);
  }
});

// ============================================================
// LEADS
// ============================================================
router.post('/leads', verifyToken, async (req, res) => {
  try {
    const data = pick(req.body, ['fullName', 'phone', 'email', 'interestedService', 'message']);
    if (req.body.floorPlanId) {
      if (!isValidId(req.body.floorPlanId)) return fail(res, 'Mã mặt bằng không hợp lệ.');
      const fp = await FloorPlan.findById(req.body.floorPlanId).select('userId');
      if (!fp || (fp.userId.toString() !== req.user.userId && !isStaff(req.user))) {
        return fail(res, 'Không có quyền với mặt bằng này', 403);
      }
      data.floorPlanId = fp._id;
    }

    // Trạng thái, người phụ trách, điểm... do hệ thống/nhân viên đặt, khách không tự gửi được
    const lead = await Lead.create({ ...data, userId: req.user.userId });
    await refreshEngagementSafe(req.user.userId);
    processLeadsInBackground(req.user.userId);

    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    fail(res, error);
  }
});

router.get('/leads', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const { status, assignedTo } = req.query;
    const filter = {};
    if (status && typeof status === 'string') filter.status = status;
    if (assignedTo && isValidId(assignedTo)) filter.assignedTo = assignedTo;

    const leads = await Lead.find(filter)
      .populate('userId', 'username fullName email')
      .populate('assignedTo', 'username fullName')
      .sort({ 'engagement.score': -1, createdAt: -1 })
      .limit(1000);

    res.json({ success: true, data: leads });
  } catch (error) {
    fail(res, error, 500);
  }
});

router.get('/leads/:id', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return fail(res, 'Mã không hợp lệ.');
    const lead = await Lead.findById(req.params.id)
      .populate('userId', 'username fullName email loginCount lastLoginAt')
      .populate('assignedTo', 'username fullName');
    if (!lead) return fail(res, 'Không tìm thấy', 404);
    res.json({ success: true, data: lead });
  } catch (error) {
    fail(res, error, 500);
  }
});

router.put('/leads/:id', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return fail(res, 'Mã không hợp lệ.');
    const current = await Lead.findById(req.params.id);
    if (!current) return fail(res, 'Không tìm thấy', 404);
    if (!canEditLead(req.user, current)) return fail(res, 'Lead này do nhân viên khác phụ trách.', 403);
    // assignedTo chỉ đổi qua /api/crm/leads/:id/assign (có kiểm tra người nhận)
    const update = pick(req.body, ['status', 'interestedService', 'message']);
    const updated = await Lead.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!updated) return fail(res, 'Không tìm thấy', 404);
    res.json({ success: true, data: updated });
  } catch (error) {
    fail(res, error);
  }
});

router.post('/leads/:id/notes', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return fail(res, 'Mã không hợp lệ.');
    const note = String(req.body.note || '').trim().slice(0, 2000);
    if (!note) return fail(res, 'Ghi chú trống.');

    const lead = await Lead.findById(req.params.id);
    if (!lead) return fail(res, 'Không tìm thấy', 404);
    if (!canEditLead(req.user, lead)) return fail(res, 'Lead này do nhân viên khác phụ trách.', 403);

    lead.salesNotes.push({ note, author: req.user.username });
    await lead.save();
    res.json({ success: true, data: lead });
  } catch (error) {
    fail(res, error);
  }
});

// Làm mới tóm tắt AI cho telesale
router.post('/leads/:id/summary', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return fail(res, 'Mã không hợp lệ.');
    const lead = await Lead.findById(req.params.id);
    if (!lead) return fail(res, 'Không tìm thấy', 404);
    const aiSummary = await summarizeLead(lead);
    res.json({ success: true, data: aiSummary });
  } catch (error) {
    fail(res, error, 500);
  }
});

// ============================================================
// MATERIALS & MARKET PRICES (nội bộ: định mức và giá không công khai)
// ============================================================
const MATERIAL_FIELDS = [
  'name', 'code', 'category', 'unit', 'specification', 'brand', 'origin',
  'notes', 'isActive', 'normPerM2', 'styleTags', 'spaceTypes'
];

router.post('/materials', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const material = await Material.create(pick(req.body, MATERIAL_FIELDS));
    res.status(201).json({ success: true, data: material });
  } catch (error) {
    fail(res, error);
  }
});

router.get('/materials', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const { category, isActive } = req.query;
    const filter = {};
    if (category && typeof category === 'string') filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const materials = await Material.find(filter).sort({ name: 1 });
    res.json({ success: true, data: materials });
  } catch (error) {
    fail(res, error, 500);
  }
});

router.put('/materials/:id', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return fail(res, 'Mã không hợp lệ.');
    const updated = await Material.findByIdAndUpdate(req.params.id, pick(req.body, MATERIAL_FIELDS), {
      new: true,
      runValidators: true
    });
    if (!updated) return fail(res, 'Không tìm thấy', 404);
    res.json({ success: true, data: updated });
  } catch (error) {
    fail(res, error);
  }
});

router.post('/market-prices', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const data = pick(req.body, ['materialId', 'price', 'unit', 'supplier', 'region', 'priceDate', 'source', 'notes']);
    if (!isValidId(data.materialId)) return fail(res, 'Vật tư không hợp lệ.');
    const price = await MarketPrice.create(data);
    res.status(201).json({ success: true, data: price });
  } catch (error) {
    fail(res, error);
  }
});

router.get('/market-prices/:materialId', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    if (!isValidId(req.params.materialId)) return fail(res, 'Mã không hợp lệ.');
    const prices = await MarketPrice.find({
      materialId: req.params.materialId,
      isActive: true
    }).sort({ priceDate: -1 }).limit(20);

    res.json({ success: true, data: prices });
  } catch (error) {
    fail(res, error, 500);
  }
});

// ============================================================
// BOQ (chỉ admin/staff)
// ============================================================
function sanitizeItems(items) {
  return (Array.isArray(items) ? items : [])
    .filter(it => it && isValidId(it.materialId))
    .map(it => ({
      materialId: it.materialId,
      materialName: String(it.materialName || '').slice(0, 200) || 'Vật tư',
      unit: String(it.unit || '').slice(0, 30) || '-',
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      notes: String(it.notes || '').slice(0, 300)
    }));
}

router.post('/boqs', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    if (!isValidId(req.body.floorPlanId)) return fail(res, 'Thiếu mặt bằng của dự toán.');
    const contingencyPct = Number(req.body.contingency) || 0;
    const vatPct = Number(req.body.vat) || 0;
    const totals = calcTotals(sanitizeItems(req.body.items), contingencyPct, vatPct);

    const boq = await BOQ.create({
      floorPlanId: req.body.floorPlanId,
      title: String(req.body.title || 'Dự toán').slice(0, 200),
      items: totals.items,
      contingencyPct,
      vatPct,
      subtotal: totals.subtotal,
      contingency: totals.contingency,
      vat: totals.vat,
      total: totals.total,
      source: 'manual',
      userId: req.user.userId
    });

    res.status(201).json({ success: true, data: boq });
  } catch (error) {
    fail(res, error);
  }
});

router.get('/boqs', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status && typeof req.query.status === 'string') filter.status = req.query.status;
    const boqs = await BOQ.find(filter)
      .select('-items')
      .populate('floorPlanId', 'projectName totalArea address')
      .populate('userId', 'username')
      .sort({ createdAt: -1 })
      .limit(500);
    res.json({ success: true, data: boqs });
  } catch (error) {
    fail(res, error, 500);
  }
});

router.get('/boqs/:id', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return fail(res, 'Mã không hợp lệ.');
    const boq = await BOQ.findById(req.params.id)
      .populate('floorPlanId', 'projectName totalArea address siteStatus')
      .populate('approvedBy', 'username');
    if (!boq) return fail(res, 'Không tìm thấy', 404);
    res.json({ success: true, data: boq });
  } catch (error) {
    fail(res, error, 500);
  }
});

// Staff chỉnh khối lượng/đơn giá → hệ thống tính lại tổng, đổi nguồn thành "staff-edited"
router.put('/boqs/:id', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return fail(res, 'Mã không hợp lệ.');
    const boq = await BOQ.findById(req.params.id);
    if (!boq) return fail(res, 'Không tìm thấy', 404);
    if (boq.status === 'approved') return fail(res, 'Dự toán đã duyệt, hãy chuyển về "đang xem xét" trước khi sửa.');

    const contingencyPct = req.body.contingencyPct !== undefined ? Number(req.body.contingencyPct) : boq.contingencyPct;
    const vatPct = req.body.vatPct !== undefined ? Number(req.body.vatPct) : boq.vatPct;
    const items = req.body.items !== undefined ? sanitizeItems(req.body.items) : boq.items.map(i => i.toObject());
    const totals = calcTotals(items, contingencyPct, vatPct);

    if (req.body.title) boq.title = String(req.body.title).slice(0, 200);
    boq.items = totals.items;
    boq.contingencyPct = contingencyPct;
    boq.vatPct = vatPct;
    boq.subtotal = totals.subtotal;
    boq.contingency = totals.contingency;
    boq.vat = totals.vat;
    boq.total = totals.total;
    boq.source = 'staff-edited';
    if (boq.status === 'rejected') boq.status = 'draft';
    await boq.save();

    res.json({ success: true, data: boq });
  } catch (error) {
    fail(res, error);
  }
});

// Duyệt / từ chối / trả lại. Chỉ nhân viên mới đổi được trạng thái.
router.put('/boqs/:id/status', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return fail(res, 'Mã không hợp lệ.');
    const status = req.body.status;
    if (!['draft', 'reviewing', 'approved', 'rejected'].includes(status)) return fail(res, 'Trạng thái không hợp lệ.');

    const boq = await BOQ.findById(req.params.id);
    if (!boq) return fail(res, 'Không tìm thấy', 404);

    boq.status = status;
    boq.approvedBy = status === 'approved' ? req.user.userId : null;
    await boq.save();
    res.json({ success: true, data: boq });
  } catch (error) {
    fail(res, error);
  }
});

module.exports = router;
