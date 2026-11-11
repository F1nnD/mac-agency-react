import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Header from '../components/Header';
import RevealText from '../components/RevealText';
import CountUp from '../components/CountUp';
import usePageMeta from '../utils/usePageMeta';
import { initParallax } from '../utils/motion';

gsap.registerPlugin(ScrollTrigger);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Portfolio() {
  const navigate = useNavigate();
  usePageMeta(
    'Dự án nổi bật - MAC Concept',
    'Hồ sơ năng lực và các dự án thiết kế, thi công không gian F&B, biệt thự nhà vườn và cảnh quan của MAC Concept.'
  );
  const [portfolioData, setPortfolioData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFullPortfolio() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/projects`);
        if (!response.ok) {
          throw new Error('Không thể kết nối lấy dữ liệu từ hệ thống Backend!');
        }
        const database = await response.json();
        setPortfolioData(database);
        setLoading(false);
      } catch (error) {
        console.error("Lỗi lốt dữ liệu portfolio nghệ thuật:", error);
        setLoading(false);
      }
    }
    loadFullPortfolio();
  }, []);

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

  // Thị sai nhẹ cho ảnh thẻ dự án
  useEffect(() => initParallax(document.getElementById('full-portfolio-grid') || document), [portfolioData, loading]);

  return (
    <div className="w-full min-h-screen bg-[#0b0b0b] text-gray-300 antialiased overflow-x-hidden font-sans">
      <Header showBackBtn={true} />

      <main className="pt-28 md:pt-32 pb-24 px-4 md:px-12 min-h-screen text-left max-w-7xl mx-auto w-full">
        <div className="mb-16 text-center md:text-left select-none">
          <span className="text-[10px] tracking-[0.4em] text-white/30 uppercase block mb-3 font-semibold">Portfolio Architecture</span>
          <RevealText as="h1" trigger="mount" text="Hồ sơ năng lực dự án phát triển" className="text-2xl font-light text-white uppercase mt-1" />
          {Array.isArray(portfolioData) && portfolioData.length > 0 && (
            <p className="text-xs text-white/40 mt-3"><CountUp value={portfolioData.length} /> dự án</p>
          )}
        </div>

        {loading ? (
          <div className="w-full py-20 text-center select-none animate-pulse text-zinc-500 font-mono text-xs tracking-widest uppercase">
            Đang tải dữ liệu portfolio từ hệ thống...
          </div>
        ) : (
          <div id="full-portfolio-grid" className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-3 gap-5 md:gap-8 w-full">
            {Array.isArray(portfolioData) && portfolioData.map((proj, index) => {
              if (!proj) return null;
              const uniqueId = proj._id || `proj-idx-${index}`;
              // Điện thoại: mọi thẻ cùng tỷ lệ 4/5 cho đều; máy tính: giữ bố cục cũ (thẻ đầu rộng 16/9)
              const colSpan = (index % 3 === 0) ? 'aspect-[4/5] md:aspect-[16/9] md:col-span-2' : 'aspect-[4/5] md:aspect-auto md:col-span-1';
              const desc = proj.projectDesc && !/^chưa có mô tả/i.test(proj.projectDesc.trim()) ? proj.projectDesc : '';

              const checkImg = (p) => {
                if (!p) return '';
                if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('data:') || p.startsWith('/')) return p;
                return '/' + p.replace('../assets/pic/', 'assets/pic/').replace('../pic/', 'assets/pic/');
              };
              
              const fixImg1 = checkImg(proj.img1);
              const fixImg2 = checkImg(proj.img2 || proj.img1);

              return (
                <div 
                  key={uniqueId}
                  className={`portfolio-item-anim ${colSpan} group relative overflow-hidden rounded-2xl bg-zinc-900 border border-white/5 cursor-pointer md:cursor-default md:min-h-[350px] opacity-0 translate-y-[30px]`}
                  onClick={() => navigate(`/project-detail?id=${proj.breadcrumb}`)}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-10 pointer-events-none"></div>
                  
                  <img src={fixImg1} alt={proj.name} loading="lazy" decoding="async" data-parallax className="absolute inset-0 w-full h-full object-cover group-hover:scale-102 transition-[scale] duration-700 ease-in-out z-0 block" />
                  <img src={fixImg2} alt={`${proj.name} Hover`} loading="lazy" decoding="async" data-parallax className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-in-out z-5 block" />
                  
                  <div className="absolute bottom-0 left-0 w-full p-5 md:p-8 z-20 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div className="text-left flex-1 max-w-[80%]">
                      <span className="text-[10px] uppercase tracking-wider text-white/40 block mb-1 font-mono">{proj.type}</span>
                      <h3 
                        className="text-xl md:text-2xl font-bold text-white uppercase break-words"
                        dangerouslySetInnerHTML={{ __html: proj.name || proj.breadcrumb }}
                      />                      
                      {desc && (
                        <p className="text-[11px] text-neutral-400 mt-2 line-clamp-2 font-light leading-relaxed max-w-md md:opacity-0 md:h-0 group-hover:opacity-100 group-hover:h-auto transition-all duration-500 ease-out origin-bottom">
                          {desc}
                        </p>
                      )}
                    </div>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigate(`/project-detail?id=${proj.breadcrumb}`); }}
                      className="inline-flex items-center gap-2 text-xs tracking-widest uppercase font-semibold text-white bg-black/50 border border-white/20 backdrop-blur-sm px-5 py-3 min-h-11 rounded-full opacity-100 translate-y-0 md:opacity-0 md:translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:bg-white hover:text-black hover:scale-105 hover:border-white transition-all duration-500 ease-out shadow-lg cursor-pointer z-30 shrink-0 outline-none"
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