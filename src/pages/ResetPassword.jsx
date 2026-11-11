import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../utils/apiAuth';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }
    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message || 'Không đặt lại được mật khẩu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full min-h-11 bg-zinc-900/20 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white font-mono placeholder-neutral-700 focus:outline-none focus:border-amber-400/60 transition-all';

  return (
    <div className="w-full min-h-dvh bg-[#0b0b0b] text-gray-300 antialiased overflow-x-hidden flex items-center justify-center px-4 py-10 sm:p-6 relative font-sans">
      <div className="max-w-sm w-full bg-black/60 border border-white/5 p-6 sm:p-8 rounded-2xl shadow-2xl backdrop-blur-md space-y-6">
        <div className="text-center space-y-2 select-none">
          <div className="text-xl font-bold tracking-[0.2em] text-white uppercase">Đặt lại mật khẩu</div>
          <p className="text-[11px] tracking-wider text-neutral-500">Nhập mật khẩu mới cho tài khoản của bạn.</p>
        </div>

        {!token ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-4 rounded-xl leading-relaxed">
            Liên kết không hợp lệ hoặc thiếu mã đặt lại. Vui lòng{' '}
            <Link to="/forgot-password" className="underline text-amber-400">yêu cầu liên kết mới</Link>.
          </div>
        ) : done ? (
          <div className="bg-amber-400/10 border border-amber-400/20 text-amber-300 text-sm px-4 py-4 rounded-xl leading-relaxed">
            Đã đặt lại mật khẩu. Mọi thiết bị đang đăng nhập đã được đăng xuất. Đang chuyển tới trang đăng nhập...
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl text-center leading-snug">{error}</div>
            )}
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block">Mật khẩu mới (tối thiểu 8 ký tự)</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" placeholder="••••••••" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block">Nhập lại mật khẩu mới</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" placeholder="••••••••" className={inputCls} />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-11 bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold uppercase tracking-widest py-4 rounded-xl transition-all cursor-pointer border-none outline-none disabled:opacity-50"
              >
                {loading ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
              </button>
            </form>
          </>
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
