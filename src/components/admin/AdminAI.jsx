import React, { useState } from 'react';
import { askAdminAI } from "../../utils/apiClient";
export default function AdminAI() {
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || loading) return;

    const msg = chatInput.trim();
    setChatInput('');
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', text: msg }]);

    try {
      // Admin luôn dùng endpoint Pro (quyền cao nhất)
            // Gọi hàm askAdminAI (Tầng 3 - Đầu chuỗi)
            const data = await askAdminAI({
                userMessage: msg,
                chatHistory: messages
              });

              setMessages(prev => [...prev, { role: 'ai', text: data.replyText, image: data.aiImageUrl }]);
            } catch (err) {
              console.error("Lỗi API:", err);
              setMessages(prev => [...prev, { role: 'ai', text: `Lỗi chi tiết: ${err.message}` }]);
            } finally {
              setLoading(false);
            }
  };

  return (
    <div className="tab-content-anim space-y-6 w-full max-w-5xl mx-auto">
      <div className="flex items-center justify-between border-b border-white/5 pb-5">
        <div>
          <span className="text-[10px] tracking-[0.3em] text-amber-400 uppercase font-semibold">Admin Exclusive</span>
          <h1 className="text-2xl font-light text-white uppercase mt-1">Trợ Lý AI Nội Bộ</h1>
          <p className="text-xs text-gray-500 mt-2">Phân tích dữ liệu, hỗ trợ thiết kế và tính toán BOQ. Không giới hạn.</p>
        </div>
      </div>

      <div className="bg-zinc-900/30 border border-amber-500/20 rounded-2xl flex flex-col h-[600px]">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
              <h4 className="text-lg font-bold text-white">Chào sếp! Tôi có thể giúp gì hôm nay?</h4>
              <p className="text-sm text-gray-400">Gõ thử: "Tính dự toán quán cafe 200m2" hoặc "Tư vấn kết cấu nhà phố"</p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm ${
                  m.role === 'user' ? 'bg-amber-500 text-black rounded-tr-sm' : 'bg-zinc-800 text-gray-200 rounded-tl-sm border border-white/5'
                }`}>
                  <p>{m.text}</p>
                  {m.image && (
                    <img src={m.image} alt="Render" className="mt-3 rounded-lg w-full object-cover border border-white/10" />
                  )}
                </div>
              </div>
            ))
          )}
          {loading && <div className="text-amber-400 text-xs animate-pulse">AI đang phân tích...</div>}
        </div>

        <div className="p-4 border-t border-white/5 bg-black/40 rounded-b-2xl">
          <form onSubmit={handleSend} className="flex gap-3">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Nhập lệnh hoặc câu hỏi..."
              className="flex-1 bg-black/60 border border-white/10 rounded-xl px-5 py-3 text-sm text-white focus:outline-none focus:border-amber-400/50"
            />
            <button type="submit" disabled={loading} className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
              Gửi
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}