const express = require('express');
const router = express.Router();
const { verifyToken, requireRole, optionalAuth } = require('../middleware/authMiddleware');

const FloorPlan = require('../models/FloorPlan');
const Concept = require('../models/Concept');
const Lead = require('../models/Lead');
const Material = require('../models/Material');
const MarketPrice = require('../models/MarketPrice');
const BOQ = require('../models/BOQ');

// ============================================================
// FLOOR PLANS
// ============================================================

// Tạo mặt bằng
router.post('/floor-plans', verifyToken, async (req, res) => {
  try {
    const { projectName, width, length, address, city, district, siteStatus, images, notes } = req.body;

    const floorPlan = await FloorPlan.create({
      userId: req.user.userId,
      projectName,
      width,
      length,
      totalArea: width * length,
      address,
      city,
      district,
      siteStatus,
      images: images || [],
      notes
    });

    res.status(201).json({ success: true, data: floorPlan });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Lấy danh sách mặt bằng
router.get('/floor-plans', verifyToken, async (req, res) => {
  try {
    const filter = ['admin', 'staff'].includes(req.user.role)
      ? {}
      : { userId: req.user.userId };

    const floorPlans = await FloorPlan.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: floorPlans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Lấy chi tiết mặt bằng
router.get('/floor-plans/:id', optionalAuth, async (req, res) => {
  try {
    const floorPlan = await FloorPlan.findById(req.params.id);
    if (!floorPlan) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    res.json({ success: true, data: floorPlan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cập nhật mặt bằng
router.put('/floor-plans/:id', verifyToken, async (req, res) => {
  try {
    const floorPlan = await FloorPlan.findById(req.params.id);
    if (!floorPlan) return res.status(404).json({ success: false, message: 'Không tìm thấy' });

    if (floorPlan.userId.toString() !== req.user.userId && !['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Không có quyền' });
    }

    const { width, length, ...rest } = req.body;
    const update = { ...rest };
    if (width && length) {
      update.width = width;
      update.length = length;
      update.totalArea = width * length;
    }

    const updated = await FloorPlan.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Xoá mặt bằng
router.delete('/floor-plans/:id', verifyToken, async (req, res) => {
  try {
    const floorPlan = await FloorPlan.findById(req.params.id);
    if (!floorPlan) return res.status(404).json({ success: false, message: 'Không tìm thấy' });

    if (floorPlan.userId.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Không có quyền' });
    }

    await FloorPlan.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Đã xoá' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// CONCEPTS
// ============================================================

router.post('/concepts', verifyToken, async (req, res) => {
  try {
    const concept = await Concept.create({
      ...req.body,
      userId: req.user.userId
    });
    res.status(201).json({ success: true, data: concept });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/concepts', verifyToken, async (req, res) => {
  try {
    const filter = ['admin', 'staff'].includes(req.user.role)
      ? {}
      : { userId: req.user.userId };

    const concepts = await Concept.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: concepts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/concepts/:id', verifyToken, async (req, res) => {
  try {
    const concept = await Concept.findById(req.params.id);
    if (!concept) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    res.json({ success: true, data: concept });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// LEADS
// ============================================================

// Tạo lead (bất kỳ ai có tài khoản)
router.post('/leads', verifyToken, async (req, res) => {
  try {
    const lead = await Lead.create({
      ...req.body,
      userId: req.user.userId
    });
    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Lấy danh sách lead (chỉ admin/staff)
router.get('/leads', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const { status, assignedTo } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;

    const leads = await Lead.find(filter)
      .populate('userId', 'username fullName email')
      .populate('assignedTo', 'username fullName')
      .sort({ 'engagement.score': -1, createdAt: -1 });

    res.json({ success: true, data: leads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cập nhật lead (chỉ admin/staff)
router.put('/leads/:id', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const updated = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Thêm ghi chú (chỉ admin/staff)
router.post('/leads/:id/notes', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Không tìm thấy' });

    lead.salesNotes.push({
      note: req.body.note,
      author: req.user.username
    });
    await lead.save();

    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================================
// MATERIALS (chỉ admin/staff)
// ============================================================

router.post('/materials', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const material = await Material.create(req.body);
    res.status(201).json({ success: true, data: material });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Danh sách vật tư (ai cũng xem được)
router.get('/materials', optionalAuth, async (req, res) => {
  try {
    const { category, isActive } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const materials = await Material.find(filter).sort({ name: 1 });
    res.json({ success: true, data: materials });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/materials/:id', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const updated = await Material.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================================
// MARKET PRICES (chỉ admin/staff)
// ============================================================

router.post('/market-prices', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const price = await MarketPrice.create(req.body);
    res.status(201).json({ success: true, data: price });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Lấy giá mới nhất của vật tư
router.get('/market-prices/:materialId', optionalAuth, async (req, res) => {
  try {
    const prices = await MarketPrice.find({
      materialId: req.params.materialId,
      isActive: true
    }).sort({ priceDate: -1 }).limit(10);

    res.json({ success: true, data: prices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// BOQ (chỉ admin/staff)
// ============================================================

router.post('/boqs', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const { items = [], contingency = 0, vat = 0 } = req.body;

    const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const contingencyAmount = subtotal * (contingency / 100);
    const vatAmount = (subtotal + contingencyAmount) * (vat / 100);
    const total = subtotal + contingencyAmount + vatAmount;

    const boq = await BOQ.create({
      ...req.body,
      subtotal,
      contingency: contingencyAmount,
      vat: vatAmount,
      total,
      userId: req.user.userId
    });

    res.status(201).json({ success: true, data: boq });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/boqs', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const boqs = await BOQ.find()
      .populate('floorPlanId', 'projectName')
      .populate('userId', 'username')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: boqs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/boqs/:id', verifyToken, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const boq = await BOQ.findById(req.params.id)
      .populate('floorPlanId')
      .populate('items.materialId');
    if (!boq) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    res.json({ success: true, data: boq });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;