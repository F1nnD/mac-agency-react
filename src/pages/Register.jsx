import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import gsap from 'gsap';
import { registerUser } from '../utils/apiClient';

export default function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    gsap.fromTo('.register-box-anim', { opacity: 0, y: 20 }, { duration: 1.2, opacity: 1, y: 0, ease: 'power3.out' });
    gsap.fromTo('.back-btn-anim', { x: -10, opacity: 0 }, { duration: 1, x: 0, opacity: 1, ease: 'power2.out', delay: 0.3 });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);

    try {
      const data = await registerUser({ username, password, fullName, email });

      gsap.to('.register-box-anim', {
        duration: 0.5,
        opacity: 0,
        scale: 0.95,
        ease: 'power3.in',
        onComplete: () => navigate('/index')
      });

      console.log('Đăng ký thành công:', data.user);
    } catch (err) {
      setError(err.message || 'Lỗi đăng ký. Vui lòng thử lại.');
      gsap.fromTo('.register-box-anim',
        { x: -6 },
        { duration: 0.1, x: 6, repeat: 5, yoyo: true, ease: 'linear', onComplete: () => gsap.set('.register-box-anim', { x: 0 }) }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen bg-[#0b0b0b] text-gray-300 antialiased overflow-hidden flex items-center justify-center p-6 relative font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-500/[0.02] rounded-full blur-[100px] pointer-events-none z-0"></div>

      <button
        onClick={() => navigate('/')}
        className="back-btn-anim absolute top-8 left-6 md:left-12 flex items-center gap-2 text-xs tracking-widest uppercase text-white/40 hover:text-white transition-colors duration-300 select-none z-10 bg-transparent border-none cursor-pointer outline-none font-semibold"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Quay lại
      </button>

      <div className="register-box-anim max-w-md w-full bg-black/60 border border-white/5 p-8 py-10 rounded-2xl shadow-2xl backdrop-blur-md relative z-10 space-y-6">
        <div className="text-center space-y-2 select-none">
          <div className="text-xl font-bold tracking-[0.25em] text-white uppercase">Đăng Ký Tài Khoản</div>
          <p className="text-[10px] tracking-wider text-neutral-500 uppercase font-medium">Trở thành khách hàng của MAC Concept</p>
          <div className="w-8 h-[1px] bg-white/10 mx-auto mt-3"></div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] px-4 py-3 rounded-xl text-center leading-tight tracking-wide font-medium select-none">
            {error}
          </div>
        )}

        <form className="space-y-4 text-left" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block">Họ và tên</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full bg-zinc-900/20 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-neutral-700 focus:outline-none focus:border-white/30 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full bg-zinc-900/20 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-neutral-700 focus:outline-none focus:border-white/30 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block">Tên đăng nhập *</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="khach01"
              autoComplete="username"
              className="w-full bg-zinc-900/20 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono placeholder-neutral-700 focus:outline-none focus:border-white/30 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block">Mật khẩu *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full bg-zinc-900/20 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono placeholder-neutral-700 focus:outline-none focus:border-white/30 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block">Xác nhận *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full bg-zinc-900/20 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono placeholder-neutral-700 focus:outline-none focus:border-white/30 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest py-4 rounded-xl transition-all duration-300 shadow-lg flex items-center justify-center gap-2 cursor-pointer border-none outline-none disabled:opacity-50 mt-2"
          >
            {loading ? 'Đang tạo tài khoản...' : 'Đăng ký ngay'}
          </button>
        </form>

        <div className="text-center text-[11px] text-neutral-500 pt-3 border-t border-white/5">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold">
            Đăng nhập
          </Link>
        </div>

        <p className="text-[9px] italic text-neutral-600 text-center select-none">
          * Tài khoản mặc định là Free. Nâng cấp Pro để dùng AI tạo phối cảnh 3D.
        </p>
      </div>
    </div>
  );
}