import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Packages() {
  const navigate = useNavigate();
  const [packagesData, setPackagesData] = useState({});

  // =========================================================================
  // 1. THUẬT TOÁN ĐỒNG BỘ: ƯU TIÊN NẠP DỮ LIỆU TỪ BỘ NHỚ ĐỆM LOCALSTORAGE
  // =========================================================================
  useEffect(() => {
    async function loadStrategicPackages() {
      try {
        // Kiểm tra ngăn tủ lưu trữ cứng được đồng bộ từ Admin Dashboard trước
        const cachedPack = localStorage.getItem('mac_packages_cache');
        
        if (cachedPack) {
          setPackagesData(JSON.parse(cachedPack));
        } else {
          // Nếu hệ thống chưa từng có chỉnh sửa đơn giá, bốc file JSON gốc mặc định
          const response = await fetch('/assets/data/packages.json');
          const data = await response.json();
          setPackagesData(data);
          // Ghi ngược lại vào cache để các luồng tính giá sau đọc siêu tốc
          localStorage.setItem('mac_packages_cache', JSON.stringify(data));
        }
      } catch (error) {
        console.error("Lỗi nạp cấu trúc dữ liệu gói chiến lược:", error);
      }
    }
    loadStrategicPackages();

    // Hiệu ứng GSAP nạp mượt phần tiêu đề khi vừa vào trang
    gsap.fromTo("header", { y: -20, opacity: 0 }, { duration: 1, y: 0, opacity: 1, ease: "power2.out" });
    gsap.fromTo(".package-title-anim", 
      { y: 30, opacity: 0 }, 
      { duration: 1.4, y: 0, opacity: 1, stagger: 0.15, ease: "power4.out" }
    );
  }, []);

  // =========================================================================
  // 2. KÍCH HOẠT HIỆU ỨNG TRƯỢT THỂ NỐI ĐUÔI (STAGGER REVEAL)
  // =========================================================================
  useEffect(() => {
    if (Object.keys(packagesData).length > 0) {
      gsap.to(".package-card-anim", {
        duration: 1.2,
        opacity: 1,
        y: 0,
        stagger: 0.15,
        ease: "power4.out"
      });
    }
  }, [packagesData]);

  const formatVND = (amount) => amount.toLocaleString('vi-VN') + 'đ';

  return (
    <div className="w-full min-h-screen bg-[#0b0b0b] text-gray-300 antialiased overflow-x-hidden font-sans">
      
      {/* ========================================================================= */}
      {/* HEADER NAV TOP (Tràn màn hình 100%) */}
      {/* ========================================================================= */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0b0b0b]/80 backdrop-blur-md border-b border-white/5 px-6 py-5 md:px-16 flex items-center justify-between w-full">
        <button 
          onClick={() => navigate('/home')} 
          className="group flex items-center relative select-none cursor-pointer bg-transparent border-none outline-none text-left"
        >
          <div className="text-white/40 group-hover:text-white mr-3 md:mr-4 transform group-hover:-translate-x-1 transition-transform duration-300 ease-out flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </div>
          <img src="/assets/pic/logo3.png" alt="MAC Logo" className="h-9 w-auto object-contain transition-opacity duration-300 group-hover:opacity-80 block" />
        </button>
        
        <nav className="hidden md:flex items-center gap-10 text-xs tracking-widest uppercase font-medium text-gray-400">
          <button onClick={() => navigate('/home#about')} className="hover:text-white transition-colors bg-transparent border-none cursor-pointer outline-none uppercase font-medium tracking-widest text-xs">Giới Thiệu</button>
          <button onClick={() => navigate('/home#services')} className="hover:text-white transition-colors bg-transparent border-none cursor-pointer outline-none uppercase font-medium tracking-widest text-xs">Dịch Vụ</button>
          <button onClick={() => navigate('/portfolio')} className="hover:text-white transition-colors bg-transparent border-none cursor-pointer outline-none uppercase font-medium tracking-widest text-xs">Dự Án</button>
          <button onClick={() => navigate('/home#process')} className="hover:text-white transition-colors bg-transparent border-none cursor-pointer outline-none uppercase font-medium tracking-widest text-xs">Quy Trình</button>
          <button onClick={() => navigate('/home#calculator')} className="hover:text-white transition-colors text-white bg-transparent border-none cursor-pointer outline-none uppercase font-medium tracking-widest text-xs">Bộ Tính Giá</button>
        </nav>
      </header>

      {/* ========================================================================= */}
      {/* MAIN CONTENT TIÊU ĐỀ */}
      {/* ========================================================================= */}
      <main className="pt-32 pb-24 px-6 md:px-16 max-w-7xl mx-auto w-full">
        <div className="mb-20 text-center md:text-left select-none">
          <span className="package-title-anim text-[10px] tracking-[0.4em] text-white/30 uppercase block mb-3 font-semibold">Strategic Pricing</span>
          <h1 className="package-title-anim text-4xl md:text-6xl font-light tracking-tight text-white uppercase leading-none">
            Gói Giải Pháp <br className="hidden md:block" />
            <span className="font-bold">Chiến Lược & Định Biên</span>
          </h1>
          <div className="package-title-anim w-12 h-[1px] bg-white/20 mt-6 mx-auto md:mx-0"></div>
          <p className="package-title-anim text-gray-400 text-sm font-light max-w-xl mt-6 leading-relaxed">
            Hệ thống phân mục ngân sách được bóc tách minh bạch, tối ưu hóa công năng vận hành thực tế và bảo toàn tính duy mỹ độc bản cho thương hiệu F&B.
          </p>
        </div>

        {/* LƯỚI GRID HIỂN THỊ CÁC THẺ GÓI GIẢI PHÁP CHIẾN LƯỢC */}
        <div id="packages-grid" className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {Object.keys(packagesData).length === 0 ? (
            <div className="col-span-full text-center py-12 text-white/20 text-xs tracking-widest uppercase font-mono">
              Đang nạp cấu trúc định biên dữ liệu...
            </div>
          ) : (
            Object.keys(packagesData).map((key) => {
              const pack = packagesData[key];
              const fixBgImg = pack.bgImg.startsWith('http') ? pack.bgImg : '/' + pack.bgImg.replace('../', '');

              return (
                <div 
                  key={key} 
                  className="package-card-anim group relative overflow-hidden rounded-2xl bg-zinc-900/20 border border-white/5 p-8 md:p-10 flex flex-col justify-between min-h-[500px] hover:border-white/20 transition-colors duration-500 backdrop-blur-sm opacity-0 translate-y-[30px]"
                >
                  {/* Ảnh nền Cinematic mờ ảo khi hover */}
                  <img src={fixBgImg} alt={pack.name} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-[0.06] group-hover:scale-105 transition-all duration-1000 ease-out pointer-events-none z-0 block" />
                  
                  <div className="relative z-10 space-y-6 text-left">
                    <div className="flex justify-between items-baseline border-b border-white/5 pb-4">
                      <h2 className="text-xl font-bold tracking-tight text-white uppercase">{pack.name}</h2>
                      <span className="font-mono text-xs text-white/20 font-bold">{pack.num}</span>
                    </div>

                    <p className="text-xs text-neutral-400 font-light leading-relaxed max-w-sm">{pack.description}</p>

                    <div className="py-2">
                      <span className="text-2xl font-bold tracking-tight text-white font-mono">{formatVND(pack.price)}</span>
                      <span className="text-[10px] text-white/40 uppercase tracking-widest font-medium ml-1">/ {pack.unit}</span>
                    </div>

                    <div className="space-y-3 pt-2">
                      <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-semibold select-none">Phân mục cấu thành quyền lợi:</h4>
                      <ul className="space-y-2.5">
                        {pack.features.map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-3 text-xs text-neutral-400 font-light leading-snug">
                            <span className="text-white/40 pt-0.5 select-none">—</span>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Nút bấm liên hệ nhận BOQ chi tiết bám sang Zalo */}
                  <div className="relative z-10 pt-8 mt-auto border-t border-white/5">
                    <a href="https://zalo.me/0375075975" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-white text-black font-bold uppercase tracking-widest text-[10px] py-3.5 px-6 rounded-xl hover:bg-neutral-200 transition-all text-center w-full shadow-lg">
                      <img src="/assets/pic/zalo.png" alt="Zalo" className="w-3.5 h-3.5 object-contain select-none pointer-events-none invert block" />
                      Liên hệ nhận gói chi tiết
                    </a>
                  </div>

                </div>
              );
            })
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* FOOTER SYSTEM */}
      {/* ========================================================================= */}
      <footer className="bg-black py-20 px-6 md:px-16 border-t border-white/5 w-full text-left">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16 text-sm text-gray-500 font-light leading-relaxed">
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-white tracking-widest">MAC</h3>
            <p>📍 44 Nguyễn Văn Dung, Phường 6, Gò Vấp, TP. Hồ Chí Minh</p>
            <p>📞 0375075975</p>
            <p>✉️ maconcept.asia@gmail.com</p>
          </div>
          <div className="space-y-3">
            <h4 className="text-white font-semibold tracking-wider uppercase mb-2">Dịch Vụ Chính</h4>
            <p>• Thiết kế & Thi công kiến trúc chuyên sâu F&B</p>
            <p>• Thiết kế biệt thự nhà vườn cao cấp</p>
            <p>• Thiết kế cảnh quan tích hợp hồ cá Koi nghệ thuật</p>
          </div>
          <div className="space-y-5">
            <h4 className="text-white font-semibold tracking-wider uppercase">Yêu Cầu Báo Giá</h4>
            <p>Hotline tư vấn kỹ thuật trực tiếp: <strong className="text-white text-base">0375075975</strong></p>
            <a href="https://zalo.me/0375075975" target="_blank" rel="noreferrer" className="block bg-white text-black font-bold text-center uppercase tracking-widest text-xs px-6 py-4 rounded-xl w-full hover:bg-gray-200 transition-all leading-none">
              Kết nối nhận tư vấn trực tiếp
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}