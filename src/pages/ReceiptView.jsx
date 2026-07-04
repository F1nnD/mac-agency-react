import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function ReceiptView() {
  const [searchParams] = useSearchParams();
  const [bill, setBill] = useState(null);

  useEffect(() => {
    const qId = searchParams.get('id');
    const qTotal = searchParams.get('total');
    const qType = searchParams.get('type');

    if (qId) {
      // Tìm ngược lại trong lịch sử hạch toán nội bộ máy POS để lấy full dữ liệu
      const cachedBills = localStorage.getItem('mac_pos_bills_cache');
      if (cachedBills) {
        const history = JSON.parse(cachedBills);
        const matchedBill = history.find(h => h.billId === qId);
        
        if (matchedBill) {
          setBill({
            id: matchedBill.billId,
            type: matchedBill.type,
            stone: matchedBill.milestone,
            file: matchedBill.attachedFile,
            final: matchedBill.total,
            time: matchedBill.timestamp
          });
          return;
        }
      }

      // Nếu quét thiết bị lạ chưa có cache, vẫn hiển thị thông số cơ bản bốc từ URL
      setBill({
        id: qId,
        type: qType || 'CHỨNG TỪ NỘI BỘ',
        stone: 'Trích xuất dữ liệu nhanh',
        file: 'Xem file trên máy POS chủ',
        final: parseFloat(qTotal) || 0,
        time: new Date().toLocaleDateString('vi-VN')
      });
    }
  }, [searchParams]);

  if (!bill) {
    return (
      <div className="w-full min-h-screen bg-[#0b0b0b] text-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-xs text-neutral-500 uppercase tracking-widest">⚠️ Đang tải cấu trúc dữ liệu chứng từ...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#0b0b0b] text-neutral-300 px-4 py-8 font-mono flex flex-col items-center">
      <div className="w-full max-w-md bg-white text-black rounded-3xl p-6 space-y-4 shadow-2xl text-left">
        
        <div className="text-center space-y-1">
          <h2 className="text-base font-bold text-black tracking-widest uppercase">MAC CONCEPT</h2>
          <p className="text-[9px] text-neutral-500 uppercase">More Artistic Concept</p>
          <div className="border-b border-dashed border-neutral-400 my-2"></div>
          <h3 className="text-xs font-bold tracking-wider text-black uppercase py-0.5">{bill.type}</h3>
          <div className="border-b border-dashed border-neutral-400 my-2"></div>
        </div>

        <div className="text-[11px] text-neutral-700 space-y-1">
          <p>Mã chứng từ: <span className="text-black font-bold">{bill.id}</span></p>
          <p>Thời gian ghi: <span>{bill.time}</span></p>
          <p>Tiến độ/Milestone: <span className="text-amber-600 font-bold">{bill.stone}</span></p>
          <p>Tệp chứng từ gốc: <span className="text-neutral-900 font-medium">📎 {bill.file}</span></p>
        </div>

        <div className="border-b border-dashed border-neutral-400 my-2"></div>

        <div className="flex justify-between items-center text-xs font-bold text-black uppercase border-t border-neutral-100 pt-2">
          <span>Tổng hạch toán ca/mảng:</span>
          <span className="text-emerald-600 text-sm font-bold">{bill.final.toLocaleString('vi-VN')}đ</span>
        </div>

        <div className="text-center pt-4 text-[9px] text-neutral-400 uppercase tracking-widest font-bold select-none border-t border-dashed border-neutral-200">
          ✓ Xác thực hệ thống bảo mật mac
        </div>

      </div>
    </div>
  );
}