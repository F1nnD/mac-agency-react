import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';

export default function Index() {
  const navigate = useNavigate();
  
  const flashlightRef = useRef(null);
  const maskWrapperRef = useRef(null);
  const overlayRef = useRef(null);
  
  // State quản lý slide hiện tại tương ứng với các nút chấm tròn
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    // 1. THUẬT TOÁN ĐÈN PHA MỞ RỘNG (RỌI THEO TỌA ĐỘ CHUỘT)
    const handleMouseMove = (e) => {
      const x = e.clientX;
      const y = e.clientY;

      if (flashlightRef.current) {
        if (flashlightRef.current.classList.contains('opacity-0')) {
          flashlightRef.current.classList.remove('opacity-0');
        }
        flashlightRef.current.style.background = `radial-gradient(circle 900px at ${x}px ${y}px, rgba(255, 255, 255, 0.07) 0%, transparent 100%)`;
      }

      if (maskWrapperRef.current) {
        const maskStyle = `radial-gradient(circle 950px at ${x}px ${y}px, rgba(255,255,255,1) 0%, rgba(255,255,255,0.3) 40%, transparent 100%)`;
        maskWrapperRef.current.style.maskImage = maskStyle;
        maskWrapperRef.current.style.webkitMaskImage = maskStyle;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 2. LOGIC TỰ ĐỘNG CHUYỂN SLIDE (MỖI 5 GIÂY)
    const nextSlide = () => {
      setCurrentIdx((prevIdx) => (prevIdx + 1) % 3);
    };
    let autoSlideInterval = setInterval(nextSlide, 5000);

    // 3. HIỆU ỨNG GSAP ENTRANCE KHI VỪA VÀO TRANG
    gsap.fromTo("#brand-sub-text", { y: 15, opacity: 0 }, { duration: 1, y: 0, opacity: 1, delay: 0.2, ease: "power2.out" });
    gsap.fromTo("#main-title", { y: 20, opacity: 0 }, { duration: 1.2, y: 0, opacity: 1, delay: 0.4, ease: "power4.out" });
    gsap.fromTo("#cta-container", { opacity: 0 }, { duration: 1, opacity: 1, delay: 0.6, ease: "power2.out" });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(autoSlideInterval);
    };
  }, []);

  // Mỗi lần currentIdx thay đổi, chạy hiệu ứng mượt mà cho slide đang active
  useEffect(() => {
    const activeSlide = document.querySelector('.slide-item.active');
    if (activeSlide) {
      gsap.fromTo(activeSlide, 
        { scale: 1.1, filter: "blur(5px)" }, 
        { duration: 1, scale: 1, filter: "blur(0px)", ease: "power2.out" }
      );
    }
  }, [currentIdx]);

  // 4. ANIMATION PHÓNG TO KHI BẤM NÚT "BƯỚC VÀO KHÔNG GIAN"
  const handleEnterSpace = (e) => {
    e.preventDefault();
    if (overlayRef.current) {
      gsap.to(overlayRef.current, { duration: 0.4, opacity: 1 });
    }
    gsap.to("#main-title, p, span, #cta-container, .dot, #logo-mask-wrapper", {
      duration: 0.8,
      scale: 3,
      opacity: 0,
      filter: "blur(10px)",
      stagger: 0.05,
      ease: "power3.in",
      onComplete: () => {
        // Sau khi hiệu ứng kết thúc, chuyển trang nội bộ mượt mà
        navigate('/home'); 
      }
    });
  };

  return (
    // Ép cứng toàn màn hình cố định, không cho phép cuộn thừa
    <div className="fixed inset-0 w-full h-full bg-[#050505] text-white antialiased overflow-hidden select-none font-sans z-10">
      
      {/* Lớp phủ màn hình đen phục vụ hiệu ứng chuyển cảnh (Overlay) */}
      <div 
        ref={overlayRef} 
        className="fixed inset-0 bg-[#050505] z-[9999] opacity-0 pointer-events-none transition-opacity duration-400"
      ></div>

      {/* Lớp hiệu ứng Đèn pha đuổi theo chuột */}
      <div 
        ref={flashlightRef} 
        id="flashlight-overlay" 
        className="fixed inset-0 z-25 pointer-events-none transition-opacity duration-500 opacity-0"
      ></div>

      {/* ========================================================================= */}
{/* KHỐI CÁC SLIDE CHỮ Ở GÓC TRÁI DƯỚI (Đã sửa w-[320px] và ép căn lề trái text-left) */}
{/* ========================================================================= */}
<div className="absolute inset-0 z-30 overflow-hidden flex items-end p-10 md:p-16 pointer-events-none">
  <div className="relative w-[320px] h-36 md:h-32 ml-0 md:ml-4 mb-16 md:mb-12">
    
    {/* Slide 01 */}
    {/* THAY ĐỔI: Thêm class "text-left" vào từng block slide */}
    <div className={`slide-item absolute left-0 bottom-0 w-full text-left transition-all duration-700 ease-in-out ${currentIdx === 0 ? 'opacity-100 active pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      <div className="text-[11px] font-semibold tracking-[0.2em] text-white/40 uppercase mb-2">01 / Thiết kế & Thi công</div>
      <p className="text-[11px] md:text-xs text-gray-400 font-light leading-relaxed tracking-wide">
        Hiện thực hóa ý tưởng từ bản vẽ 3D đến thực tế công trường. MAC tối ưu không gian kiến trúc, cam kết độ chính xác về kỹ thuật và tiến độ bàn giao thô.
      </p>
    </div>

    {/* Slide 02 */}
    <div className={`slide-item absolute left-0 bottom-0 w-full text-left transition-all duration-700 ease-in-out ${currentIdx === 1 ? 'opacity-100 active pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      <div className="text-[11px] font-semibold tracking-[0.2em] text-white/40 uppercase mb-2">02 / Setup & Vận hành</div>
      <p className="text-[11px] md:text-xs text-gray-400 font-light leading-relaxed tracking-wide">
        Thổi hồn nghệ thuật vào không gian thông qua nội thất và decor độc bản. Đồng thời, tối ưu công năng quầy bar và tích hợp công nghệ quản lý vận hành.
      </p>
    </div>

    {/* Slide 03 */}
    <div className={`slide-item absolute left-0 bottom-0 w-full text-left transition-all duration-700 ease-in-out ${currentIdx === 2 ? 'opacity-100 active pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      <div className="text-[11px] font-semibold tracking-[0.2em] text-white/40 uppercase mb-2">03 / Branding & Marketing</div>
      <p className="text-[11px] md:text-xs text-gray-400 font-light leading-relaxed tracking-wide">
        Đồng hành định hình bản sắc thương hiệu độc quyền. Từ thiết kế bộ nhận diện đến chiến lược truyền thông giúp quán tiếp cận đúng khách hàng mục tiêu.
      </p>
    </div>
    
  </div>
</div>

      {/* ========================================================================= */}
      {/* KHỐI MẶT NẠ LOGO TO KHỔNG LỒ (Đã hạ xuống z-10 để chìm hẳn làm nền phía sau) */}
      {/* ========================================================================= */}
      <div 
        ref={maskWrapperRef} 
        id="logo-mask-wrapper" 
        className="absolute inset-0 w-full h-full z-10 pointer-events-none overflow-hidden"
        style={{
          maskImage: 'radial-gradient(circle 950px at -2000px -2000px, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)',
          WebkitMaskImage: 'radial-gradient(circle 950px at -2000px -2000px, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat'
        }}
      >
        <div className="w-full h-full flex items-center justify-center overflow-hidden">
          <img 
            src="/assets/pic/logo1.png" 
            alt="MAC Huge Logo" 
            className="w-full max-w-7xl h-auto object-contain text-white/20 opacity-30 select-none pointer-events-none transform scale-150 origin-center transition-transform duration-300 block" 
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* KHỐI CHỮ TRUNG TÂM & NÚT ĐIỀU HƯỚNG CHÍNH (Nâng lên z-40 để đè lên logo nền) */}
      {/* ========================================================================= */}
      <div className="relative z-40 h-screen flex flex-col justify-between p-8 md:p-12 pointer-events-none">
        <div></div>
    
        <div className="max-w-4xl mx-auto text-center pointer-events-auto">
          <span id="brand-sub-text" className="text-[13px] font-medium tracking-[0.3em] text-white/40 uppercase mb-4 block">
            More Artistic Concept
          </span>
          <h1 id="main-title" className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6 leading-tight select-none">
            Sáng tạo không gian<br />Vận hành bản sắc.
          </h1>
          
          <div className="flex justify-center mt-8" id="cta-container">
            <button 
              onClick={handleEnterSpace}
              className="group flex items-center gap-3 border border-white/30 bg-black/20 backdrop-blur-sm hover:bg-white hover:text-black hover:border-white px-8 py-4 rounded-full text-xs tracking-widest uppercase transition-all duration-300 cursor-pointer"
            >
              Bước vào không gian
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </div>

        {/* NÚT ĐIỀU HƯỚNG CHẤM TRÒN BOTTOM SLIDE */}
        <div className="flex justify-center items-center gap-3 pointer-events-auto mb-4 z-50">
          <button 
            onClick={() => setCurrentIdx(0)} 
            className={`dot h-2 rounded-full transition-all duration-300 cursor-pointer ${currentIdx === 0 ? 'w-6 bg-white' : 'w-2 bg-white/40'}`}
          ></button>
          <button 
            onClick={() => setCurrentIdx(1)} 
            className={`dot h-2 rounded-full transition-all duration-300 cursor-pointer ${currentIdx === 1 ? 'w-6 bg-white' : 'w-2 bg-white/40'}`}
          ></button>
          <button 
            onClick={() => setCurrentIdx(2)} 
            className={`dot h-2 rounded-full transition-all duration-300 cursor-pointer ${currentIdx === 2 ? 'w-6 bg-white' : 'w-2 bg-white/40'}`}
          ></button>
        </div>
      </div>

    </div>
  );
}