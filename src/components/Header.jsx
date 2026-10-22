import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { getCurrentUser, logout } from '../utils/apiClient';

gsap.registerPlugin(ScrollToPlugin);

export default function Header({ showBackBtn = true }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, [location.pathname]);

  const handleNavClick = (e, targetHash, targetPath = '/home') => {
    e.preventDefault();

    // Nếu đang ở trang /home thì cuộn mượt bằng GSAP
    if (location.pathname === '/home' || location.pathname === '/') {
      const targetElement = document.querySelector(targetHash);
      if (targetElement) {
        gsap.to(window, {
          duration: 1.2,
          scrollTo: { y: targetElement, offsetY: 80 }, // 80px để bù trừ chiều cao của Header
          ease: 'power4.out'
        });
      } else if (targetHash === '#top') {
        gsap.to(window, { duration: 1.2, scrollTo: 0, ease: 'power4.out' });
      }
    } else {
      // Nếu đang ở trang khác thì điều hướng về /home kèm hash
      navigate(`${targetPath}${targetHash}`);
      // Đợi 1 chút để trang render xong rồi mới cuộn
      setTimeout(() => {
        const targetElement = document.querySelector(targetHash);
        if (targetElement) {
          gsap.to(window, { duration: 1.2, scrollTo: { y: targetElement, offsetY: 80 }, ease: 'power4.out' });
        }
      }, 300);
    }
  };

  const handleLogout = () => {
    if (!window.confirm('Bạn có chắc muốn đăng xuất?')) return;
    logout();
    navigate('/');
  };

  const isCustomer = user && ['customer_free', 'customer_pro'].includes(user.role);

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
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
        )}

        <div onClick={() => handleNavClick({ preventDefault: () => {} }, '#top')} className="group flex items-center cursor-pointer select-none">
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
          onClick={(e) => handleNavClick(e, '#portfolio')}
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
        <button
          type="button"
          onClick={() => navigate('/ai-studio')}
          className={`transition-colors bg-transparent border-none cursor-pointer outline-none uppercase font-medium tracking-widest text-xs ${
            location.pathname === '/ai-studio' ? 'text-white font-bold' : 'text-amber-400 hover:text-amber-300'
          }`}
        >
          AI Studio
        </button>
      </nav>

      {/* KHỐI USER + ĐĂNG XUẤT */}
      <div className="flex items-center gap-3">
        {isCustomer && (
          <div className="hidden lg:flex flex-col items-end mr-1 select-none">
            <span className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
              {user.username}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold">
              {user.role === 'customer_pro' ? 'Pro' : 'Free'}
            </span>
          </div>
        )}

        {isCustomer ? (
          <button
            type="button"
            onClick={handleLogout}
            className="text-[10px] md:text-xs tracking-widest uppercase font-bold text-red-400 hover:text-white hover:bg-red-900/40 border border-red-900/40 px-4 py-2 rounded-full transition-all duration-300 cursor-pointer outline-none"
          >
            Đăng xuất
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-[10px] md:text-xs tracking-widest uppercase font-bold text-white/60 hover:text-white border border-white/10 px-4 py-2 rounded-full transition-all duration-300 cursor-pointer outline-none"
          >
            Đăng nhập
          </button>
        )}
      </div>
    </header>
  );
}