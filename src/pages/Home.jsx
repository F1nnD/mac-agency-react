import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

export default function Home() {
  const navigate = useNavigate();

  // =========================================================================
  // 1. QUẢN LÝ TRẠNG THÁI (STATES) CHO SLIDE NỀN, PORTFOLIO & 3 CHẾ ĐỘ TÍNH GIÁ
  // =========================================================================
  const [homeCurrentIdx, setHomeCurrentIdx] = useState(0);
  const [portfolioData, setPortfolioData] = useState([]); 
  
  // Quản lý Chế độ Tab: 'draft-filter', 'quick-calc', 'ai-chat'
  const [calcMode, setCalcMode] = useState('draft-filter');

  // States dành cho Tab 2 (Tính giá nhanh)
  const [priceList, setPriceList] = useState({
    concept: { name: "Gói Thiết Kế Concept", price: 350000 },
    build: { name: "Gói Thi Công Trọn Gói", price: 3500000 },
    combo: { name: "Combo Premium Thượng Lưu", price: 4200000 },
    landscape: { name: "Cảnh Quan Nghệ Thuật", price: 800000 }
  });
  const [selectedPackage, setSelectedPackage] = useState("concept");

  // States dành cho Tab 1 (Lọc Draft Layout)
  const [area, setArea] = useState(100);
  const [siteFilter, setSiteFilter] = useState('all');
  const [draftList, setDraftList] = useState([]);
  const [selectedDraft, setSelectedDraft] = useState(null);

  // 🛠️ STATES TAB 3: AI STUDIO & CHAT ĐA NGÔN NGỮ
  const [aiSpaceType, setAiSpaceType] = useState('Quán Kafe & Trà Sữa');
  const [aiStyle, setAiStyle] = useState('Industrial');
  const [aiArea, setAiArea] = useState(120);
  const [chatInput, setChatInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  // =========================================================================
  // 2. VÒNG ĐỜI COMPONENT (EFFECTS)
  // =========================================================================
  useEffect(() => {
    const interval = setInterval(() => {
      setHomeCurrentIdx((prev) => (prev + 1) % 3);
    }, 5000);

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

    async function fetchPackages() {
      try {
        const response = await fetch('http://localhost:5000/api/packages');
        if (response.ok) {
          const data = await response.json();
          const updatedPriceList = { ...priceList };

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

    async function fetchDraftLayouts() {
      try {
        const response = await fetch('http://localhost:5000/api/drafts');
        if (response.ok) {
          const data = await response.json();
          setDraftList(data);
          if (data && data.length > 0) setSelectedDraft(data[0]);
        }
      } catch (error) {
        console.error("Lỗi tải danh sách Draft:", error);
      }
    }

    fetchPortfolio();
    fetchPackages();
    fetchDraftLayouts();

    return () => {
      clearInterval(interval);
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  useEffect(() => {
    const currentImg = document.querySelector('.home-slide.active .slide-img');
    if (currentImg) {
      gsap.fromTo(currentImg, 
        { scale: 1.05, filter: "blur(4px)" }, 
        { duration: 2, scale: 1, filter: "blur(0px)", ease: "power2.out" }
      );
    }
  }, [homeCurrentIdx]);

  const handleSmoothScroll = (e, targetId) => {
    e.preventDefault();
    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      gsap.to(window, { duration: 1.5, scrollTo: { y: targetElement, offsetY: 80 }, ease: "power4.out" });
    }
  };

  const formatVND = (amount) => amount ? amount.toLocaleString('vi-VN') + 'đ' : '0đ';

  // THUẬT TOÁN LỌC DRAFT TAB 1
  const filteredDrafts = draftList.filter(draft => {
    const min = draft.minArea || 0;
    const max = draft.maxArea || 5000;
    const isAreaMatch = area >= min && area <= max;
    const isSiteMatch = siteFilter === 'all' || draft.siteStatus === 'all' || draft.siteStatus === siteFilter;
    return isAreaMatch && isSiteMatch;
  });

  useEffect(() => {
    if (filteredDrafts.length > 0) {
      if (!selectedDraft || !filteredDrafts.some(d => d._id === selectedDraft._id)) {
        setSelectedDraft(filteredDrafts[0]);
      }
    } else {
      setSelectedDraft(null);
    }
  }, [area, siteFilter, draftList]);

  // HÀM 1: TẠO PHỐI CẢNH TỪ FORM CHỌN TĨNH
  const handleGenerateFromForm = async (e) => {
    e.preventDefault();
    setAiLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/ai-consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style: aiStyle, area: aiArea, spaceType: aiSpaceType })
      });
      if (res.ok) {
        const data = await res.json();
        setAiResult(data);
      }
    } catch (err) {
      console.error("Lỗi AI Form:", err);
    } finally {
      setAiLoading(false);
    }
  };

  // HÀM 2: CHAT TRỰC TIẾP ĐA NGÔN NGỮ VỚI GEMINI AI
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || aiLoading) return;

    const msg = chatInput.trim();
    setChatInput('');
    setAiLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/ai-consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: msg })
      });
      if (res.ok) {
        const data = await res.json();
        setAiResult(data);
      }
    } catch (err) {
      console.error("Lỗi AI Chat:", err);
    } finally {
      setAiLoading(false);
    }
  };

  // PHÉP TÍNH TAB 1 & TAB 2
  const draftUnitPrice = selectedDraft ? selectedDraft.basePricePerM2 : 0;
  const draftBaseCost = area * draftUnitPrice;
  const draftBoqCost = draftBaseCost * 0.05;
  const draftTotalCost = draftBaseCost + draftBoqCost;

  const currentPackage = priceList[selectedPackage];
  const quickBaseCost = area * (currentPackage ? currentPackage.price : 0);
  const quickBoqCost = quickBaseCost * 0.05;
  const quickTotalCost = quickBaseCost + quickBoqCost;

  return (
    <div className="w-full text-gray-300 antialiased overflow-x-hidden font-sans bg-[#0b0b0b]">

      {/* HEADER BAR */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0b0b0b] border-b border-white/5 px-6 py-5 md:px-16 flex items-center justify-between w-full">
        <div className="flex items-center select-none">
          <button 
            onClick={() => navigate('/')} 
            className="text-white/40 hover:text-white mr-3 md:mr-4 transform hover:-translate-x-1 transition-all duration-300 ease-out flex items-center justify-center bg-transparent border-none outline-none cursor-pointer"
          >
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
          <a href="#portfolio" onClick={(e) => handleSmoothScroll(e, '#portfolio')} className="hover:text-white transition-colors">Dự Án</a>
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
      <section id="about" className="fade-in-section py-28 px-6 md:px-16 w-full border-t border-white/5 grid grid-cols-1 md:grid-cols-3 gap-16 scroll-mt-20 text-left">
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
      <section id="portfolio" className="fade-in-section py-24 px-6 md:px-16 w-full scroll-mt-20 text-left">
        <div className="flex items-end justify-between border-b border-white/5 mb-12 pb-5">
          <div>
            <span className="text-xs tracking-[0.3em] text-white/40 uppercase block mb-1">Selected Works</span>
            <h2 className="text-3xl font-light text-white">Dự Án Nổi Bật</h2>
          </div>
          <a href="/portfolio" className="text-xs tracking-widest uppercase border border-white/10 hover:border-white px-6 py-2.5 rounded-full text-white transition-all">Xem tất cả</a>
        </div>
        <div id="portfolio-grid" className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          {Array.isArray(portfolioData) && portfolioData.map((proj, index) => {
            if (!proj) return null;
            const uniqueReactKey = proj._id || `home-proj-${index}`;
            const colSpan = (index % 3 === 0) ? 'md:col-span-2 aspect-[16/9]' : 'md:col-span-1';
            
            const checkImg = (p) => {
              if (!p) return '';
              if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('/')) return p;
              return '/' + p.replace('../assets/pic/', 'assets/pic/').replace('../pic/', 'assets/pic/');
            };

            const fixImg1 = checkImg(proj.img1);
            const fixImg2 = checkImg(proj.img2 || proj.img1);

            return (
              <div key={uniqueReactKey} className={`${colSpan} group relative overflow-hidden rounded-2xl bg-zinc-900 border border-white/5 cursor-default min-h-[350px]`}>
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
                  
                  <button 
                    onClick={() => navigate(`/project-detail?id=${proj.breadcrumb}`)} 
                    className="inline-flex items-center gap-2 text-xs tracking-widest uppercase font-semibold text-white bg-black/50 border border-white/20 backdrop-blur-sm px-5 py-3 rounded-full opacity-100 translate-y-0 md:opacity-0 md:translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:bg-white hover:text-black hover:scale-105 hover:border-white transition-all duration-500 ease-out shadow-lg cursor-pointer z-30 mt-4 md:mt-0 outline-none"
                  >
                    <span>Xem chi tiết</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 🛠️ BỔ SUNG LẠI SECTION QUY TRÌNH DỰ ÁN (#process) HOÀN CHỈNH */}
      <section id="process" className="fade-in-section py-24 px-6 md:px-16 w-full border-t border-white/5 scroll-mt-20 text-left bg-[#080808]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
            <div>
              <span className="text-[10px] tracking-[0.3em] text-white/40 uppercase block mb-1 font-mono">Execution Flow</span>
              <h2 className="text-3xl font-light text-white uppercase">Quy Trình Triển Khai Dự Án</h2>
            </div>
            <p className="text-xs text-gray-500 font-light max-w-md">
              Mô hình quản trị công trình chuẩn mực từ khảo sát thực địa đến bàn giao chìa khóa trao tay.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-8 bg-zinc-900/30 border border-white/5 rounded-2xl space-y-4 hover:border-white/20 transition-all">
              <span className="text-3xl font-bold font-mono text-white/20">01</span>
              <h3 className="text-base font-bold text-white uppercase">Khảo Sát & Định Biên</h3>
              <p className="text-xs text-gray-400 font-light leading-relaxed">
                Đo đạc hiện trạng, phân tích vị trí địa lý, lập bảng định biên dự toán tài chính tối ưu cho Chủ Đầu Tư.
              </p>
            </div>

            <div className="p-8 bg-zinc-900/30 border border-white/5 rounded-2xl space-y-4 hover:border-white/20 transition-all">
              <span className="text-3xl font-bold font-mono text-white/20">02</span>
              <h3 className="text-base font-bold text-white uppercase">Thiết Kế Concept 3D</h3>
              <p className="text-xs text-gray-400 font-light leading-relaxed">
                Khái quát không gian kiến trúc độc bản, bố trí công năng tối ưu 85% trải nghiệm khách hàng F&B.
              </p>
            </div>

            <div className="p-8 bg-zinc-900/30 border border-white/5 rounded-2xl space-y-4 hover:border-white/20 transition-all">
              <span className="text-3xl font-bold font-mono text-white/20">03</span>
              <h3 className="text-base font-bold text-white uppercase">Thi Công Trọn Gói</h3>
              <p className="text-xs text-gray-400 font-light leading-relaxed">
                Hiện thực hóa bản vẽ CAD ra thực địa công trường, kiểm soát chuẩn xác từng chủng loại vật liệu.
              </p>
            </div>

            <div className="p-8 bg-zinc-900/30 border border-white/5 rounded-2xl space-y-4 hover:border-white/20 transition-all">
              <span className="text-3xl font-bold font-mono text-white/20">04</span>
              <h3 className="text-base font-bold text-white uppercase">Setup & Bàn Giao</h3>
              <p className="text-xs text-gray-400 font-light leading-relaxed">
                Hoàn thiện chi tiết nội thất, nghiệm thu chất lượng phần cứng và chuyển giao vận hành thương hiệu.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 🚀 SECTION ESTIMATOR CALCULATOR - TÍNH NĂNG 3 CHẾ ĐỘ PHÂN LUỒNG THÔNG MINH */}
      {/* ========================================================================= */}
      <section id="calculator" className="bg-[#050505] py-24 px-6 md:px-16 border-t border-white/5 select-none scroll-mt-20 text-left w-full">
        <div className="max-w-7xl mx-auto space-y-10">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
            <div>
              <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase block mb-2 font-mono">Multi-Option Estimator</span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white uppercase">Bộ Tính Giá Dự Toán Công Trình</h2>
            </div>

            {/* THANH CHUYỂN ĐỔI 3 TAB LỰA CHỌN PHONG CÁCH HOLOGRAM DARK MODE */}
            <div className="inline-flex p-1.5 bg-zinc-900/80 border border-white/10 rounded-2xl backdrop-blur-md shrink-0">
              <button
                onClick={() => setCalcMode('draft-filter')}
                className={`px-5 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-300 cursor-pointer outline-none ${calcMode === 'draft-filter' ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/10' : 'text-gray-400 hover:text-white'}`}
              >
                📐 Gợi Ý Draft Theo m²
              </button>
              <button
                onClick={() => setCalcMode('quick-calc')}
                className={`px-5 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-300 cursor-pointer outline-none ${calcMode === 'quick-calc' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                ⚡ Gói Định Biên Nhanh
              </button>
              <button
                onClick={() => setCalcMode('ai-chat')}
                className={`px-5 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-300 cursor-pointer outline-none ${calcMode === 'ai-chat' ? 'bg-emerald-400 text-black shadow-lg shadow-emerald-400/10' : 'text-gray-400 hover:text-white'}`}
              >
                🤖 AI Visual Studio & Chat
              </button>
            </div>
          </div>

          {/* TAB 1: GỢI Ý DRAFT THEO RÀNG BUỘC DIỆN TÍCH M2 VÀ HIỆN TRẠNG */}
          {calcMode === 'draft-filter' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch animate-fadeIn">
              <div className="lg:col-span-7 space-y-8 bg-zinc-900/20 border border-white/5 p-8 rounded-2xl backdrop-blur-sm flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs tracking-widest uppercase font-semibold text-white/60 block">1. Diện tích mặt bằng (m²)</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={area}
                          min="10" 
                          max="5000" 
                          onChange={(e) => setArea(parseFloat(e.target.value) || 0)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3.5 text-white font-medium text-lg focus:outline-none focus:border-amber-400/50 transition-colors font-mono" 
                        />
                        <span className="absolute right-5 top-1/2 transform -translate-y-1/2 text-xs tracking-wider text-white/40 font-medium">M²</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs tracking-widest uppercase font-semibold text-white/60 block">2. Hiện trạng thực tế</label>
                      <select 
                        value={siteFilter} 
                        onChange={(e) => setSiteFilter(e.target.value)} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-xs text-white focus:outline-none focus:border-amber-400/50 cursor-pointer font-sans"
                      >
                        <option value="all" className="bg-neutral-900 text-white">Tất cả hiện trạng</option>
                        <option value="dat-trong" className="bg-neutral-900 text-white">Xây trên đất trống</option>
                        <option value="nha-san" className="bg-neutral-900 text-white">Cải tạo nhà có sẵn</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs tracking-widest uppercase font-semibold text-amber-400 block">3. Draft Layout Phù Hợp Được Gợi Ý ({filteredDrafts.length})</label>
                      <span className="text-[10px] text-gray-500 font-mono">Dữ liệu từ Admin</span>
                    </div>

                    {filteredDrafts.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                        {filteredDrafts.map((draft, idx) => (
                          <div 
                            key={draft._id || idx}
                            onClick={() => setSelectedDraft(draft)}
                            className={`relative border rounded-xl p-4 cursor-pointer transition-all block select-none ${selectedDraft?._id === draft._id ? 'border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-400/5' : 'border-white/10 bg-black/20 hover:border-white/30'}`}
                          >
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold tracking-wider text-white uppercase truncate max-w-[80%]">{draft.name}</span>
                                <span className="text-[10px] text-amber-400 font-mono">Quy mô: {draft.minArea}-{draft.maxArea}m²</span>
                              </div>
                              <p className="text-[11px] text-gray-400 font-light leading-tight">Mặt bằng tối ưu không gian F&B.</p>
                              <div className="text-xs font-semibold text-white pt-1 font-mono">
                                {formatVND(draft.basePricePerM2)} <span className="text-[10px] text-white/40 font-normal font-sans">/ m²</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-black/30 border border-dashed border-white/10 rounded-2xl space-y-2">
                        <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Không tìm thấy Draft phù hợp khoảng {area}m²</p>
                        <p className="text-[11px] text-gray-500 font-light">Bạn hãy thử thay đổi số m² hoặc chọn Hiện trạng "Tất cả" nhen.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* BẢNG HÓA ĐƠN VÀ SƠ ĐỒ MẶT BẰNG PHÍA BÊN PHẢI (TAB 1) */}
              <div className="lg:col-span-5 bg-white text-black p-6 md:p-8 rounded-2xl shadow-2xl flex flex-col justify-between relative overflow-hidden space-y-6">
                <div className="space-y-4">
                  <div className="text-center pb-3 border-b border-dashed border-neutral-300">
                    <img src="/assets/pic/logo3.png" alt="MAC Logo" className="w-24 h-auto object-contain invert mx-auto block" />
                  </div>

                  {/* Sơ đồ mặt bằng thu nhỏ */}
                  <div className="w-full aspect-[16/10] bg-neutral-100 rounded-xl border border-neutral-200 overflow-hidden relative shadow-inner">
                    {selectedDraft ? (
                      <img src={selectedDraft.demoImage.startsWith('http') ? selectedDraft.demoImage : '/' + selectedDraft.demoImage} alt={selectedDraft.name} className="w-full h-full object-cover block" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400 italic">Vui lòng chọn một mẫu Draft...</div>
                    )}
                  </div>

                  <div className="space-y-2 text-xs border-b border-dashed border-neutral-300 pb-3">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Quy mô mặt bằng:</span>
                      <span className="font-bold font-mono">{area} m²</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Draft Layout chọn:</span>
                      <span className="font-bold uppercase tracking-wide text-right max-w-[180px] leading-tight truncate">{selectedDraft ? selectedDraft.name : 'Chưa chọn'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Đơn giá định biên:</span>
                      <span className="font-medium font-mono">{formatVND(draftUnitPrice)} / m²</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-neutral-600 border-b border-dashed border-neutral-300 pb-3">
                    <div className="flex justify-between">
                      <span>Chi phí cơ sở thô:</span>
                      <span className="font-mono">{formatVND(draftBaseCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dự phòng BOQ (5%):</span>
                      <span className="font-mono">{formatVND(draftBoqCost)}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-bold text-neutral-800 uppercase">Tổng dự toán sơ bộ:</span>
                      <span className="text-xl font-bold font-mono tracking-tight text-neutral-950">{formatVND(draftTotalCost)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-200">
                  <a
                    href="https://zalo.me/0375075975" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-neutral-900 hover:bg-black text-white text-center py-4 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-md flex items-center justify-center gap-2 cursor-pointer text-decoration-none"
                  >
                    <span>💬 Tư Vấn Chi Tiết Zalo</span>
                  </a>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: TÍNH GIÁ NHANH TRUYỀN THỐNG CỐ ĐỊNH */}
          {calcMode === 'quick-calc' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch animate-fadeIn">
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
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white font-medium text-lg focus:outline-none focus:border-white/40 transition-colors font-mono" 
                      />
                      <span className="absolute right-5 top-1/2 transform -translate-y-1/2 text-sm tracking-wider text-white/40 font-medium font-sans">M²</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-xs tracking-widest uppercase font-semibold text-white/60 block">2. Chọn gói giải pháp chiến lược</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
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

              {/* HÓA ĐƠN CHI TIẾT CỦA TAB 2 */}
              <div className="lg:col-span-5 bg-white text-black p-6 md:p-8 rounded-2xl shadow-2xl flex flex-col justify-between relative overflow-hidden space-y-6">
                <div className="space-y-5">
                  <div className="text-center pb-4 border-b border-dashed border-neutral-300 flex flex-col items-center justify-center space-y-2">
                    <img src="/assets/pic/logo3.png" alt="MAC Logo Estimate" className="w-28 h-auto object-contain invert mx-auto block" />
                    <p className="text-[8px] uppercase tracking-[0.25em] text-neutral-400 font-semibold">More Artistic Concept</p>
                  </div>
                  <div className="space-y-2.5 text-xs border-b border-dashed border-neutral-300 pb-4">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Quy mô mặt bằng:</span>
                      <span className="font-bold font-mono">{area} m²</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Giải pháp lựa chọn:</span>
                      <span className="font-bold uppercase tracking-wide text-right max-w-[180px] leading-tight">{currentPackage?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Đơn giá định biên:</span>
                      <span className="font-medium font-mono">{formatVND(currentPackage ? currentPackage.price : 0)} / m²</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs text-neutral-600 border-b border-dashed border-neutral-300 pb-4">
                    <div className="flex justify-between">
                      <span>Chi phí cơ sở thô phẳng:</span>
                      <span className="font-mono">{formatVND(quickBaseCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dự phòng BOQ nội bộ (5%):</span>
                      <span className="font-mono">{formatVND(quickBoqCost)}</span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-bold text-neutral-800 uppercase">Tổng dự toán sơ bộ:</span>
                      <span className="text-xl font-bold font-mono tracking-tight text-neutral-950">{formatVND(quickTotalCost)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a
                    href="https://zalo.me/0375075975" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-neutral-900 hover:bg-black text-white text-center py-3.5 px-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 shadow-md flex items-center justify-center gap-1.5 cursor-pointer text-decoration-none"
                  >
                    <span>💬 Tư Vấn Chi Tiết Zalo</span>
                  </a>
                  <button
                    onClick={() => navigate('/packages')}
                    className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-center py-3.5 px-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 border border-neutral-300 flex items-center justify-center gap-1 cursor-pointer outline-none"
                  >
                    <span>⚡ Các Gói Định Biên</span>
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* 🤖 TAB 3: AI VISUAL STUDIO & CHAT (ĐA NGÔN NGỮ GEMINI ĐÍNH KÈM FORM) */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {calcMode === 'ai-chat' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch animate-fadeIn">
              
              {/* CỘT TRÁI: FORM CHỌN TĨNH ĐỦ 3 MỤC + KHUNG CHAT CÂU THOẠI ĐA NGÔN NGỮ */}
              <div className="lg:col-span-6 space-y-6 bg-zinc-900/30 border border-emerald-500/20 p-6 md:p-8 rounded-2xl backdrop-blur-sm flex flex-col justify-between">
                
                {/* 1. KHUNG FORM CHỌN TĨNH */}
                <form onSubmit={handleGenerateFromForm} className="space-y-4 border-b border-emerald-500/20 pb-6">
                  <div className="space-y-1">
                    <span className="text-[10px] tracking-[0.3em] text-emerald-400 font-mono uppercase block">Cách 1: Tùy Chọn Nhanh Cố Định</span>
                    <h3 className="text-base font-bold text-white uppercase">Tạo Phối Cảnh & Bóc Giá AI</h3>
                  </div>

                  {/* Hàng 1: Loại hình công trình */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] tracking-wider uppercase font-semibold text-gray-400 block">1. Loại hình công trình mong muốn</label>
                    <select 
                      value={aiSpaceType} 
                      onChange={(e) => setAiSpaceType(e.target.value)}
                      className="w-full bg-black/50 border border-emerald-500/30 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer font-sans"
                    >
                      <option value="Nhà Ở Dân Dụng / Nhà Phố" className="bg-neutral-900 text-white">🏠 Nhà Ở Dân Dụng / Nhà Phố</option>
                      <option value="Biệt Thự Cao Cấp" className="bg-neutral-900 text-white">🏰 Biệt Thự Cao Cấp / Villa</option>
                      <option value="Quán Kafe & Trà Sữa" className="bg-neutral-900 text-white">☕ Quán Kafe & Trà Sữa F&B</option>
                      <option value="Nhà Hàng F&B Trọn Gói" className="bg-neutral-900 text-white">🍽️ Nhà Hàng F&B Trọn Gói</option>
                      <option value="Bar & Bistro Thượng Lưu" className="bg-neutral-900 text-white">🍸 Bar & Bistro Thượng Lưu</option>
                    </select>
                  </div>

                  {/* Hàng 2: Phong cách & Diện tích */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] tracking-wider uppercase font-semibold text-gray-400 block">2. Phong cách kiến trúc</label>
                      <select 
                        value={aiStyle} 
                        onChange={(e) => setAiStyle(e.target.value)}
                        className="w-full bg-black/50 border border-emerald-500/30 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer font-sans"
                      >
                        <option value="Industrial" className="bg-neutral-900 text-white">Industrial (Xi măng • Thép)</option>
                        <option value="Minimalism" className="bg-neutral-900 text-white">Minimalism (Tối giản)</option>
                        <option value="Japandi" className="bg-neutral-900 text-white">Japandi (Gỗ ấm cúng)</option>
                        <option value="Modern Classic" className="bg-neutral-900 text-white">Modern Classic (Tân cổ điển)</option>
                        <option value="Tropical Eco" className="bg-neutral-900 text-white">Tropical Eco (Cảnh quan xanh)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] tracking-wider uppercase font-semibold text-gray-400 block">3. Diện tích m²</label>
                      <input 
                        type="number" 
                        value={aiArea}
                        min="20"
                        max="2000"
                        onChange={(e) => setAiArea(parseFloat(e.target.value) || 0)}
                        className="w-full bg-black/50 border border-emerald-500/30 rounded-xl px-4 py-2 text-white font-medium text-sm focus:outline-none focus:border-emerald-400 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={aiLoading}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-none outline-none disabled:opacity-50"
                  >
                    {aiLoading ? '⚡ AI Đang Render 8K FLUX...' : '✨ Tạo Phối Cảnh & Dự Toán Tức Thì'}
                  </button>
                </form>

                {/* 2. KHUNG CHAT TRÒ CHUYỆN CỤ THỂ BẰNG BẤT KỲ NGÔN NGỮ NHƯ GEMINI */}
                <div className="space-y-3 pt-2">
                  <span className="text-[10px] tracking-[0.3em] text-emerald-400 font-mono uppercase block">Cách 2: Trò Chuyện Trực Tiếp Cùng KTS AI (Hiểu Mọi Ngôn Ngữ)</span>
                  <form onSubmit={handleSendChat} className="flex gap-2">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Gõ ý tưởng: 'làm nhà ở 200m2', 'design a cafe 100m2', 'hi hello'..."
                      className="flex-1 bg-black/60 border border-emerald-500/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-400 font-sans"
                    />
                    <button
                      type="submit"
                      disabled={aiLoading || !chatInput.trim()}
                      className="bg-emerald-400 hover:bg-emerald-300 text-black px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer outline-none border-none shrink-0"
                    >
                      Gửi Chat
                    </button>
                  </form>
                </div>

              </div>

              {/* CỘT PHẢI: HIỂN THỊ HÌNH RENDER FLUX 8K VÀ HÓA ĐƠN DỰ TOÁN REALTIME */}
              <div className="lg:col-span-6 bg-white text-black p-6 md:p-8 rounded-2xl shadow-2xl flex flex-col justify-between relative overflow-hidden space-y-6">
                
                {aiLoading ? (
                  <div className="w-full h-full min-h-[380px] flex flex-col items-center justify-center space-y-4 py-12">
                    <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-mono uppercase tracking-widest text-neutral-500">KTS AI đang phân tích ngôn ngữ & Render 3D FLUX 8K...</p>
                  </div>
                ) : aiResult ? (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="text-center pb-2 border-b border-dashed border-neutral-300">
                      <span className="text-[9px] uppercase tracking-[0.25em] text-emerald-600 font-bold font-mono block">AI Consultant & Render Result</span>
                      <h4 className="text-sm font-bold uppercase">{aiResult.spaceType} • {aiResult.style}</h4>
                    </div>

                    {/* Nếu có Dữ liệu Kiến trúc -> Hiện hình Render FLUX 8K */}
                    {!aiResult.isPureChat && aiResult.aiImageUrl && (
                      <div className="w-full aspect-video rounded-xl border border-neutral-200 overflow-hidden shadow-inner relative group bg-black">
                        <img src={aiResult.aiImageUrl} alt="AI Visual Result" className="w-full h-full object-cover block" />
                        <span className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md text-emerald-400 text-[9px] font-mono px-2 py-1 rounded">FLUX 8K Render</span>
                      </div>
                    )}

                    {/* Câu trả lời tư vấn từ Gemini */}
                    <p className="text-[11px] text-neutral-700 font-light leading-relaxed bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                      "{aiResult.replyText}"
                    </p>

                    {/* Nếu không phải chat thuần thì hiện Hóa đơn BOQ */}
                    {!aiResult.isPureChat && (
                      <>
                        <div className="space-y-2 text-xs border-b border-dashed border-neutral-300 pb-3">
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Diện tích hạch toán:</span>
                            <span className="font-bold font-mono">{aiResult.area} m²</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Đơn giá AI định biên:</span>
                            <span className="font-medium font-mono">{formatVND(aiResult.basePricePerM2)} / m²</span>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-neutral-600 border-b border-dashed border-neutral-300 pb-3">
                          <div className="flex justify-between">
                            <span>Chi phí cơ sở:</span>
                            <span className="font-mono">{formatVND(aiResult.baseCost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Dự phòng BOQ (5%):</span>
                            <span className="font-mono">{formatVND(aiResult.boqCost)}</span>
                          </div>
                        </div>

                        <div className="pt-1">
                          <div className="flex justify-between items-baseline">
                            <span className="text-xs font-bold text-neutral-800 uppercase">Tổng dự toán AI:</span>
                            <span className="text-xl font-bold font-mono tracking-tight text-neutral-950">{formatVND(aiResult.totalCost)}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full min-h-[380px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-neutral-200 rounded-xl space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl">🤖</div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">Trạm Phối Cảnh & Trò Chuyện KTS AI</h4>
                    <p className="text-[11px] text-neutral-400 font-light max-w-xs">
                      Bạn có thể chọn Form nhanh ở trên HOẶC trò chuyện bằng bất kỳ ngôn ngữ nào ở dưới, KTS AI sẽ trả lời và phác thảo phối cảnh 8K ngay!
                    </p>
                  </div>
                )}

                {/* NÚT TƯ VẤN ZALO */}
                <div className="pt-3 border-t border-neutral-200">
                  <a
                    href="https://zalo.me/0375075975" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-neutral-900 hover:bg-black text-white text-center py-3.5 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-md flex items-center justify-center gap-2 cursor-pointer text-decoration-none"
                  >
                    <span>💬 Nhận Bản Vẽ Chi Tiết Qua Zalo</span>
                  </a>
                </div>

              </div>

            </div>
          )}

        </div>
      </section>

      {/* FOOTER SYSTEM */}
      <footer id="contact" className="bg-black py-20 px-6 md:px-16 border-t border-white/5 w-full text-left">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-sm text-gray-500 font-light leading-relaxed">
          
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

          <div className="space-y-3">
            <h4 className="text-white font-semibold tracking-wider uppercase mb-2">Mạng Xã Hội</h4>
            <div className="flex flex-col gap-2.5 text-xs text-gray-400 font-light">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Facebook Official</a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Instagram Portfolio</a>
              <a href="https://zalo.me/0375075975" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Zalo Official CSKH</a>
            </div>
          </div>

          <div className="space-y-5">
            <h4 className="text-white font-semibold tracking-wider uppercase">Yêu Cầu Báo Giá</h4>
            <p>Hotline tư vấn kỹ thuật trực tiếp: <strong className="text-white text-base">0375075975</strong></p>
            <a 
              href="https://zalo.me/0375075975" 
              target="_blank" 
              rel="noreferrer" 
              className="block bg-white text-black font-bold text-center uppercase tracking-widest text-xs px-6 py-4 rounded-xl w-full hover:bg-gray-200 transition-all leading-none cursor-pointer"
            >
              Kết nối nhận tư vấn trực tiếp
            </a>
          </div>

        </div>
      </footer>

    </div>
  );
}