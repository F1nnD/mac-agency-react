import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showError, setShowError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    gsap.fromTo(".login-box-anim", { opacity: 0, y: 20 }, { duration: 1.2, opacity: 1, y: 0, ease: "power3.out" });
    gsap.fromTo(".back-btn-anim", { x: -10, opacity: 0 }, { duration: 1, x: 0, opacity: 1, ease: "power2.out", delay: 0.3 });
  }, []);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setShowError(false);

    try {
      // 1. Thử gọi API xác thực trên Database MongoDB
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() })
      });

      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem('mac_admin_user', JSON.stringify(data.user || { username }));
        
        gsap.to(".login-box-anim", {
          duration: 0.5,
          opacity: 0,
          scale: 0.95,
          ease: "power3.in",
          onComplete: () => {
            navigate('/admin/dashboard');
          }
        });
        return;
      }
      throw new Error("API Auth thất bại, chuyển sang kiểm tra tài khoản master...");
    } catch (err) {
      // 2. Tài khoản Master Fallback phòng trường hợp DB rỗng hoặc mạng lag
      if (username.trim() === 'admin' && password.trim() === 'mac2026') {
        setShowError(false);
        sessionStorage.setItem('mac_admin_user', JSON.stringify({ username: 'admin', role: 'Chủ doanh nghiệp (Admin)' }));

        gsap.to(".login-box-anim", {
          duration: 0.5,
          opacity: 0,
          scale: 0.95,
          ease: "power3.in",
          onComplete: () => {
            navigate('/admin/dashboard');
          }
        });
      } else {
        setShowError(true);
        gsap.fromTo(".login-box-anim", 
          { x: -6 }, 
          { duration: 0.1, x: 6, repeat: 5, yoyo: true, ease: "linear", onComplete: () => gsap.set(".login-box-anim", { x: 0 }) }
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen bg-[#0b0b0b] text-gray-300 antialiased overflow-hidden flex items-center justify-center p-6 relative font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-white/[0.015] rounded-full blur-[100px] pointer-events-none z-0"></div>

      <button 
        onClick={() => navigate('/')}
        className="back-btn-anim absolute top-8 left-6 md:left-12 flex items-center gap-2 text-xs tracking-widest uppercase text-white/40 hover:text-white transition-colors duration-300 select-none z-10 bg-transparent border-none cursor-pointer outline-none font-semibold"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Quay lại cổng phân luồng
      </button>

      <div className="login-box-anim max-w-sm w-full bg-black/60 border border-white/5 p-8 py-10 rounded-2xl shadow-2xl backdrop-blur-md relative z-10 space-y-6">
        <div className="text-center space-y-2 select-none">
          <div className="text-xl font-bold tracking-[0.25em] text-white uppercase">HỆ THỐNG QUẢN TRỊ</div>
          <p className="text-[10px] tracking-wider text-neutral-500 uppercase font-medium">Vui lòng điền thông tin định danh nội bộ MAC</p>
          <div className="w-8 h-[1px] bg-white/10 mx-auto mt-3"></div>
        </div>

        {showError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] px-4 py-3 rounded-xl text-center leading-tight tracking-wide font-medium animate-pulse select-none">
            Tài khoản hoặc mật mã quản trị không chính xác.
          </div>
        )}

        <form className="space-y-5 text-left" onSubmit={handleAdminLogin}>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block">Tên đăng nhập (Username)</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
              placeholder="admin" 
              autoComplete="username" 
              className="w-full bg-zinc-900/20 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white font-mono placeholder-neutral-700 focus:outline-none focus:border-white/30 transition-all duration-300" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block">Mật mã bảo mật (Password)</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              placeholder="••••••••" 
              autoComplete="current-password" 
              className="w-full bg-zinc-900/20 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white font-mono placeholder-neutral-700 focus:outline-none focus:border-white/30 transition-all duration-300" 
            />
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest py-4 rounded-xl transition-all duration-300 shadow-lg flex items-center justify-center gap-2 cursor-pointer border-none outline-none disabled:opacity-50"
            >
              {loading ? 'Đang xác thực...' : 'Truy cập'}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </form>

        <p className="text-[8px] italic text-neutral-600 text-center select-none pt-2 border-t border-white/5">* Thiết bị truy cập được ghi nhận nhật ký hệ thống bảo mật của MAC *</p>
      </div>
    </div>
  );
}