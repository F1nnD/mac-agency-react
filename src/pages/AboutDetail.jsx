import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Header from '../components/Header';
gsap.registerPlugin(ScrollTrigger);

export default function AboutDetail() {
  const navigate = useNavigate();
  
  // Nạp sẵn dữ liệu dự phòng trực tiếp để nếu file JSON lỗi, trang vẫn hiển thị 100%
  const [aboutData, setAboutData] = useState({
    brandName: "More Artistic Concept",
    story: {
      title: "CÂU CHUYỆN THƯƠNG HIỆU",
      content: "Đóng vai trò nhà thầu trọn gói chuyên sâu cho mọi dự án F&B. MAC mang lại giải pháp toàn diện từ tài chính, chiến lược vận hành bền vững đến kiến trúc độc bản tối ưu cho Chủ Đầu Tư."
    },
    philosophy: {
      title: "TRIẾT LÝ THIẾT KẾ",
      content: "Lấy hiệu quả của dự án làm thước đo hàng đầu. Chúng tôi cam kết bằng sự uy tín, trách nhiệm, tận tâm và tính minh bạch tuyệt đối, nâng niu từng đóng góp của khách hàng để cùng phát triển."
    },
    coreTeam: {
      title: "ĐỘI NGŨ CỐT LÕI",
      content: "Đội ngũ kiến trúc sư và chuyên gia vận hành của MAC đồng hành định hình bản sắc thương hiệu độc quyền. Từ thiết kế bộ nhận diện đến chiến lược truyền thông giúp quán tiếp cận đúng khách hàng mục tiêu."
    }
  });

  useEffect(() => {
    // Thuật toán nạp dữ liệu động từ tệp JSON bên ngoài
    async function loadAboutDetail() {
      try {
        const response = await fetch('/assets/data/about.json');
        if (response.ok) {
          const data = await response.json();
          setAboutData(data);
        }
      } catch (error) {
        console.warn("Hệ thống chuyển hướng dùng data dự phòng nội bộ của MAC:", error);
      }
    }
    loadAboutDetail();

    // Hoạt họa khối Header và Tiêu đề lớn lướt lên sang trọng
    gsap.fromTo("header", { y: -20, opacity: 0 }, { duration: 1, y: 0, opacity: 1, ease: "power2.out" });
    gsap.fromTo(".manifesto-title, .title-line, .sticky-brand", 
      { y: 30, opacity: 0 }, 
      { duration: 1.4, y: 0, opacity: 1, stagger: 0.15, ease: "power4.out" }
    );
  }, []);

  // Chạy hiệu ứng cuộn mượt trượt chữ nối đuôi (Stagger Reveal)
  useEffect(() => {
    if (aboutData) {
      gsap.to(".story-block-anim", {
        scrollTrigger: {
          trigger: "#about-content-wrapper",
          start: "top 80%",
          toggleActions: "play none none none"
        },
        duration: 1.2,
        opacity: 1,
        y: 0,
        stagger: 0.2,
        ease: "power3.out"
      });
    }
  }, [aboutData]);

  return (
    <div className="w-full min-h-screen bg-[#0b0b0b] text-gray-300 antialiased overflow-x-hidden font-sans">
      
      <Header showBackBtn={true} />

      {/* ========================================================================= */}
      {/* MAIN CONTAINER */}
      {/* ========================================================================= */}
      <main className="pt-36 pb-24 px-6 md:px-16 max-w-6xl mx-auto w-full min-h-screen flex flex-col justify-between">
        
        {/* Khối tiêu đề Manifesto */}
        <div className="max-w-3xl space-y-6 text-left">
          <span className="text-[10px] tracking-[0.4em] text-white/30 uppercase block font-semibold">Our Manifesto</span>
          <h1 className="manifesto-title text-4xl md:text-7xl font-light tracking-tight text-white uppercase leading-tight select-none">
            Sáng tạo không gian<br />
            <span className="font-bold">Vận hành bản sắc.</span>
          </h1>
          <div className="title-line w-12 h-[1px] bg-white/20 mt-6"></div>
        </div>

        {/* Khối Grid nội dung cấu trúc chân trang */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16 mt-20 items-start w-full">
          
          {/* Cột trái: Ghim tên thương hiệu nghệ thuật */}
          <div className="sticky-brand md:col-span-4 md:sticky md:top-36 text-left">
            <h2 id="brand-name" className="text-2xl font-light font-mono tracking-tight leading-none uppercase text-white/40">
              {aboutData.brandName}
            </h2>
          </div>

          {/* Cột phải: Khối render văn bản mô tả triết lý */}
          <div id="about-content-wrapper" className="md:col-span-8 space-y-16 md:space-y-24 text-left">
            {['story', 'philosophy', 'coreTeam'].map((secKey) => {
              const block = aboutData[secKey];
              if (!block) return null;

              return (
                <div key={secKey} className="story-block-anim space-y-4 opacity-0 translate-y-[30px]">
                  <h3 className="text-xs tracking-[0.25em] text-white/30 uppercase font-bold font-mono">{block.title}</h3>
                  <p className="text-base md:text-lg text-neutral-400 font-light leading-relaxed tracking-wide text-justify">
                    {block.content}
                  </p>
                </div>
              );
            })}
          </div>

        </div>

        {/* Đáy chân trang */}
        <div className="border-t border-white/5 mt-24 pt-12 flex flex-col sm:flex-row items-center justify-between gap-6 w-full">
          <p className="text-xs text-neutral-500 font-light select-none">© 2026 MAC - More Artistic Concept. All rights reserved.</p>
          <button 
            onClick={() => navigate('/home#calculator')}
            className="inline-flex items-center gap-3 text-xs tracking-widest uppercase font-semibold text-white bg-white/5 border border-white/10 hover:border-white px-8 py-3.5 rounded-full hover:bg-white hover:text-black transition-all duration-300 cursor-pointer outline-none"
          >
            <span>Trở lại bộ dự toán giá</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
        
      </main>

    </div>
  );
}