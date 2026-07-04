const mongoose = require('mongoose');

const BillSchema = new mongoose.Schema({
  billId: { type: String, required: true, unique: true },
  receiptType: { type: String, default: 'BÁO CÁO DOANH THU TỔNG HỢP' },
  paymentMethod: { type: String, default: 'Đối soát nội bộ' },
  dataSource: { type: String, default: 'Dữ liệu kết xuất từ iPOS hệ thống' },
  responsiblePerson: String,
  projectName: String,
  projectMilestone: String,
  attachedFileName: String,
  isAutoCalculate: { type: Boolean, default: true },
  manualTotal: { type: Number, default: 0 },
  vatRate: { type: Number, default: 0 },
  finalTotal: { type: Number, required: true },
  billItems: [{
    name: String,
    qty: String,
    unit: String,
    price: Number
  }]
}, { timestamps: true });

module.exports = mongoose.model('Bill', BillSchema);