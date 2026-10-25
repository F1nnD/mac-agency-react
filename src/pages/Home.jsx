import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import Header from '../components/Header';
import { askAI, isPro } from '../utils/apiClient';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Home() {
  const navigate = useNavigate();

  const [homeCurrentIdx, setHomeCurrentIdx] = useState(0);
  const [portfolioData, setPortfolioData] = useState([]);
  const [calcMode, setCalcMode] = useState('draft-filter');

  const [priceList, setPriceList] = useState({
    concept: { name: "Gói Thiết Kế Concept", price: 350000 },
    build: { name: "Gói Thi Công Trọn Gói", price: 3500000 },
    combo: { name: "Combo Premium Thượng Lưu", price: 4200000 },
    landscape: { name: "Cảnh Quan Nghệ Thuật", price: 800000 }
  });
  const [selectedPackage, setSelectedPackage] = useState("concept");

  const [area, setArea] = useState(100);
  const [siteFilter, setSiteFilter] = useState('all');
  const [draftList, setDraftList] = useState([]);
  const [selectedDraft, setSelectedDraft] = useState(null);

  const [aiSpaceType, setAiSpaceType] = useState('Quán Kafe & Trà Sữa');
  const [aiStyle, setAiStyle] = useState('Industrial');
  const [aiArea, setAiArea] = useState(120);
  
  // State cho Chat (Lưu vào localStorage để không mất khi F5)
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState(() => {
    const saved = localStorage.getItem('mac_chat_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  // Lưu lịch sử chat
  useEffect(() => {
    localStorage.setItem('mac_chat_history', JSON.stringify(chatMessages));
  }, [chatMessages]);

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
        const response = await fetch(`${API_BASE_URL}/api/projects`);
        if (response.ok) {
          const database = await response.json();
          setPortfolioData(database);
        }
      } catch (error) {
        console.error("Lỗi tải dữ liệu portfolio:", error);
      }
    }

    async function fetchPackages() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/packages`);
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
        console.error("Lỗi đồng bộ đơn giá:", error);
      }
    }

    async function fetchDraftLayouts() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/drafts`);
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

  // ===== AI PRO (Form nhanh) =====
  const handleGenerateFromForm = async (e) => {
    e.preventDefault();

    if (!isPro()) {
      alert('Tính năng tạo phối cảnh 3D chỉ dành cho gói Pro. Vui lòng nâng cấp để sử dụng.');
      return;
    }

    setAiLoading(true);
    setAiResult(null);

    try {
      const data = await askAI({
        style: aiStyle,
        area: aiArea,
        spaceType: aiSpaceType,
        usePro: true
      });
      setAiResult(data);
      
      // Thêm vào khung chat luôn để đồng bộ
      setChatMessages(prev => [
        ...prev, 
        { role: 'user', text: `[Tạo phối cảnh tự động] ${aiSpaceType} - ${aiStyle} - ${aiArea}m2` },
        { role: 'ai', text: data.replyText, image: data.aiImageUrl }
      ]);
    } catch (err) {
      console.error('Lỗi AI Form:', err);
      alert(err.message || 'Không thể kết nối AI. Vui lòng thử lại.');
    } finally {
      setAiLoading(false);
    }
  };

  // ===== AI CHAT (Giao diện chat qua lại) =====
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || aiLoading) return;

    const msg = chatInput.trim();
    setChatInput('');
    setAiLoading(true);

    const newUserMsg = { role: 'user', text: msg };
    const updatedHistory = [...chatMessages, newUserMsg];
    setChatMessages(updatedHistory);

    try {
      const useProEndpoint = isPro();
      const data = await askAI({
        userMessage: msg,
        chatHistory: chatMessages,
        usePro: useProEndpoint,
        style: aiStyle, area: aiArea, spaceType: aiSpaceType
      });
      
      setChatMessages([
        ...updatedHistory, 
        { role: 'ai', text: data.replyText, image: data.aiImageUrl }
      ]);
      
      if (!data.isPureChat) {
        setAiResult(data);
      }
      
    } catch (err) {
      console.error('Lỗi AI Chat:', err);
      setChatMessages([
        ...updatedHistory, 
        { role: 'ai', text: 'Lỗi kết nối đến AI. Vui lòng thử lại.' }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

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
      <Header showBackBtn={true} />

      <div id="top"></div>

      {/* HERO SECTION */}
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

      {/* ABOUT SECTION */}
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

      {/* SERVICES SECTION */}
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
              <h3 className="text-lg font-semibold text-white/80 transition-all duration-500 group-hover:text-white group-hover:-translate-y-1">Thiết Kế & Thi Công</h3>
              <p className="text-sm text-gray-500 font-light leading-relaxed transition-colors duration-500 group-hover:text-gray-300">Tối ưu kiến trúc phần cứng, hiện thực hóa bản vẽ ra công trường chuẩn xác.</p>
            </div>
          </div>
          <div className="group relative p-8 md:p-10 bg-zinc-900/20 space-y-6 flex flex-col justify-between aspect-square border-r border-b lg:border-b-0 border-white/5 overflow-hidden cursor-pointer transition-all duration-500 text-left">
            <div className="absolute inset-0 bg-neutral-950/60 z-10 pointer-events-none"></div>
            <img src="/assets/pic/SETUP.jpg" alt="Setup" className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:opacity-60 group-hover:scale-105 transition-all duration-700 ease-in-out z-0 block" />
            <span className="relative z-20 text-2xl font-bold text-white/10 font-mono transition-colors duration-500 group-hover:text-white/30">02</span>
            <div className="relative z-20 space-y-2">
              <h3 className="text-lg font-semibold text-white/80 transition-all duration-500 group-hover:text-white group-hover:-translate-y-1">Setup & Vận Hành</h3>
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

      {/* PORTFOLIO SECTION */}
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
              if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('data:') || p.startsWith('/')) return p;
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

      {/* PROCESS SECTION */}
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

      {/* CALCULATOR SECTION */}
      <section id="calculator" className="bg-[#050505] py-24 px-6 md:px-16 border-t border-white/5 select-none scroll-mt-20 text-left w-full">
        <div className="max-w-7xl mx-auto space-y-10">

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
            <div>
              <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase block mb-2 font-mono">Multi-Option Estimator</span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white uppercase">Bộ Tính Giá Dự Toán Công Trình</h2>
            </div>

            <div className="inline-flex p-1.5 bg-zinc-900/80 border border-white/10 rounded-2xl backdrop-blur-md shrink-0">
              <button
                onClick={() => setCalcMode('draft-filter')}
                className={`px-5 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-300 cursor-pointer outline-none ${calcMode === 'draft-filter' ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/10' : 'text-gray-400 hover:text-white'}`}
              >
                Gợi Ý Draft Theo m²
              </button>
              <button
                onClick={() => setCalcMode('quick-calc')}
                className={`px-5 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-300 cursor-pointer outline-none ${calcMode === 'quick-calc' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                Gói Định Biên Nhanh
              </button>
              <button
                onClick={() => setCalcMode('ai-chat')}
                className={`px-5 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-300 cursor-pointer outline-none ${calcMode === 'ai-chat' ? 'bg-emerald-400 text-black shadow-lg shadow-emerald-400/10' : 'text-gray-400 hover:text-white'}`}
              >
                AI Visual Studio & Chat
              </button>
            </div>
          </div>

          {calcMode === 'ai-chat' && (
            <div className="flex flex-wrap items-center justify-end gap-3 -mt-4">
              <span className={`text-[10px] tracking-widest uppercase font-bold px-3 py-1.5 rounded-full border ${
                isPro()
                  ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5'
                  : 'text-white/50 border-white/10 bg-white/5'
              }`}>
                {isPro() ? 'Gói Pro' : 'Gói Free'}
              </span>
              {!isPro() && (
                <button
                  onClick={() => navigate('/pricing')}
                  className="text-[10px] tracking-widest uppercase font-bold text-amber-400 hover:text-amber-300 border border-amber-400/40 px-3 py-1.5 rounded-full transition-all cursor-pointer bg-transparent outline-none"
                >
                  Nâng cấp Pro
                </button>
              )}
            </div>
          )}

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
                        <span className="absolute right-5 top-1/2 transform -translate-y-1/2 text-xs tracking-wider text-white/40 font-medium">m²</span>
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
                        <p className="text-[11px] text-gray-500 font-light">Bạn hãy thử thay đổi số m² hoặc chọn Hiện trạng "Tất cả" nhé.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 bg-white text-black p-6 md:p-8 rounded-2xl shadow-2xl flex flex-col justify-between relative overflow-hidden space-y-6">
                <div className="space-y-4">
                  <div className="text-center pb-3 border-b border-dashed border-neutral-300">
                    <img src="/assets/pic/logo3.png" alt="MAC Logo" className="w-24 h-auto object-contain invert mx-auto block" />
                  </div>

                  <div className="w-full aspect-[16/10] bg-neutral-100 rounded-xl border border-neutral-200 overflow-hidden relative shadow-inner">
                    {selectedDraft ? (
                      <img src={selectedDraft.demoImage.startsWith('http') || selectedDraft.demoImage.startsWith('data:') ? selectedDraft.demoImage : '/' + selectedDraft.demoImage} alt={selectedDraft.name} className="w-full h-full object-cover block" />
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
                    <span>Tư Vấn Chi Tiết Zalo</span>
                  </a>
                </div>
              </div>
            </div>
          )}

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
                      <span className="absolute right-5 top-1/2 transform -translate-y-1/2 text-sm tracking-wider text-white/40 font-medium font-sans">m²</span>
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
                    <span>Tư Vấn Chi Tiết Zalo</span>
                  </a>
                  <button
                    onClick={() => navigate('/packages')}
                    className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-center py-3.5 px-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 border border-neutral-300 flex items-center justify-center gap-1 cursor-pointer outline-none"
                  >
                    <span>Các Gói Định Biên</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* FORM & CHAT UI */}
          {calcMode === 'ai-chat' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch animate-fadeIn">
              
              {/* CỘT TRÁI: CHỈ DÀNH CHO FORM NHANH */}
              <div className="lg:col-span-5 space-y-6 bg-zinc-900/30 border border-emerald-500/20 p-6 md:p-8 rounded-2xl backdrop-blur-sm flex flex-col justify-between">
                <form onSubmit={handleGenerateFromForm} className="space-y-4">
                  <div className="space-y-1 border-b border-emerald-500/20 pb-4">
                    <span className="text-[10px] tracking-[0.3em] text-emerald-400 font-mono uppercase block">Form Nhanh (Dành cho Pro)</span>
                    <h3 className="text-base font-bold text-white uppercase">Tạo Phối Cảnh & Bóc Giá</h3>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] tracking-wider uppercase font-semibold text-gray-400 block">1. Loại hình công trình</label>
                    <select value={aiSpaceType} onChange={(e) => setAiSpaceType(e.target.value)} className="w-full bg-black/50 border border-emerald-500/30 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer font-sans">
                      <option value="Nhà Ở Dân Dụng / Nhà Phố" className="bg-neutral-900 text-white">Nhà Ở Dân Dụng / Nhà Phố</option>
                      <option value="Biệt Thự Cao Cấp" className="bg-neutral-900 text-white">Biệt Thự Cao Cấp / Villa</option>
                      <option value="Quán Kafe & Trà Sữa" className="bg-neutral-900 text-white">Quán Kafe & Trà Sữa F&B</option>
                      <option value="Nhà Hàng F&B Trọn Gói" className="bg-neutral-900 text-white">Nhà Hàng F&B Trọn Gói</option>
                      <option value="Bar & Bistro Thượng Lưu" className="bg-neutral-900 text-white">Bar & Bistro Thượng Lưu</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] tracking-wider uppercase font-semibold text-gray-400 block">2. Phong cách</label>
                      <select value={aiStyle} onChange={(e) => setAiStyle(e.target.value)} className="w-full bg-black/50 border border-emerald-500/30 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer font-sans">
                        <option value="Industrial" className="bg-neutral-900 text-white">Industrial</option>
                        <option value="Minimalism" className="bg-neutral-900 text-white">Minimalism</option>
                        <option value="Japandi" className="bg-neutral-900 text-white">Japandi</option>
                        <option value="Modern Classic" className="bg-neutral-900 text-white">Modern Classic</option>
                        <option value="Tropical Eco" className="bg-neutral-900 text-white">Tropical Eco</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] tracking-wider uppercase font-semibold text-gray-400 block">3. Diện tích m²</label>
                      <input type="number" value={aiArea} onChange={(e) => setAiArea(parseFloat(e.target.value) || 0)} className="w-full bg-black/50 border border-emerald-500/30 rounded-xl px-4 py-2 text-white font-medium text-sm focus:outline-none focus:border-emerald-400 font-mono" />
                    </div>
                  </div>
                  <button type="submit" disabled={aiLoading} className="w-full mt-4 bg-emerald-500 hover:bg-emerald-400 text-black py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-none outline-none disabled:opacity-50">
                    {aiLoading ? 'AI Đang Render 8K...' : 'Tạo Phối Cảnh & Dự Toán'}
                  </button>
                </form>
              </div>

              {/* CỘT PHẢI: KHUNG CHAT TỰ DO */}
              <div className="lg:col-span-7 bg-white text-black rounded-2xl shadow-2xl flex flex-col h-[500px] relative overflow-hidden">
                <div className="p-4 border-b border-neutral-200 text-center bg-neutral-50 flex justify-between items-center px-6">
                  <div className="text-left">
                    <span className="text-[9px] uppercase tracking-[0.25em] text-emerald-600 font-bold font-mono block">Trợ Lý AI MAC Concept</span>
                    <h4 className="text-sm font-bold uppercase">Trò Chuyện Trực Tiếp</h4>
                  </div>
                  <span className="text-[10px] tracking-widest uppercase font-bold px-3 py-1.5 rounded-full border text-emerald-600 border-emerald-500/30 bg-emerald-500/5">
                    {isPro() ? 'Gói Pro' : 'Gói Free'}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                  {chatMessages.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">Xin chào! Tôi là KTS AI</h4>
                      <p className="text-[11px] text-neutral-400 font-light max-w-xs">Tôi có thể tư vấn thiết kế, bóc tách dự toán hoặc trò chuyện cùng bạn. Hãy gõ gì đó bên dưới nhé!</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-emerald-500 text-black rounded-tr-sm' : 'bg-neutral-100 text-neutral-800 border border-neutral-200 rounded-tl-sm'}`}>
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                          {msg.image && (
                            <div className="mt-2 w-full aspect-video rounded-lg overflow-hidden border border-neutral-300">
                              <img src={msg.image} alt="AI Render" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {aiLoading && (
                    <div className="flex justify-start">
                      <div className="bg-neutral-100 border border-neutral-200 text-neutral-500 rounded-2xl rounded-tl-sm px-4 py-2 text-xs flex items-center gap-2">
                        <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>Đang trả lời...
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 border-t border-neutral-200 bg-neutral-50">
                  <form onSubmit={handleSendChat} className="flex gap-2">
                    <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Tán gẫu hoặc yêu cầu thiết kế..." className="flex-1 bg-white border border-neutral-300 rounded-xl px-4 py-2 text-sm text-black focus:outline-none focus:border-emerald-500" />
                    <button type="submit" disabled={aiLoading || !chatInput.trim()} className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50">Gửi</button>
                  </form>
                </div>
              </div>
            </div>
          )}

        </div>
      </section>

      <footer id="contact" className="bg-black py-20 px-6 md:px-16 border-t border-white/5 w-full text-left">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-sm text-gray-500 font-light leading-relaxed">
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-white tracking-widest">MAC</h3>
            <p>44 Nguyễn Văn Dung, Phường 6, Gò Vấp, TP. Hồ Chí Minh</p>
            <p>Điện thoại: 0375075975</p>
            <p>Email: maconcept.asia@gmail.com</p>
          </div>
          <div className="space-y-3">
            <h4 className="text-white font-semibold tracking-wider uppercase mb-2">Dịch Vụ Chính</h4>
            <p>- Thiết kế & Thi công kiến trúc chuyên sâu F&B</p>
            <p>- Thiết kế biệt thự nhà vườn cao cấp</p>
            <p>- Thiết kế cảnh quan tích hợp hồ cá Koi nghệ thuật</p>
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
            <a href="https://zalo.me/0375075975" target="_blank" rel="noreferrer" className="block bg-white text-black font-bold text-center uppercase tracking-widest text-xs px-6 py-4 rounded-xl w-full hover:bg-gray-200 transition-all leading-none cursor-pointer">
              Kết nối nhận tư vấn trực tiếp
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}