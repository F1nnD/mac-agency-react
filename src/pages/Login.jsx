import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import gsap from 'gsap';
import { loginUser } from '../utils/apiClient';

export default function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    gsap.fromTo('.login-box-anim', { opacity: 0, y: 20 }, { duration: 1.2, opacity: 1, y: 0, ease: 'power3.out' });
    gsap.fromTo('.back-btn-anim', { x: -10, opacity: 0 }, { duration: 1, x: 0, opacity: 1, ease: 'power2.out', delay: 0.3 });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await loginUser({ username: username.trim(), password: password.trim() });

      // Điều hướng theo role
      const role = data.user?.role || 'customer_free';

      gsap.to('.login-box-anim', {
        duration: 0.5,
        opacity: 0,
        scale: 0.95,
        ease: 'power3.in',
        onComplete: () => {
          if (['admin', 'staff'].includes(role)) {
            navigate('/admin/dashboard');
          } else {
            navigate('/index');
          }
        }
      });
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại.');
      gsap.fromTo('.login-box-anim',
        { x: -6 },
        { duration: 0.1, x: 6, repeat: 5, yoyo: true, ease: 'linear', onComplete: () => gsap.set('.login-box-anim', { x: 0 }) }
      );
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
        Quay lại
      </button>

      <div className="login-box-anim max-w-sm w-full bg-black/60 border border-white/5 p-8 py-10 rounded-2xl shadow-2xl backdrop-blur-md relative z-10 space-y-6">
        <div className="text-center space-y-2 select-none">
          <div className="text-xl font-bold tracking-[0.25em] text-white uppercase">Đăng Nhập MAC</div>
          <p className="text-[10px] tracking-wider text-neutral-500 uppercase font-medium">Dành cho khách hàng & quản trị</p>
          <div className="w-8 h-[1px] bg-white/10 mx-auto mt-3"></div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] px-4 py-3 rounded-xl text-center leading-tight tracking-wide font-medium select-none">
            {error}
          </div>
        )}

        <form className="space-y-5 text-left" onSubmit={handleLogin}>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block">Tên đăng nhập</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="admin hoặc khach01"
              autoComplete="username"
              className="w-full bg-zinc-900/20 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white font-mono placeholder-neutral-700 focus:outline-none focus:border-white/30 transition-all duration-300"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block">Mật khẩu</label>
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

        <div className="text-center text-[11px] text-neutral-500 pt-3 border-t border-white/5">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-semibold">
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
}