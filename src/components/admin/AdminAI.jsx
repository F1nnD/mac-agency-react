import React, { useEffect, useRef, useState } from 'react';
import { askAdminAI } from "../../utils/apiClient";

// Nhãn tầng AI do backend trả về trong `data.tier`
const TIER_LABEL = { admin: 'AI tầng quản trị', staff: 'AI tầng nhân viên' };

export default function AdminAI() {
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(-1);
  const endRef = useRef(null);
  const copyTimer = useRef(null);

  // Tự cuộn xuống tin mới nhất (cuộn tức thì nếu người dùng chọn giảm chuyển động)
  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    endRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' });
  }, [messages, loading]);

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  const handleCopy = async (text, idx) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedIdx(idx);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedIdx(-1), 1500);
    } catch (err) {
      console.error('Không sao chép được:', err);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || loading) return;

    const msg = chatInput.trim();
    setChatInput('');
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', text: msg }]);

    try {
      // Gọi hàm askAdminAI (Tầng 3 - Đầu chuỗi). Chỉ gửi các trường cũ của lịch sử chat.
      const data = await askAdminAI({
        userMessage: msg,
        chatHistory: messages.map(({ role, text, image }) => ({ role, text, image }))
      });

      setMessages(prev => [...prev, { role: 'ai', text: data.replyText, image: data.aiImageUrl, tier: data.tier }]);
    } catch (err) {
      console.error("Lỗi API:", err);
      setMessages(prev => [...prev, { role: 'ai', text: `Lỗi chi tiết: ${err.message}`, isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tab-content-anim w-full max-w-5xl mx-auto flex flex-col gap-3 md:gap-4 h-[calc(100dvh-5.5rem)] sm:h-[calc(100dvh-6.5rem)] md:h-[calc(100dvh-5rem)] xl:h-[calc(100dvh-6rem)] min-h-[360px]">
      <div className="border-b border-white/5 pb-3 md:pb-5 shrink-0">
        <span className="text-[10px] tracking-[0.3em] text-amber-400 uppercase font-semibold">Admin Exclusive</span>
        <h1 className="text-xl md:text-2xl font-light text-white uppercase mt-1">Trợ Lý AI Nội Bộ</h1>
        <p className="hidden sm:block text-xs text-gray-500 mt-2">Phân tích dữ liệu, hỗ trợ thiết kế và tính toán BOQ. Không giới hạn.</p>
      </div>

      <div className="flex-1 min-h-0 bg-zinc-900/30 border border-amber-500/20 rounded-2xl flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 md:p-6 space-y-4" aria-live="polite">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 px-2">
              <h4 className="text-lg font-bold text-white">Chào sếp! Tôi có thể giúp gì hôm nay?</h4>
              <p className="text-sm text-gray-400">Gõ thử: "Tính dự toán quán cafe 200m2" hoặc "Tư vấn kết cấu nhà phố"</p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] md:max-w-[80%] min-w-0 rounded-2xl px-4 md:px-5 py-3 text-sm ${
                  m.role === 'user'
                    ? 'bg-amber-500 text-black rounded-tr-sm'
                    : m.isError
                      ? 'bg-red-950/60 text-red-300 rounded-tl-sm border border-red-500/30'
                      : 'bg-zinc-800 text-gray-200 rounded-tl-sm border border-white/5'
                }`}>
                  {m.role === 'ai' && !m.isError && m.tier && (
                    <span className="inline-block mb-2 text-[9px] font-bold uppercase tracking-widest text-amber-400 border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 rounded">
                      {TIER_LABEL[m.tier] || `AI tầng ${m.tier}`}
                    </span>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  {m.image && (
                    <img src={m.image} alt="Render" className="mt-3 rounded-lg w-full object-cover border border-white/10" />
                  )}
                  {m.role === 'ai' && m.text && (
                    <button
                      type="button"
                      onClick={() => handleCopy(m.text, i)}
                      className="mt-2 -mb-1 min-h-11 px-3 -ml-3 text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      {copiedIdx === i ? 'Đã sao chép' : 'Sao chép'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div role="status" className="text-amber-400 text-xs motion-safe:animate-pulse">AI đang trả lời…</div>
          )}
          <div ref={endRef} />
        </div>

        {/* Ô nhập dính đáy khung chat; khung chat co theo 100dvh nên luôn nằm trên bàn phím */}
        <div className="shrink-0 p-3 md:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-white/5 bg-black/40">
          <form onSubmit={handleSend} className="flex gap-2 md:gap-3">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Nhập lệnh hoặc câu hỏi..."
              enterKeyHint="send"
              autoComplete="off"
              className="flex-1 min-w-0 min-h-11 bg-black/60 border border-white/10 rounded-xl px-4 md:px-5 text-base md:text-sm text-white focus:outline-none focus:border-amber-400/50"
            />
            <button type="submit" disabled={loading || !chatInput.trim()} className="min-h-11 shrink-0 bg-amber-500 hover:bg-amber-400 text-black px-5 md:px-6 rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer">
              {loading ? 'Đang gửi' : 'Gửi'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
