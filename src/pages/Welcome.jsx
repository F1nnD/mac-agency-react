import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Welcome() {
  const navigate = useNavigate();

  return (
    // Sử dụng fixed inset-0 để khóa chết màn hình, flex-col và items-center để mọi thứ luôn nằm giữa theo chiều dọc và ngang
    <div className="fixed inset-0 w-full h-full flex flex-col items-center justify-center bg-[#0b0b0b] text-gray-300 antialiased z-50 p-6">
      
      {/* Hiệu ứng đèn pha mờ nghệ thuật ẩn sau nền */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/[0.01] rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* KHỐI NỘI DUNG CHÍNH TRUNG TÂM (Gồm Logo + 2 Ô Cổng) */}
      <div className="w-full max-w-5xl flex flex-col items-center z-10 space-y-10 md:space-y-12">
        
        {/* ĐỈNH CỔNG: Hạ size chữ MAC và tinh chỉnh khoảng cách sát nhau */}
        <div className="flex flex-col items-center text-center select-none">
          {/* ĐÃ SỬA: Hạ size chữ MAC nhỏ lại một chút tinh tế hơn */}
          <h1 className="text-3xl md:text-4xl font-bold tracking-[0.1em] text-white uppercase">
            MAC
          </h1>
          
          {/* ĐÃ SỬA: Điều chỉnh margin âm thành -mt-1 để vừa khít với cỡ chữ mới */}
          <p className="text-[10px] md:text-[11px] tracking-[0.4em] text-white/30 uppercase font-medium -mt-1">
            More Artistic Concept
          </p>
        </div>

        {/* TÂM CỔNG: Hệ thống 2 ô cổng, tự động cách khối logo một khoảng trống vừa vặn nhờ space-y ở trên */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 px-4">
          
          {/* HƯỚNG ĐI 1: TÔI LÀ KHÁCH HÀNG */}
          <button 
            onClick={() => navigate('/index')} 
            // ĐÃ SỬA: Đảm bảo có đầy đủ "border border-white/5" and "rounded-2xl" để hồi sinh chiếc viền bo góc nghệ thuật
            className="group relative p-8 md:p-10 bg-zinc-900/10 border border-white/5 rounded-2xl flex flex-col justify-between aspect-[4/3] hover:border-white/20 transition-all duration-500 backdrop-blur-sm cursor-pointer text-left w-full outline-none"
          >
            <span className="font-mono text-xs text-white/20 font-bold group-hover:text-white/40 transition-colors">PORTAL 01</span>
            <div className="space-y-3 mt-4">
              <h3 className="text-2xl font-light text-white uppercase tracking-wide">Tôi là khách hàng</h3>
              <p className="text-xs text-neutral-500 font-light leading-relaxed max-w-xs group-hover:text-neutral-400 transition-colors">
                Khám phá thư viện Lookbook không gian F&B độc bản, trải nghiệm triết lý sáng tạo và hoạch định ngân sách nội bộ tại trang chủ.
              </p>
            </div>
            <div className="text-xs font-semibold tracking-widest uppercase text-white/40 group-hover:text-white group-hover:translate-x-2 transition-all mt-4">
              Khám phá ngay —
            </div>
          </button>

          {/* HƯỚNG ĐI 2: TÔI LÀ QUẢN LÝ (ĐÃ ĐẤU NỐI QUA TRANG ĐĂNG NHẬP BẢO MẬT) */}
          <button 
            onClick={() => navigate('/admin/login')} // ĐÃ SỬA CHÍNH XÁC: Buộc đi qua cổng login trước khi vào dashboard
            className="group relative p-8 md:p-10 bg-zinc-900/10 border border-white/5 rounded-2xl flex flex-col justify-between aspect-[4/3] hover:border-white/20 transition-all duration-500 backdrop-blur-sm cursor-pointer text-left w-full outline-none"
          >
            <span className="font-mono text-xs text-white/20 font-bold group-hover:text-white/40 transition-colors">PORTAL 02</span>
            <div className="space-y-3 mt-4">
              <h3 className="text-2xl font-light text-white uppercase tracking-wide">Tôi là quản lý</h3>
              <p className="text-xs text-neutral-500 font-light leading-relaxed max-w-xs group-hover:text-neutral-400 transition-colors">
                Đăng nhập vào hệ thống lõi bảo mật để điều biên đơn giá dự toán, cập nhật kho tư liệu và chỉnh sửa portfolio công trình.
              </p>
            </div>
            <div className="text-xs font-semibold tracking-widest uppercase text-white/40 group-hover:text-white group-hover:translate-x-2 transition-all mt-4">
              Truy cập quản trị —
            </div>
          </button>

        </div>
      </div>

      {/* ĐÁY CỔNG: Đặt ở vị trí tuyệt đối (absolute) sát đáy để không ảnh hưởng đến khối nội dung ở tâm */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center z-10 select-none w-full">
        <p className="text-[9px] tracking-widest text-neutral-600 uppercase font-light">© 2026 MAC System Platform. Architectural & Operational Bản Sắc.</p>
      </div>

    </div>
  );
}