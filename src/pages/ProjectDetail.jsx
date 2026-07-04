import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

export default function ProjectDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [projectData, setProjectData] = useState(null);

  // =========================================================================
  // 1. THUẬT TOÁN BÓC TÁCH ID TỪ URL VÀ NẠP SỐ LIỆU TỪ FILE JSON
  // =========================================================================
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const projectId = searchParams.get('id') || 'themonic';

    async function loadProjectDetail() {
      try {
        const response = await fetch('/assets/data/projects.json');
        const database = await response.json();
        const data = database[projectId];
        if (data) {
          setProjectData(data);
        }
      } catch (error) {
        console.error("Lỗi lốt kho dữ liệu JSON:", error);
      }
    }
    loadProjectDetail();

    // Hiệu ứng GSAP nạp thanh Header trơn tru lúc vào trang
    gsap.fromTo("header", { y: -20, opacity: 0 }, { duration: 1, y: 0, opacity: 1, ease: "power2.out" });
  }, [location.search]);

  // =========================================================================
  // 2. KÍCH HOẠT HIỆU ỨNG FADE-IN CUỘN MƯỢT CHO CÁC PHÂN KHU
  // =========================================================================
  useEffect(() => {
    if (projectData) {
      document.querySelectorAll('.project-fade').forEach((element) => {
        gsap.fromTo(element,
          { opacity: 0, y: 30 },
          {
            scrollTrigger: {
              trigger: element,
              start: "top 85%",
              toggleActions: "play none none none"
            },
            duration: 1.2,
            opacity: 1,
            y: 0,
            ease: "power3.out"
          }
        );
      });
    }
  }, [projectData]);

  // Hàm xử lý cuộn mượt nội khu xuống phân khu Gallery ảnh
  const handleScrollToGallery = (e) => {
    e.preventDefault();
    const targetElement = document.querySelector('#gallery');
    if (targetElement) {
      gsap.to(window, { duration: 1.5, scrollTo: { y: targetElement, offsetY: 112 }, ease: "power4.out" });
    }
  };

  // Màn hình chờ tối giản đúng gu MAC
  if (!projectData) {
    return (
      <div className="w-full min-h-screen bg-[#0b0b0b] flex items-center justify-center text-white/30 text-xs tracking-widest uppercase font-sans">
        Đang nạp dữ liệu không gian kiến trúc...
      </div>
    );
  }

  // Thuật toán rẽ nhánh chuẩn hóa đường dẫn ảnh tĩnh ra thư mục public
  const checkPath = (p) => {
    if (!p) return '';
    return p.startsWith('http') ? p : '/' + p.replace('../assets/pic/', 'assets/pic/').replace('../pic/', 'assets/pic/');
  };

  return (
    <div className="w-full min-h-screen bg-[#0b0b0b] text-gray-300 antialiased overflow-x-hidden font-sans">

      {/* ========================================================================= */}
      {/* HEADER NAV TOP (Bung full viền 100%) */}
      {/* ========================================================================= */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0b0b0b] border-b border-white/5 px-6 py-5 md:px-16 flex items-center justify-between w-full">
        <div onClick={() => navigate('/home')} className="flex flex-col cursor-pointer select-none group">
          <span className="text-2xl font-bold tracking-widest text-white leading-none group-hover:text-neutral-400 transition-colors">MAC</span>
          <span className="text-[9px] tracking-[0.2em] text-white/40 uppercase mt-1">More Artistic Concept</span>
        </div>
        <nav className="hidden md:flex items-center gap-10 text-xs tracking-widest uppercase font-medium text-gray-400">
          <button onClick={() => navigate('/home#about')} className="hover:text-white transition-colors bg-transparent border-none cursor-pointer outline-none uppercase font-medium tracking-widest text-xs">Giới Thiệu</button>
          <button onClick={() => navigate('/home#services')} className="hover:text-white transition-colors bg-transparent border-none cursor-pointer outline-none uppercase font-medium tracking-widest text-xs">Dịch Vụ</button>
          <button onClick={() => navigate('/portfolio')} className="hover:text-white transition-colors text-white bg-transparent border-none cursor-pointer outline-none uppercase font-medium tracking-widest text-xs">Dự Án</button>
          <button onClick={() => navigate('/home#process')} className="hover:text-white transition-colors bg-transparent border-none cursor-pointer outline-none uppercase font-medium tracking-widest text-xs">Quy Trình</button>
          <button onClick={() => navigate('/home#calculator')} className="hover:text-white transition-colors bg-transparent border-none cursor-pointer outline-none uppercase font-medium tracking-widest text-xs">Bộ Tính Giá</button>
        </nav>
      </header>

      {/* Khoảng đệm tránh bị header che khuất */}
      <div className="h-28"></div>

      {/* ========================================================================= */}
      {/* KHỐI THÔNG TIN DỰ ÁN DYNAMIC */}
      {/* ========================================================================= */}
      <main className="max-w-6xl mx-auto px-6 md:px-12 py-16 w-full">
        
        {/* Breadcrumb định vị */}
        <div className="text-[10px] tracking-widest text-white/30 uppercase mb-6 text-left select-none">
          <button onClick={() => navigate('/portfolio')} className="hover:text-white transition-colors bg-transparent border-none cursor-pointer font-semibold uppercase tracking-widest text-[10px]">Dự án nổi bật</button>
          <span className="mx-2">/</span>
          <span id="breadcrumb-name" className="text-white/60">{projectData.breadcrumb}</span>
        </div>

        {/* Khối Grid chia hai phân khu nội dung thông số và mô tả */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 border-b border-white/5 pb-16">
          
          {/* Cột trái: Bảng thông số kỹ thuật phần cứng */}
          <div className="space-y-6 text-left">
            <h1 id="project-name" className="text-4xl font-bold tracking-tight text-white uppercase leading-tight select-none" dangerouslySetInnerHTML={{ __html: projectData.name }}></h1>
            <div className="space-y-3 pt-4 border-t border-white/5 text-xs tracking-wide">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/40 uppercase">Dự án</span>
                <span id="info-type" className="text-white font-medium">{projectData.type}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/40 uppercase">Vị trí</span>
                <span id="info-location" className="text-white font-medium text-right">{projectData.location}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/40 uppercase">Diện tích</span>
                <span id="info-area" className="text-white font-medium">{projectData.area}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-white/40 uppercase">Năm hoàn thành</span>
                <span id="info-year" className="text-white font-medium">{projectData.year}</span>
              </div>
            </div>
          </div>

          {/* Cột phải: Đoạn văn mô tả triết lý thiết kế và link cuộn */}
          <div className="md:col-span-2 space-y-6 md:pl-8 flex flex-col justify-between text-left">
            <div className="space-y-6">
              <h4 id="project-subtitle" className="text-sm md:text-base tracking-[0.2em] text-white uppercase font-bold">{projectData.subtitle}</h4>
              <p id="project-desc1" className="text-base md:text-lg text-white/85 leading-relaxed font-light tracking-wide">{projectData.desc1}</p>
              <p id="project-desc2" className="text-sm md:text-base text-gray-400 leading-relaxed font-light tracking-wide border-l-2 border-white/20 pl-5">{projectData.desc2}</p>
            </div>
            
            <div className="pt-6">
              <a 
                href="#gallery" 
                onClick={handleScrollToGallery}
                className="inline-flex items-center gap-2 text-xs tracking-widest uppercase font-semibold text-white/50 hover:text-white transition-colors"
              >
                <span>Khám phá các góc không gian</span>
                <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                </svg>
              </a>
            </div>
          </div>

        </div>
      </main>

      {/* ========================================================================= */}
      {/* SECTION GALLERY 4 ẢNH CINEMATIC */}
      {/* ========================================================================= */}
      <section id="gallery" className="max-w-5xl mx-auto px-6 md:px-12 pb-32 space-y-12 scroll-mt-24">
        
        {/* Ảnh 01 lớn (16/9) */}
        <div className="project-fade group relative overflow-hidden rounded-2xl bg-zinc-900 border border-white/5 aspect-[16/9]">
          <img id="gallery-img1" src={checkPath(projectData.img1)} alt={`${projectData.breadcrumb} 01`} className="w-full h-full object-cover group-hover:scale-101 transition-transform duration-1000 block" />
        </div>

        {/* Cặp ảnh 02 và 03 đối xứng (Square) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          <div className="project-fade group relative overflow-hidden rounded-2xl bg-zinc-900 border border-white/5 aspect-square">
            <img id="gallery-img2" src={checkPath(projectData.img2)} alt={`${projectData.breadcrumb} 02`} className="w-full h-full object-cover group-hover:scale-101 transition-transform duration-1000 block" />
          </div>
          <div className="project-fade group relative overflow-hidden rounded-2xl bg-zinc-900 border border-white/5 aspect-square">
            <img id="gallery-img3" src={checkPath(projectData.img3)} alt={`${projectData.breadcrumb} 03`} className="w-full h-full object-cover group-hover:scale-101 transition-transform duration-1000 block" />
          </div>
        </div>

        {/* Khối trích dẫn Quote thương hiệu */}
        <div className="project-fade py-12 text-center max-w-3xl mx-auto select-none">
          <p id="project-quote" className="text-sm md:text-base italic text-white/60 font-light leading-relaxed tracking-wide">
            "{projectData.quote}"
          </p>
        </div>

        {/* Ảnh 04 chốt hạ (16/9) */}
        <div className="project-fade group relative overflow-hidden rounded-2xl bg-zinc-900 border border-white/5 aspect-[16/9]">
          <img id="gallery-img4" src={checkPath(projectData.img4)} alt={`${projectData.breadcrumb} 04`} className="w-full h-full object-cover group-hover:scale-101 transition-transform duration-1000 block" />
        </div>

        {/* Nút điều hướng quay lại danh mục Portfolio */}
        <div className="project-fade flex justify-center pt-12">
          <button 
            onClick={() => navigate('/portfolio')}
            className="inline-flex items-center gap-3 border border-white/20 bg-black/20 backdrop-blur-sm hover:bg-white hover:text-black hover:border-white px-8 py-4 rounded-full text-xs tracking-widest uppercase transition-all duration-300 cursor-pointer outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 transform rotate-180">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
            Quay lại danh mục dự án
          </button>
        </div>

      </section>

      {/* ========================================================================= */}
      {/* FOOTER */}
      {/* ========================================================================= */}
      <footer id="contact" className="bg-black py-20 px-6 md:px-16 border-t border-white/5 w-full text-left">
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
            <p>• Thiết kế cảnh quan nghệ thuật</p>
          </div>
        </div>
      </footer>

    </div>
  );
}