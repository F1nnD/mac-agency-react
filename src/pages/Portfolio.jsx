import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Portfolio() {
  const navigate = useNavigate();
  const [portfolioData, setPortfolioData] = useState([]); // Khởi tạo dạng mảng sạch để tránh lỗi trùng lặp key
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. THUẬT TOÁN KẾT NỐI VÀ NẠP DỮ LIỆU ĐỘNG TỪ MONGODB ATLAS
    async function loadFullPortfolio() {
      try {
        const response = await fetch('http://localhost:5000/api/projects');
        if (!response.ok) {
          throw new Error('Không thể kết nối lấy dữ liệu từ hệ thống Backend!');
        }
        const database = await response.json();
        
        // Nạp mảng dữ liệu sạch từ API vào state
        setPortfolioData(database);
        setLoading(false);
      } catch (error) {
        console.error("Lỗi lốt dữ liệu portfolio nghệ thuật từ MongoDB:", error);
        setLoading(false);
      }
    }
    loadFullPortfolio();
  }, []);

  // 2. KHỞI CHẠY HIỆU ỨNG GSAP REVEAL KHI DỮ LIỆU ĐÃ RENDER XONG
  useEffect(() => {
    if (portfolioData.length > 0) {
      gsap.to(".portfolio-item-anim", {
        duration: 1.2,
        opacity: 1,
        y: 0,
        stagger: 0.1,
        ease: "power4.out"
      });
    }
  }, [portfolioData]);

  return (
    <div className="w-full min-h-screen bg-[#0b0b0b] text-gray-300 antialiased overflow-x-hidden font-sans">
      
      {/* ========================================================================= */}
      {/* HEADER NAV TOP */}
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
          <button onClick={() => navigate('/home#about')} className="hover:text-white transition-colors bg-transparent border-none cursor-pointer">Giới Thiệu</button>
          <button onClick={() => navigate('/home#services')} className="hover:text-white transition-colors bg-transparent border-none cursor-pointer">Dịch Vụ</button>
          <button onClick={() => navigate('/home#portfolio')} className="hover:text-white transition-colors text-white bg-transparent border-none cursor-pointer">Dự Án</button>
          <button onClick={() => navigate('/home#process')} className="hover:text-white transition-colors bg-transparent border-none cursor-pointer">Quy Trình</button>
          <button onClick={() => navigate('/home#calculator')} className="hover:text-white transition-colors bg-transparent border-none cursor-pointer">Bộ Tính Giá</button>
        </nav>
      </header>

      {/* ========================================================================= */}
      {/* MAIN CONTAINER */}
      {/* ========================================================================= */}
      <main className="pt-32 pb-24 px-6 md:p-12 overflow-y-auto h-screen text-left max-w-7xl mx-auto w-full">
        
        <div className="mb-16 text-center md:text-left select-none">
          <span className="text-[10px] tracking-[0.4em] text-white/30 uppercase block mb-3 font-semibold">Portfolio Architecture</span>
          <h1 className="text-2xl font-light text-white uppercase mt-1">Hồ sơ năng lực dự án phát triển</h1>
        </div>

        {/* MÀN HÌNH TẢI DỮ LIỆU */}
        {loading ? (
          <div className="w-full py-20 text-center select-none animate-pulse text-zinc-500 font-mono text-xs tracking-widest uppercase">
            Đang tải dữ liệu portfolio từ MongoDB Atlas...
          </div>
        ) : (
          /* LƯỚI GRID ĐAN XEN BẤT ĐỐI XỨNG */
          <div id="full-portfolio-grid" className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
            {Array.isArray(portfolioData) && portfolioData.map((proj, index) => {
              if (!proj) return null;
              
              // Tạo key React an toàn dựa trên ID Database thật
              const uniqueId = proj._id || `proj-idx-${index}`;

              // Công thức gán tỷ lệ cột đan xen nghệ thuật
              const colSpan = (index % 3 === 0) ? 'md:col-span-2 aspect-[16/9]' : 'md:col-span-1';

              // Khử rườm rà đường dẫn ảnh ngoài/trong
              const checkImg = (p) => {
                if (!p) return '';
                if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('/')) return p;
                return '/' + p.replace('../assets/pic/', 'assets/pic/').replace('../pic/', 'assets/pic/');
              };
              
              const fixImg1 = checkImg(proj.img1);
              const fixImg2 = checkImg(proj.img2 || proj.img1);

              return (
                <div 
                  key={uniqueId}
                  className={`portfolio-item-anim ${colSpan} group relative overflow-hidden rounded-2xl bg-zinc-900 border border-white/5 cursor-default min-h-[350px] opacity-0 translate-y-[30px]`}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-10 pointer-events-none"></div>
                  
                  <img src={fixImg1} alt={proj.name} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover group-hover:scale-102 transition-transform duration-700 ease-in-out z-0 block" />
                  <img src={fixImg2} alt={`${proj.name} Hover`} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-in-out z-5 block" />
                  
                  <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 z-20 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div className="text-left flex-1 max-w-[80%]">
                      <span className="text-[10px] uppercase tracking-wider text-white/40 block mb-1 font-mono">{proj.type}</span>
                      <h3 
                        className="text-2xl font-bold text-white uppercase"
                        dangerouslySetInnerHTML={{ __html: proj.name || proj.breadcrumb }}
                      />                      
                      {proj.projectDesc && (
                        <p className="text-[11px] text-neutral-400 mt-2 line-clamp-2 font-light leading-relaxed max-w-md md:opacity-0 md:h-0 group-hover:opacity-100 group-hover:h-auto transition-all duration-500 ease-out origin-bottom">
                          {proj.projectDesc}
                        </p>
                      )}
                    </div>
                    
                    {/* KHỬ LỖI TẬN GỐC: Điều hướng mượt bốc parameter breadcrumb chữ chuẩn chỉ */}
                    <button 
                      onClick={() => navigate(`/project-detail?id=${proj.breadcrumb}`)}
                      className="inline-flex items-center gap-2 text-xs tracking-widest uppercase font-semibold text-white bg-black/50 border border-white/20 backdrop-blur-sm px-5 py-3 rounded-full opacity-100 translate-y-0 md:opacity-0 md:translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:bg-white hover:text-black hover:scale-105 hover:border-white transition-all duration-500 ease-out shadow-lg cursor-pointer z-30 shrink-0 outline-none"
                    >
                      <span>Xem chi tiết</span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform duration-300">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}