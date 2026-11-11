import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../utils/apiAuth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await forgotPassword(email.trim());
      setDone(data?.message || 'Nếu email đã đăng ký tài khoản, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.');
    } catch (err) {
      setError(err.message || 'Không gửi được yêu cầu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-dvh bg-[#0b0b0b] text-gray-300 antialiased overflow-x-hidden flex items-center justify-center px-4 py-10 sm:p-6 relative font-sans">
      <div className="max-w-sm w-full bg-black/60 border border-white/5 p-6 sm:p-8 rounded-2xl shadow-2xl backdrop-blur-md space-y-6">
        <div className="text-center space-y-2 select-none">
          <div className="text-xl font-bold tracking-[0.2em] text-white uppercase">Quên mật khẩu</div>
          <p className="text-[11px] tracking-wider text-neutral-500">Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl text-center leading-snug">{error}</div>
        )}

        {done ? (
          <div className="bg-amber-400/10 border border-amber-400/20 text-amber-300 text-sm px-4 py-4 rounded-xl leading-relaxed">
            {done}
            <p className="text-[12px] text-neutral-400 mt-2">Hãy kiểm tra cả thư mục Spam. Liên kết chỉ dùng được một lần.</p>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="email@example.com"
                className="w-full min-h-11 bg-zinc-900/20 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white placeholder-neutral-700 focus:outline-none focus:border-amber-400/60 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-11 bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold uppercase tracking-widest py-4 rounded-xl transition-all cursor-pointer border-none outline-none disabled:opacity-50"
            >
              {loading ? 'Đang gửi...' : 'Gửi liên kết đặt lại'}
            </button>
          </form>
        )}

        <div className="text-center text-[12px] text-neutral-500 pt-3 border-t border-white/5">
          <Link to="/login" className="inline-flex items-center min-h-11 text-amber-400 hover:text-amber-300 font-semibold">
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
