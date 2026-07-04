import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

export default function Home() {
  const navigate = useNavigate();

  // =========================================================================
  // 1. QUẢN LÝ TRẠNG THÁI (STATES) CHO SLIDE NỀN & DỮ LIỆU PORTFOLIO + GIÁ
  // =========================================================================
  const [homeCurrentIdx, setHomeCurrentIdx] = useState(0);
  const [portfolioData, setPortfolioData] = useState({});
  
  // ĐỒNG BỘ ĐỘNG: Chuyển bảng giá sang State để nạp dữ liệu từ MongoDB Atlas
  const [priceList, setPriceList] = useState({
    concept: { name: "Gói Thiết Kế Concept", price: 350000 },
    build: { name: "Gói Thi Công Trọn Gói", price: 3500000 },
    combo: { name: "Combo Premium Thượng Lưu", price: 4200000 },
    landscape: { name: "Cảnh Quan Nghệ Thuật", price: 800000 }
  });

  // State phục vụ Bộ Tính Giá Dự Toán
  const [area, setArea] = useState(100);
  const [selectedPackage, setSelectedPackage] = useState("concept");

  // =========================================================================
  // 2. VÒNG ĐỜI COMPONENT (EFFECTS)
  // =========================================================================
  useEffect(() => {
    // Tự động chạy slide nền mỗi 5 giây
    const interval = setInterval(() => {
      setHomeCurrentIdx((prev) => (prev + 1) % 3);
    }, 5000);

    // Kích hoạt hiệu ứng Fade-in khi cuộn chuột
    document.querySelectorAll('.fade-in-section').forEach((section) => {
      gsap.to(section, {
        scrollTrigger: {
          trigger: section,
          start: "top 85%",
          toggleActions: "play none none none"
        },
        duration: 1.2,
        opacity: 1,
        y: 0,
        ease: "power3.out"
      });
    });

    // 🟢 ĐỒNG BỘ ĐỘNG: Kéo dữ liệu dự án thời gian thực từ Backend Node.js
    async function fetchPortfolio() {
      try {
        const response = await fetch('http://localhost:5000/api/projects');
        if (response.ok) {
          const database = await response.json();
          setPortfolioData(database);
        }
      } catch (error) {
        console.error("Lỗi lốt dữ liệu portfolio nghệ thuật:", error);
      }
    }

    // 🟢 ĐỒNG BỘ ĐỘNG: Đổi đường dẫn API giống hệt trang Báo giá định biên
    async function fetchPackages() {
      try {
        // 🛠️ BẠN HÃY THAY ĐỔI ĐƯỜNG DẪN NÀY:
        // Kiểm tra xem bên file code của trang Báo giá định biên đang fetch tới đường dẫn nào 
        // (Ví dụ: có thể là 'http://localhost:5000/api/packages/all' hoặc một routes khác)
        // Tôi sẽ sửa tạm thành đường dẫn gốc để bạn đối chiếu:
        const response = await fetch('/assets/data/packages.json'); // Thay bằng đường dẫn API thực tế của bạn
        
        if (response.ok) {
          const data = await response.json();
          const updatedPriceList = { ...priceList };

          // Xử lý dữ liệu động đổ vào 4 ô nhỏ
          if (data && typeof data === 'object' && !Array.isArray(data)) {
            Object.keys(data).forEach(key => {
              if (updatedPriceList[key]) {
                updatedPriceList[key].price = data[key].price;
                if (data[key].name) updatedPriceList[key].name = data[key].name;
              }
            });
            setPriceList(updatedPriceList);
          }
        }
      } catch (error) {
        console.error("Lỗi đồng bộ đơn giá từ MongoDB:", error);
      }
    }
    fetchPortfolio();
    fetchPackages();

    return () => {
      clearInterval(interval);
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  // Hiệu ứng zoom nhẹ nhòe hình khi slide thay đổi
  useEffect(() => {
    const currentImg = document.querySelector('.home-slide.active .slide-img');
    if (currentImg) {
      gsap.fromTo(currentImg, 
        { scale: 1.05, filter: "blur(4px)" }, 
        { duration: 2, scale: 1, filter: "blur(0px)", ease: "power2.out" }
      );
    }
  }, [homeCurrentIdx]);

  // =========================================================================
  // 3. CÁC HÀM XỬ LÝ SỰ KIỆN
  // =========================================================================
  const handleSmoothScroll = (e, targetId) => {
    e.preventDefault();
    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      gsap.to(window, { duration: 1.5, scrollTo: { y: targetElement, offsetY: 80 }, ease: "power4.out" });
    }
  };

  const formatVND = (amount) => amount.toLocaleString('vi-VN') + 'đ';

  const currentPackage = priceList[selectedPackage];
  const baseCost = area * currentPackage.price;
  const boqCost = baseCost * 0.05;
  const totalCost = baseCost + boqCost;

  return (
    <div className="w-full text-gray-300 antialiased overflow-x-hidden font-sans bg-[#0b0b0b]">

      {/* HEADER BAR */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0b0b0b] border-b border-white/5 px-6 py-5 md:px-16 flex items-center justify-between w-full">
        <div className="flex items-center select-none">
          <button onClick={() => navigate('/')} className="text-white/40 hover:text-white mr-3 md:mr-4 transform hover:-translate-x-1 transition-all duration-300 ease-out flex items-center justify-center bg-transparent border-none outline-none cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div onClick={(e) => handleSmoothScroll(e, '#top')} className="group flex items-center cursor-pointer">
            <img src="/assets/pic/logo3.png" alt="MAC Logo" className="h-9 w-auto object-contain transition-opacity duration-300 group-hover:opacity-80" />
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-10 text-xs tracking-widest uppercase font-medium text-gray-400">
          <a href="#about" onClick={(e) => handleSmoothScroll(e, '#about')} className="hover:text-white transition-colors">Giới Thiệu</a>
          <a href="#services" onClick={(e) => handleSmoothScroll(e, '#services')} className="hover:text-white transition-colors">Dịch Vụ</a>
          <a href="#portfolio" onClick={(e) => handleSmoothScroll(e, '#portfolio')} className="hover:text-white transition-colors text-white">Dự Án</a>
          <a href="#process" onClick={(e) => handleSmoothScroll(e, '#process')} className="hover:text-white transition-colors">Quy Trình</a>
          <a href="#calculator" onClick={(e) => handleSmoothScroll(e, '#calculator')} className="hover:text-white transition-colors">Bộ Tính Giá</a>
        </nav>
      </header>

      <div id="top"></div>

      {/* HERO CINEMATIC SLIDESHOW */}
      <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-[#0b0b0b]">
        <div className="absolute inset-0 z-0 w-full h-full">
          <div className="absolute inset-0 bg-black/50 z-10 pointer-events-none"></div>
          
          <div className={`home-slide absolute inset-0 w-full h-full overflow-hidden transition-opacity duration-1000 ease-in-out opacity-0 ${homeCurrentIdx === 0 ? 'active opacity-100' : ''}`}>
            <img src="/assets/pic/dedrip.jpg" alt="De Dripp Kafe" className="slide-img w-full h-full object-cover" />
            <div className="absolute bottom-12 left-6 md:left-16 z-20 overflow-hidden">
              <span className="project-tag text-[11px] tracking-[0.25em] text-white/50 uppercase block">Dự án 01 / De Dripp Kafe</span>
            </div>
          </div>
          
          <div className={`home-slide absolute inset-0 w-full h-full overflow-hidden transition-opacity duration-1000 ease-in-out opacity-0 ${homeCurrentIdx === 1 ? 'active opacity-100' : ''}`}>
            <img src="/assets/pic/themonic.jpg" alt="The Monic Coffee" className="slide-img w-full h-full object-cover" />
            <div className="absolute bottom-12 left-6 md:left-16 z-20 overflow-hidden">
              <span className="project-tag text-[11px] tracking-[0.25em] text-white/50 uppercase block">Dự án 02 / The Monic Coffee</span>
            </div>
          </div>

          <div className={`home-slide absolute inset-0 w-full h-full overflow-hidden transition-opacity duration-1000 ease-in-out opacity-0 ${homeCurrentIdx === 2 ? 'active opacity-100' : ''}`}>
            <img src="/assets/pic/Under.jpg" alt="Underhood Kafe" className="slide-img w-full h-full object-cover" />
            <div className="absolute bottom-12 left-6 md:left-16 z-20 overflow-hidden">
              <span className="project-tag text-[11px] tracking-[0.25em] text-white/50 uppercase block">Dự án 03 / Underhood Kafe</span>
            </div>
          </div>
        </div>
    
        <div className="relative z-20 max-w-5xl mx-auto text-center px-6 pointer-events-none">
          <span className="text-xs md:text-sm font-semibold tracking-[0.35em] text-gray-300 uppercase mb-5 block">Thiết Kế • Thi Công • Setup • Vận Hành</span>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight text-white mb-6 leading-none select-none uppercase">
            Sáng tạo không gian<br />Vận hành bản sắc.
          </h1>
          <p className="text-gray-200/80 text-sm md:text-lg font-light max-w-3xl mx-auto mb-12 leading-relaxed tracking-wide">
            Hiện thực hóa những ý tưởng không gian F&B độc đáo mang tính nghệ thuật cao, tối ưu công năng vận hành thực tế.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pointer-events-auto">
            <a href="#portfolio" onClick={(e) => handleSmoothScroll(e, '#portfolio')} className="w-full sm:w-auto bg-white text-black px-10 py-4 rounded-full text-xs font-semibold tracking-widest uppercase hover:bg-neutral-200 transition-all text-center cursor-pointer">
              Khám phá dự án
            </a>
            <a href="#calculator" onClick={(e) => handleSmoothScroll(e, '#calculator')} className="w-full sm:w-auto border border-white/20 bg-black/20 backdrop-blur-sm text-white px-10 py-4 rounded-full text-xs font-semibold tracking-widest uppercase hover:bg-white/10 transition-all text-center cursor-pointer">
              Dự toán chi phí sơ bộ
            </a>
          </div>
        </div>
    
        <div className="absolute bottom-12 right-6 md:right-16 z-20 flex items-center gap-2 pointer-events-auto">
          <button onClick={() => setHomeCurrentIdx(0)} className={`home-dot h-2 rounded-full transition-all duration-300 cursor-pointer ${homeCurrentIdx === 0 ? 'w-6 bg-white' : 'w-2 bg-white/40'}`}></button>
          <button onClick={() => setHomeCurrentIdx(1)} className={`home-dot h-2 rounded-full transition-all duration-300 cursor-pointer ${homeCurrentIdx === 1 ? 'w-6 bg-white' : 'w-2 bg-white/40'}`}></button>
          <button onClick={() => setHomeCurrentIdx(2)} className={`home-dot h-2 rounded-full transition-all duration-300 cursor-pointer ${homeCurrentIdx === 2 ? 'w-6 bg-white' : 'w-2 bg-white/40'}`}></button>
        </div>
      </section>

      {/* SECTION ABOUT */}
      <section id="about" className="fade-in-section py-28 px-6 md:px-16 w-full border-t border-white/5 grid grid-cols-1 md:grid-cols-3 gap-16 scroll-mt-20">
        <div className="flex flex-col justify-between h-full space-y-6">
          <div className="space-y-2">
            <span className="text-xs tracking-[0.3em] text-white/40 uppercase block">About Us</span>
            <h2 className="text-4xl md:text-5xl font-light text-white tracking-tight leading-tight">More Artistic<br />Concept</h2>
          </div>
          <div>
            <a href="/AboutDetail" className="group inline-flex items-center gap-3 text-xs tracking-widest uppercase font-semibold text-white/60 hover:text-white transition-colors duration-300">
              <span>Xem thêm về MAC</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform duration-300 ease-out">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </a>
          </div>
        </div>
        <div className="space-y-4 pt-2">
          <h4 className="text-xs tracking-widest text-gray-400 uppercase font-bold">Sứ Mệnh</h4>
          <p className="text-base text-gray-400 leading-relaxed font-light">
            Đóng vai trò nhà thầu trọn gói chuyên sâu cho mọi dự án F&B. MAC mang lại giải pháp toàn diện từ tài chính, chiến lược vận hành bền vững đến kiến trúc độc bản tối ưu cho Chủ Đầu Tư.
          </p>
        </div>
        <div className="space-y-4 pt-2">
          <h4 className="text-xs tracking-widest text-gray-400 uppercase font-bold">Giá Trị Cốt Lõi</h4>
          <p className="text-base text-gray-400 leading-relaxed font-light">
            Lấy hiệu quả của dự án làm thước đo hàng đầu. Chúng tôi cam kết bằng sự uy tín, trách nhiệm, tận tâm và tính minh bạch tuyệt đối, nâng niu từng đóng góp của khách hàng để cùng phát triển.
          </p>
        </div>
      </section>

      {/* SECTION SERVICES */}
      <section id="services" className="py-24 bg-[#0b0b0b] w-full border-y border-white/5 scroll-mt-20">
        <div className="px-6 md:px-16 mb-12 text-left select-none">
          <span className="text-xs tracking-[0.3em] text-white/40 uppercase block mb-1">Our Expertise</span>
          <h2 className="text-3xl font-light text-white">Dịch Vụ Cung Cấp</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-t border-white/5 overflow-hidden w-full">
          <div className="group relative p-8 md:p-10 bg-zinc-900/20 space-y-6 flex flex-col justify-between aspect-square border-r border-b lg:border-b-0 border-white/5 overflow-hidden cursor-pointer transition-all duration-500 text-left">
            <div className="absolute inset-0 bg-neutral-950/60 z-10 pointer-events-none"></div>
            <img src="/assets/pic/ARCHI.jpg" alt="Thiết kế" className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:opacity-60 group-hover:scale-105 transition-all duration-700 ease-in-out z-0 block" />
            <span className="relative z-20 text-2xl font-bold text-white/10 font-mono transition-colors duration-500 group-hover:text-white/30">01</span>
            <div className="relative z-20 space-y-2">
              <h3 className="text-lg font-semibold text-white/80 transition-all duration-500 group-hover:text-white group-hover:-translate-y-1">{`Thiết Kế & Thi Công`}</h3>
              <p className="text-sm text-gray-500 font-light leading-relaxed transition-colors duration-500 group-hover:text-gray-300">Tối ưu kiến trúc phần cứng, hiện thực hóa bản vẽ ra công trường chuẩn xác.</p>
            </div>
          </div>
          <div className="group relative p-8 md:p-10 bg-zinc-900/20 space-y-6 flex flex-col justify-between aspect-square border-r border-b lg:border-b-0 border-white/5 overflow-hidden cursor-pointer transition-all duration-500 text-left">
            <div className="absolute inset-0 bg-neutral-950/60 z-10 pointer-events-none"></div>
            <img src="/assets/pic/SETUP.jpg" alt="Setup" className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:opacity-60 group-hover:scale-105 transition-all duration-700 ease-in-out z-0 block" />
            <span className="relative z-20 text-2xl font-bold text-white/10 font-mono transition-colors duration-500 group-hover:text-white/30">02</span>
            <div className="relative z-20 space-y-2">
              <h3 className="text-lg font-semibold text-white/80 transition-all duration-500 group-hover:text-white group-hover:-translate-y-1">{`Setup & Vận Hành`}</h3>
              <p className="text-sm text-gray-500 font-light leading-relaxed transition-colors duration-500 group-hover:text-gray-300">Bố trí công năng quầy bar nghệ thuật, chuyển giao giải pháp quản lý F&B.</p>
            </div>
          </div>
          <div className="group relative p-8 md:p-10 bg-zinc-900/20 space-y-6 flex flex-col justify-between aspect-square border-r border-b md:border-b-0 border-white/5 overflow-hidden cursor-pointer transition-all duration-500 text-left">
            <div className="absolute inset-0 bg-neutral-950/60 z-10 pointer-events-none"></div>
            <img src="/assets/pic/MARKETING.jpg" alt="Marketing" className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:opacity-60 group-hover:scale-105 transition-all duration-700 ease-in-out z-0 block" />
            <span className="relative z-20 text-2xl font-bold text-white/10 font-mono transition-colors duration-500 group-hover:text-white/30">03</span>
            <div className="relative z-20 space-y-2">
              <h3 className="text-lg font-semibold text-white/80 transition-all duration-500 group-hover:text-white group-hover:-translate-y-1">Marketing</h3>
              <p className="text-sm text-gray-500 font-light leading-relaxed transition-colors duration-500 group-hover:text-gray-300">Định vị thông điệp truyền thông bài bản cho thương hiệu lúc ra mắt.</p>
            </div>
          </div>
          <div className="group relative p-8 md:p-10 bg-zinc-900/20 space-y-6 flex flex-col justify-between aspect-square border-white/5 overflow-hidden cursor-pointer transition-all duration-500 text-left">
            <div className="absolute inset-0 bg-neutral-950/60 z-10 pointer-events-none"></div>
            <img src="/assets/pic/BRANDING.jpg" alt="Branding" className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:opacity-60 group-hover:scale-105 transition-all duration-700 ease-in-out z-0 block" />
            <span className="relative z-20 text-2xl font-bold text-white/10 font-mono transition-colors duration-500 group-hover:text-white/30">04</span>
            <div className="relative z-20 space-y-2">
              <h3 className="text-lg font-semibold text-white/80 transition-all duration-500 group-hover:text-white group-hover:-translate-y-1">Branding</h3>
              <p className="text-sm text-gray-500 font-light leading-relaxed transition-colors duration-500 group-hover:text-gray-300">Xây dựng bộ nhận diện cốt lõi độc quyền bám sát bản sắc không gian.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION PORTFOLIO */}
      <section id="portfolio" className="fade-in-section py-24 px-6 md:px-16 w-full scroll-mt-20">
        <div className="flex items-end justify-between border-b border-white/5 mb-12 pb-5">
          <div>
            <span className="text-xs tracking-[0.3em] text-white/40 uppercase block mb-1">Selected Works</span>
            <h2 className="text-3xl font-light text-white">Dự Án Nổi Bật</h2>
          </div>
          <a href="/portfolio" className="text-xs tracking-widest uppercase border border-white/10 hover:border-white px-6 py-2.5 rounded-full text-white transition-all">Xem tất cả</a>
        </div>
        <div id="portfolio-grid" className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          {Object.keys(portfolioData).map((projectId, index) => {
            const proj = portfolioData[projectId];
            const colSpan = (index % 3 === 0) ? 'md:col-span-2 aspect-[16/9]' : 'md:col-span-1';
            
            const fixImg1 = proj.img1.startsWith('http') || proj.img1.startsWith('/') ? proj.img1 : '/' + proj.img1.replace('../assets/pic/', 'assets/pic/').replace('../pic/', 'assets/pic/');
            const fixImg2 = (proj.img2 || proj.img1).startsWith('http') || (proj.img2 || proj.img1).startsWith('/') ? (proj.img2 || proj.img1) : '/' + (proj.img2 || proj.img1).replace('../assets/pic/', 'assets/pic/').replace('../pic/', 'assets/pic/');

            return (
              <div key={projectId} className={`${colSpan} group relative overflow-hidden rounded-2xl bg-zinc-900 border border-white/5 cursor-default min-h-[350px]`}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10 pointer-events-none"></div>
                <img src={fixImg1} alt={proj.name} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover group-hover:scale-102 transition-transform duration-700 ease-in-out z-0 block" />
                <img src={fixImg2} alt={`${proj.name} Hover`} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-in-out z-5 block" />
                <div className="absolute bottom-0 left-0 w-full p-8 z-20 flex justify-between items-end">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-white/40 block mb-1 font-mono">{proj.type}</span>
                    <h3 
                  className="text-2xl font-bold text-white uppercase"
                  dangerouslySetInnerHTML={{ __html: proj.name || proj.breadcrumb }}
                  /> 
                   </div>
                  <a href={`/project-detail?id=${projectId}`} className="inline-flex items-center gap-2 text-xs tracking-widest uppercase font-semibold text-white bg-black/50 border border-white/20 backdrop-blur-sm px-5 py-3 rounded-full opacity-100 translate-y-0 md:opacity-0 md:translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:bg-white hover:text-black hover:scale-105 hover:border-white transition-all duration-500 ease-out shadow-lg cursor-pointer z-30 mt-4 md:mt-0">
                    <span>Xem chi tiết</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform duration-300">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION ACCORDION WORKFLOW */}
      <section id="process" className="py-24 bg-[#0b0b0b] px-6 md:px-16 border-t border-white/5 w-full scroll-mt-20">
        <div className="mb-16">
          <span className="text-xs tracking-[0.3em] text-white/40 uppercase block mb-1">Workflow</span>
          <h2 className="text-3xl font-light text-white tracking-tight">Quy Trình Thực Hiện Dự Án</h2>
        </div>
        <div id="process-accordion" className="flex flex-col md:flex-row w-full h-auto md:h-[600px] border border-white/5 rounded-2xl overflow-hidden bg-black shadow-2xl">
          <div className="group relative flex-1 hover:flex-[5] transition-all duration-700 ease-in-out border-b md:border-b-0 md:border-r border-white/5 overflow-hidden h-full cursor-pointer">
            <div className="absolute inset-0 bg-black/75 group-hover:bg-black/50 transition-colors duration-700 z-10"></div>
            <img src="https://images.unsplash.com/photo-1531403009284-440f080d1e12?q=80&w=1200" alt="Giai đoạn 1" className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-102 transition-all duration-700 ease-in-out z-0 block" />
            <div className="absolute inset-0 flex items-center justify-center font-mono text-[14vw] md:text-[8vw] font-black text-white/[0.03] group-hover:opacity-0 transition-opacity duration-500 z-0 select-none">01</div>
            <div className="absolute top-1/2 -translate-y-1/2 left-8 right-8 md:left-16 md:right-16 z-20 md:opacity-0 md:translate-x-8 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-600 ease-out delay-100 space-y-4 pointer-events-none">
              <span className="font-mono text-xs tracking-[0.4em] text-white/40 uppercase block">Giai đoạn 01</span>
              <h3 className="text-4xl md:text-6xl font-bold text-white uppercase tracking-tight leading-none">Lập Nhiệm Vụ <br />& Báo Giá</h3>
              <p className="text-sm text-gray-300 font-light leading-relaxed max-w-xl pt-4 border-t border-white/10">Gặp gỡ, khảo sát mặt bằng thực tế, lắng nghe mong muốn cốt lõi của chủ đầu tư, thống định hướng concept ban đầu và tiến hành ký kết hợp đồng nguyên tắc.</p>
            </div>
          </div>
          <div className="group relative flex-1 hover:flex-[5] transition-all duration-700 ease-in-out border-b md:border-b-0 md:border-r border-white/5 overflow-hidden h-full cursor-pointer">
            <div className="absolute inset-0 bg-black/75 group-hover:bg-black/50 transition-colors duration-700 z-10"></div>
            <img src="https://images.unsplash.com/photo-1501159599894-155982264a55?q=80&w=1200" alt="Giai đoạn 2" className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-102 transition-all duration-700 ease-in-out z-0 block" />
            <div className="absolute inset-0 flex items-center justify-center font-mono text-[14vw] md:text-[8vw] font-black text-white/[0.03] group-hover:opacity-0 transition-opacity duration-500 z-0 select-none">02</div>
            <div className="absolute top-1/2 -translate-y-1/2 left-8 right-8 md:left-16 md:right-16 z-20 md:opacity-0 md:translate-x-8 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-600 ease-out delay-100 space-y-4 pointer-events-none">
              <span className="font-mono text-xs tracking-[0.4em] text-white/40 uppercase block">Giai đoạn 02</span>
              <h3 className="text-4xl md:text-6xl font-bold text-white uppercase tracking-tight leading-none">Thiết Kế <br />Ý Tưởng 2D/3D</h3>
              <p className="text-sm text-gray-300 font-light leading-relaxed max-w-xl pt-4 border-t border-white/10">Nghiên cứu sâu phân khúc khách hàng, triển khai layout phân chia công năng mặt bằng 2D và tiến hành dựng phối cảnh không gian 3D trực quan, sinh động.</p>
            </div>
          </div>
          <div className="group relative flex-1 hover:flex-[5] transition-all duration-700 ease-in-out border-b md:border-b-0 md:border-r border-white/5 overflow-hidden h-full cursor-pointer">
            <div className="absolute inset-0 bg-black/75 group-hover:bg-black/50 transition-colors duration-700 z-10"></div>
            <img src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1200" alt="Giai đoạn 3" className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-102 transition-all duration-700 ease-in-out z-0 block" />
            <div className="absolute inset-0 flex items-center justify-center font-mono text-[14vw] md:text-[8vw] font-black text-white/[0.03] group-hover:opacity-0 transition-opacity duration-500 z-0 select-none">03</div>
            <div className="absolute top-1/2 -translate-y-1/2 left-8 right-8 md:left-16 md:right-16 z-20 md:opacity-0 md:translate-x-8 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-600 ease-out delay-100 space-y-4 pointer-events-none">
              <span className="font-mono text-xs tracking-[0.4em] text-white/40 uppercase block">Giai đoạn 03</span>
              <h3 className="text-4xl md:text-6xl font-bold text-white uppercase tracking-tight leading-none">Kỹ Thuật <br />Thi Công M.E.P</h3>
              <p className="text-sm text-gray-300 font-light leading-relaxed max-w-xl pt-4 border-t border-white/10">Bóc tách chi tiết kỹ thuật hệ thống điện nước (MEP), kết cấu hạ tầng cứng, chỉ định chính xác mã chủng loại vật liệu và quy cách hoàn thiện nội thất.</p>
            </div>
          </div>
          <div className="group relative flex-1 hover:flex-[5] transition-all duration-700 ease-in-out border-b md:border-b-0 md:border-r border-white/5 overflow-hidden h-full cursor-pointer">
            <div className="absolute inset-0 bg-black/75 group-hover:bg-black/50 transition-colors duration-700 z-10"></div>
            <img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1200" alt="Giai đoạn 4" className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-102 transition-all duration-700 ease-in-out z-0 block" />
            <div className="absolute inset-0 flex items-center justify-center font-mono text-[14vw] md:text-[8vw] font-black text-white/[0.03] group-hover:opacity-0 transition-opacity duration-500 z-0 select-none">04</div>
            <div className="absolute top-1/2 -translate-y-1/2 left-8 right-8 md:left-16 md:right-16 z-20 md:opacity-0 md:translate-x-8 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-600 ease-out delay-100 space-y-4 pointer-events-none">
              <span className="font-mono text-xs tracking-[0.4em] text-white/40 uppercase block">Giai đoạn 04</span>
              <h3 className="text-4xl md:text-6xl font-bold text-white uppercase tracking-tight leading-none">Dự Toán <br />Chi Tiết BOQ</h3>
              <p className="text-sm text-gray-300 font-light leading-relaxed max-w-xl pt-4 border-t border-white/10">Tiến hành lập bảng khối lượng chi tiết vật tư (BOQ), lên dự toán chi tiết từng phân mục cấu thành công trình nhằm tối ưu hóa bài toán tài chính.</p>
            </div>
          </div>
          {/* GIAI ĐOẠN 05: TRIỂN KHAI XÂY DỰNG */}
          <div className="group relative flex-1 hover:flex-[5] transition-all duration-700 ease-in-out border-b md:border-b-0 md:border-r border-white/5 overflow-hidden h-full cursor-pointer">
            <div className="absolute inset-0 bg-black/75 group-hover:bg-black/40 transition-colors duration-700 z-10"></div>
            
            {/* SỬA DÒNG IMG NÀY: Thay đổi link ảnh chất lượng cao và nâng opacity lên cho rõ nét */}
            <img 
              src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=1200" 
              alt="Giai đoạn 5" 
              className="absolute inset-0 w-full h-full object-cover grayscale-0 group-hover:scale-105 transition-all duration-700 ease-in-out z-0 block opacity-60" 
            />
            
            <div className="absolute inset-0 flex items-center justify-center font-mono text-[14vw] md:text-[8vw] font-black text-white/[0.03] group-hover:opacity-0 transition-opacity duration-500 z-0 select-none">05</div>
            <div className="absolute top-1/2 -translate-y-1/2 left-8 right-8 md:left-16 md:right-16 z-20 md:opacity-0 md:translate-x-8 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-600 ease-out delay-100 space-y-4 pointer-events-none">
              <span className="font-mono text-xs tracking-[0.4em] text-white/40 uppercase block">Giai đoạn 05</span>
              <h3 className="text-4xl md:text-6xl font-bold text-white uppercase tracking-tight leading-none">Triển Khai <br />Xây Dựng</h3>
              <p className="text-sm text-gray-300 font-light leading-relaxed max-w-xl pt-4 border-t border-white/10">Triển khai xây dựng trực tiếp tại công trường, bố trí đội ngũ kỹ sư giám sát chất lượng nghiêm ngặt, đảm bảo độ sắc nét chuẩn chỉ.</p>
            </div>
          </div>
          <div className="group relative flex-1 hover:flex-[5] transition-all duration-700 ease-in-out overflow-hidden h-full cursor-pointer">
            <div className="absolute inset-0 bg-black/75 group-hover:bg-black/50 transition-colors duration-700 z-10"></div>
            <img src="https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1200" alt="Giai đoạn 6" className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-102 transition-all duration-700 ease-in-out z-0 block" />
            <div className="absolute inset-0 flex items-center justify-center font-mono text-[14vw] md:text-[8vw] font-black text-white/[0.03] group-hover:opacity-0 transition-opacity duration-500 z-0 select-none">06</div>
            <div className="absolute top-1/2 -translate-y-1/2 left-8 right-8 md:left-16 md:right-16 z-20 md:opacity-0 md:translate-x-8 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-600 ease-out delay-100 space-y-4 pointer-events-none">
              <span className="font-mono text-xs tracking-[0.4em] text-white/40 uppercase block">Giai đoạn 06</span>
              <h3 className="text-4xl md:text-6xl font-bold text-white uppercase tracking-tight leading-none">Nghiệm Thu <br />& Bàn Giao</h3>
              <p className="text-sm text-gray-300 font-light leading-relaxed max-w-xl pt-4 border-t border-white/10">Tiến hành tổng vệ sinh công nghiệp toàn bộ công trình, nghiệm thu chi tiết khối lượng thực tế, bàn giao chìa khóa và kích hoạt bảo hành.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION ESTIMATOR CALCULATOR */}
      <section id="calculator" className="bg-[#050505] py-24 px-6 md:px-16 border-t border-white/5 select-none scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase block mb-3">Estimator Tool</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white uppercase">Bộ Tính Giá Dự Toán</h2>
            <div className="w-12 h-[1px] bg-white/20 mt-4"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            <div className="lg:col-span-7 space-y-8 bg-zinc-900/20 border border-white/5 p-8 py-12 rounded-2xl backdrop-blur-sm flex flex-col justify-between">
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xs tracking-widest uppercase font-semibold text-white/60 block">1. Nhập diện tích mặt bằng (m²)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={area}
                      min="10" 
                      max="5000" 
                      onChange={(e) => setArea(parseFloat(e.target.value) || 0)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white font-medium text-lg focus:outline-none focus:border-white/40 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-mono" 
                    />
                    <span className="absolute right-5 top-1/2 transform -translate-y-1/2 text-sm tracking-wider text-white/40 font-medium font-sans">M²</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-xs tracking-widest uppercase font-semibold text-white/60 block">2. Chọn gói giải pháp chiến lược</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Card 01: Gói Concept */}
                    <div 
                      onClick={() => setSelectedPackage("concept")}
                      className={`package-card relative border rounded-xl p-4 cursor-pointer transition-all block select-none ${selectedPackage === 'concept' ? 'border-white bg-white/5' : 'border-white/10 bg-black/20 hover:border-white/30'}`}
                    >
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold tracking-wider text-white uppercase">Gói Concept</span>
                          <span className="text-[10px] text-white/40 font-mono">01</span>
                        </div>
                        <p className="text-[11px] text-gray-400 font-light leading-tight">Thiết kế phối cảnh 3D chuyên sâu F&B.</p>
                        <div className="text-xs font-semibold text-white pt-1 font-mono">
                          {formatVND(priceList.concept.price)} <span className="text-[10px] text-white/40 font-normal font-sans">/ m²</span>
                        </div>
                      </div>
                    </div>

                    {/* Card 02: Gói Thi Công */}
                    <div 
                      onClick={() => setSelectedPackage("build")}
                      className={`package-card relative border rounded-xl p-4 cursor-pointer transition-all block select-none ${selectedPackage === 'build' ? 'border-white bg-white/5' : 'border-white/10 bg-black/20 hover:border-white/30'}`}
                    >
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold tracking-wider text-white uppercase">Gói Thi Công</span>
                          <span className="text-[10px] text-white/40 font-mono">02</span>
                        </div>
                        <p className="text-[11px] text-gray-400 font-light leading-tight">Thi công trọn gói phần thô & nội thất cứng.</p>
                        <div className="text-xs font-semibold text-white pt-1 font-mono">
                          {formatVND(priceList.build.price)} <span className="text-[10px] text-white/40 font-normal font-sans">/ m²</span>
                        </div>
                      </div>
                    </div>

                    {/* Card 03: Gói Combo Premium */}
                    <div 
                      onClick={() => setSelectedPackage("combo")}
                      className={`package-card relative border rounded-xl p-4 cursor-pointer transition-all block select-none ${selectedPackage === 'combo' ? 'border-white bg-white/5' : 'border-white/10 bg-black/20 hover:border-white/30'}`}
                    >
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold tracking-wider text-white uppercase">Gói Combo Premium</span>
                          <span className="text-[10px] text-white/40 font-mono">03</span>
                        </div>
                        <p className="text-[11px] text-gray-400 font-light leading-tight">Thiết kế, thi công & Setup quầy bar trọn gói.</p>
                        <div className="text-xs font-semibold text-white pt-1 font-mono">
                          {formatVND(priceList.combo.price)} <span className="text-[10px] text-white/40 font-normal font-sans">/ m²</span>
                        </div>
                      </div>
                    </div>

                    {/* Card 04: Cảnh Quan Nghệ Thuật */}
                    <div 
                      onClick={() => setSelectedPackage("landscape")}
                      className={`package-card relative border rounded-xl p-4 cursor-pointer transition-all block select-none ${selectedPackage === 'landscape' ? 'border-white bg-white/5' : 'border-white/10 bg-black/20 hover:border-white/30'}`}
                    >
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold tracking-wider text-white uppercase">Cảnh Quan Nghệ Thuật</span>
                          <span className="text-[10px] text-white/40 font-mono">04</span>
                        </div>
                        <p className="text-[11px] text-gray-400 font-light leading-tight">Quy hoạch sinh thái & hồ cá Koi nghệ thuật.</p>
                        <div className="text-xs font-semibold text-white pt-1 font-mono">
                          {formatVND(priceList.landscape.price)} <span className="text-[10px] text-white/40 font-normal font-sans">/ m²</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>

            {/* HÓA ĐƠN CHI TIẾT BÊN PHẢI */}
            <div className="lg:col-span-5 bg-white text-black p-6 md:p-8 rounded-2xl shadow-2xl flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-5">
                <div className="text-center pb-4 border-b border-dashed border-neutral-300 flex flex-col items-center justify-center space-y-2">
                  <img src="/assets/pic/logo3.png" alt="MAC Logo Estimate" className="w-28 h-auto object-contain select-none pointer-events-none invert mx-auto block" />
                  <p className="text-[8px] uppercase tracking-[0.25em] text-neutral-400 font-semibold">More Artistic Concept</p>
                </div>
                <div className="space-y-2.5 text-xs border-b border-dashed border-neutral-300 pb-4">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Quy mô mặt bằng:</span>
                    <span className="font-bold font-mono" id="res-area">{area} m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Giải pháp lựa chọn:</span>
                    <span className="font-bold uppercase tracking-wide text-right max-w-[180px] leading-tight" id="res-package">{currentPackage.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Đơn giá định biên:</span>
                    <span className="font-medium font-mono" id="res-unit-price">{formatVND(currentPackage.price)} / m²</span>
                  </div>
                </div>
                <div className="space-y-2 text-xs text-neutral-600 border-b border-dashed border-neutral-300 pb-4">
                  <div className="flex justify-between">
                    <span>Chi phí cơ sở thô phẳng:</span>
                    <span className="font-mono" id="res-base-cost">{formatVND(baseCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dự phòng BOQ nội bộ (5%):</span>
                    <span className="font-mono" id="res-boq-cost">{formatVND(boqCost)}</span>
                  </div>
                </div>
              </div>
              <div className="pt-4 space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-neutral-800 uppercase">Tổng dự toán sơ bộ:</span>
                  <span className="text-xl font-bold font-mono tracking-tight text-neutral-950" id="res-total-price">{formatVND(totalCost)}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <a href="https://zalo.me/0375075975" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-neutral-950 hover:bg-neutral-800 text-white text-[11px] font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all shadow-md text-center leading-none">
                    <img src="/assets/pic/zalo.png" alt="Zalo" className="w-4 h-4 object-contain select-none pointer-events-none block" />
                    Báo giá chi tiết
                  </a>
                  <a href="/packages" className="flex items-center justify-center gap-2 bg-neutral-100 border border-neutral-300 hover:bg-neutral-200 text-neutral-900 text-[11px] font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all text-center leading-none">
                    <img src="/assets/pic/contract.png" alt="Contract" className="w-4 h-4 object-contain select-none pointer-events-none block" />
                    Báo giá theo gói
                  </a>
                </div>
                <p className="text-[8px] italic text-neutral-400 text-center border-t border-neutral-100 pt-3 select-none">* Bảng tính mang giá trị hoạch định ngân sách nội bộ độc quyền của MAC *</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER SYSTEMS */}
      <footer id="contact" className="bg-black py-20 px-6 md:px-16 border-t border-white/5 w-full scroll-mt-20">
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-16 text-sm text-gray-500 font-light leading-relaxed">
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
            <button className="bg-white text-black font-bold uppercase tracking-widest text-xs px-6 py-4 rounded-xl w-full hover:bg-gray-200 transition-all cursor-pointer">Gửi yêu cầu báo giá cho MAC</button>
          </div>
        </div>
      </footer>

    </div>
  );
}