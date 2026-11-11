// Nhập vật tư / báo giá từ file CSV. Mount: app.use('/api/import', require('./routes/importRoutes'))
// Body JSON có thể lớn hơn mặc định; 500 dòng chữ thường vẫn dưới vài trăm KB.
const express = require('express');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const crm = require('../services/crmService');

const router = express.Router();
router.use(verifyToken, requireRole('admin', 'staff'));

const fail = (res, error, status) =>
  res.status(status || error.status || 500).json({ success: false, message: error.message || String(error) });

router.get('/template/:kind', (req, res) => {
  const tpl = crm.templateCsv(req.params.kind);
  if (!tpl) return fail(res, new Error('Không có file mẫu này.'), 404);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${tpl.filename}"`);
  res.send(tpl.content);
});

router.post('/materials', async (req, res) => {
  try {
    const dryRun = req.body?.dryRun !== false; // mặc định chỉ kiểm tra, phải gửi dryRun:false mới ghi
    const data = await crm.importMaterials(req.body?.rows, { dryRun });
    res.json({ success: true, data });
  } catch (error) {
    fail(res, error);
  }
});

router.post('/market-prices', async (req, res) => {
  try {
    const dryRun = req.body?.dryRun !== false;
    const data = await crm.importMarketPrices(req.body?.rows, { dryRun });
    res.json({ success: true, data });
  } catch (error) {
    fail(res, error);
  }
});

module.exports = router;
