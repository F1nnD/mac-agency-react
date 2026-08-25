import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollToPlugin);

export default function Header({ showBackBtn = true }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (e, targetHash, targetPath = '/home') => {
    e.preventDefault();

    // Nếu đang ở đúng trang /home thì cuộn mượt bằng GSAP
    if (location.pathname === '/home') {
      const targetElement = document.querySelector(targetHash);
      if (targetElement) {
        gsap.to(window, {
          duration: 1.2,
          scrollTo: { y: targetElement, offsetY: 80 },
          ease: 'power4.out'
        });
      }
    } else {
      // Nếu đang ở trang khác thì điều hướng về /home kèm hash
      navigate(`${targetPath}${targetHash}`);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0b0b0b]/90 backdrop-blur-md border-b border-white/5 px-6 py-4 md:px-16 flex items-center justify-between w-full h-20 transition-all">
      {/* KHỐI LOGO VÀ NÚT QUAY LẠI */}
      <div className="flex items-center select-none">
        {showBackBtn && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            title="Quay lại"
            className="text-white/40 hover:text-white mr-3 md:mr-4 transform hover:-translate-x-1 transition-all duration-300 ease-out flex items-center justify-center bg-transparent border-none outline-none cursor-pointer p-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
              className="w-4 h-4 md:w-5 md:h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
          </button>
        )}

        <div
          onClick={() => navigate('/home')}
          className="group flex items-center cursor-pointer select-none"
        >
          <img
            src="/assets/pic/logo3.png"
            alt="MAC Logo"
            className="h-8 md:h-9 w-auto object-contain transition-opacity duration-300 group-hover:opacity-80 block"
          />
        </div>
      </div>

      {/* THANH ĐIỀU HƯỚNG MENU */}
      <nav className="hidden md:flex items-center gap-8 lg:gap-10 text-xs tracking-widest uppercase font-medium text-gray-400">
        <button
          type="button"
          onClick={(e) => handleNavClick(e, '#about')}
          className="hover:text-white transition-colors bg-transparent border-none cursor-pointer outline-none uppercase font-medium tracking-widest text-xs"
        >
          Giới Thiệu
        </button>
        <button
          type="button"
          onClick={(e) => handleNavClick(e, '#services')}
          className="hover:text-white transition-colors bg-transparent border-none cursor-pointer outline-none uppercase font-medium tracking-widest text-xs"
        >
          Dịch Vụ
        </button>
        <button
          type="button"
          onClick={() => navigate('/portfolio')}
          className={`transition-colors bg-transparent border-none cursor-pointer outline-none uppercase font-medium tracking-widest text-xs ${
            location.pathname === '/portfolio' ? 'text-white font-bold' : 'hover:text-white'
          }`}
        >
          Dự Án
        </button>
        <button
          type="button"
          onClick={(e) => handleNavClick(e, '#process')}
          className="hover:text-white transition-colors bg-transparent border-none cursor-pointer outline-none uppercase font-medium tracking-widest text-xs"
        >
          Quy Trình
        </button>
        <button
          type="button"
          onClick={(e) => handleNavClick(e, '#calculator')}
          className={`transition-colors bg-transparent border-none cursor-pointer outline-none uppercase font-medium tracking-widest text-xs ${
            location.pathname === '/packages' ? 'text-white font-bold' : 'hover:text-white'
          }`}
        >
          Bộ Tính Giá
        </button>
      </nav>
    </header>
  );
}