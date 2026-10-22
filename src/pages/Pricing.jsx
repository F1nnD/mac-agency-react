import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { getCurrentUser, isPro } from '../utils/apiClient';

const FREE_FEATURES = [
  'Chat tư vấn với AI KTS (5 lượt/ngày)',
  'Tư vấn ngôn ngữ thiết kế chuyên ngành',
  'Xem portfolio dự án đầy đủ',
  'Tra cứu bảng giá tham khảo',
  'Sử dụng bộ tính giá cơ bản'
];

const PRO_FEATURES = [
  'Tất cả tính năng của gói Free',
  'Chat AI không giới hạn nội dung (20 lượt/ngày)',
  'AI tạo phối cảnh 3D 8K (FLUX)',
  'Bóc tách dự toán chi phí tự động',
  'Ưu tiên phản hồi từ AI chuyên sâu',
  'Hỗ trợ kỹ thuật ưu tiên'
];

export default function Pricing() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const userIsPro = isPro();

  return (
    <div className="w-full min-h-screen bg-[#0b0b0b] text-gray-300 antialiased overflow-x-hidden font-sans">
      <Header showBackBtn={true} />

      <main className="pt-32 pb-24 px-6 md:px-16 max-w-6xl mx-auto w-full">
        <div className="text-center mb-16 select-none">
          <span className="text-[10px] tracking-[0.4em] text-white/30 uppercase block mb-3 font-semibold">Pricing Plans</span>
          <h1 className="text-4xl md:text-5xl font-light text-white uppercase leading-tight">
            Nâng Cấp Trải Nghiệm AI
          </h1>
          <p className="text-sm text-neutral-500 mt-4 max-w-xl mx-auto">
            Chọn gói phù hợp để khai thác tối đa sức mạnh của KTS AI MAC Concept.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* FREE */}
          <div className="bg-zinc-900/20 border border-white/5 rounded-2xl p-8 flex flex-col justify-between hover:border-white/10 transition-all">
            <div className="space-y-6">
              <div>
                <span className="text-[10px] tracking-widest text-white/30 uppercase font-mono block">Gói cơ bản</span>
                <h2 className="text-2xl font-bold text-white uppercase mt-2">Free</h2>
              </div>
              <div className="py-3 border-y border-white/5">
                <span className="text-3xl font-bold text-white font-mono">0đ</span>
                <span className="text-xs text-white/40 ml-2">/ mãi mãi</span>
              </div>
              <ul className="space-y-3">
                {FREE_FEATURES.map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs text-neutral-400">
                    <span className="text-white/30 pt-0.5">—</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-8">
              {!user ? (
                <button
                  onClick={() => navigate('/register')}
                  className="w-full border border-white/20 bg-black/20 text-white text-[11px] font-bold uppercase tracking-widest py-3.5 rounded-xl hover:bg-white/5 transition-all"
                >
                  Đăng ký miễn phí
                </button>
              ) : (
                <div className="text-center text-[10px] uppercase tracking-widest text-white/40 py-3">
                  {user.role === 'customer_free' ? 'Gói hiện tại của bạn' : 'Gói cơ bản'}
                </div>
              )}
            </div>
          </div>

          {/* PRO */}
          <div className="bg-gradient-to-br from-emerald-950/40 to-zinc-900/20 border border-emerald-500/30 rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden hover:border-emerald-400/50 transition-all">
            <div className="absolute top-4 right-4 text-[9px] tracking-widest uppercase text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
              Nổi bật
            </div>

            <div className="space-y-6">
              <div>
                <span className="text-[10px] tracking-widest text-emerald-400 uppercase font-mono block">Gói chuyên sâu</span>
                <h2 className="text-2xl font-bold text-white uppercase mt-2">Pro</h2>
              </div>
              <div className="py-3 border-y border-emerald-500/20">
                <span className="text-3xl font-bold text-emerald-400 font-mono">Liên hệ</span>
                <span className="text-xs text-white/40 ml-2">/ theo dự án</span>
              </div>
              <ul className="space-y-3">
                {PRO_FEATURES.map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs text-neutral-300">
                    <span className="text-emerald-400 pt-0.5">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-8">
              {userIsPro ? (
                <div className="text-center text-[10px] uppercase tracking-widest text-emerald-400 py-3 font-bold">
                  Bạn đang dùng gói Pro
                </div>
              ) : (
                <a
                  href="https://zalo.me/0375075975"
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-bold uppercase tracking-widest py-3.5 rounded-xl transition-all text-center"
                >
                  Liên hệ nâng cấp
                </a>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-neutral-600 mt-12 italic">
          * Giới hạn lượt dùng AI được reset vào 00:00 mỗi ngày.
        </p>
      </main>
    </div>
  );
}