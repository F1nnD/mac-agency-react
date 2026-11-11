import React, { useState } from 'react';
import { shareApi, shareUrl } from '../utils/apiShare';

const btn = 'min-h-[44px] px-4 rounded-xl text-xs font-bold uppercase tracking-wider border transition-colors disabled:opacity-50';

// Chèn dưới kết quả diễn hoạ: chia sẻ liên kết công khai, thu hồi, xuất concept board (PDF)
export default function ShareActions({ renderId, title }) {
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  if (!renderId) return null;

  const create = async () => {
    setBusy(true); setMsg('');
    try {
      const { path } = await shareApi.create(renderId);
      const url = shareUrl(path);
      setLink(url);
      if (navigator.share) {
        try {
          await navigator.share({ title: title || 'Diễn hoạ không gian MAC Concept', text: 'Xem diễn hoạ không gian của tôi', url });
          setMsg('Đã mở hộp thoại chia sẻ.');
          return;
        } catch (e) {
          if (e?.name === 'AbortError') { setMsg('Liên kết đã sẵn sàng, bạn có thể sao chép.'); return; }
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        setMsg('Đã sao chép liên kết. Bất kỳ ai có liên kết đều xem được bản này.');
      } catch {
        setMsg('Hãy sao chép liên kết bên dưới. Bất kỳ ai có liên kết đều xem được bản này.');
      }
    } catch (e) {
      setMsg(e.message || 'Không tạo được liên kết chia sẻ.');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    if (!window.confirm('Thu hồi liên kết? Những người đang giữ liên kết sẽ không xem được nữa.')) return;
    setBusy(true); setMsg('');
    try {
      await shareApi.revoke(renderId);
      setLink('');
      setMsg('Đã thu hồi liên kết chia sẻ.');
    } catch (e) {
      setMsg(e.message || 'Không thu hồi được liên kết.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <h4 className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Chia sẻ & xuất file</h4>
      <div className="flex flex-col sm:flex-row gap-2">
        <button type="button" onClick={create} disabled={busy} className={`${btn} bg-amber-400 text-black border-amber-400 hover:bg-amber-300`}>
          Tạo liên kết chia sẻ
        </button>
        <button type="button" onClick={revoke} disabled={busy} className={`${btn} border-white/15 text-white/70 hover:bg-white/5`}>
          Thu hồi liên kết
        </button>
        <a href={`/board/${renderId}`} target="_blank" rel="noopener noreferrer"
           className={`${btn} border-amber-400/40 text-amber-400 hover:bg-amber-400/10 inline-flex items-center justify-center`}>
          Xuất concept board (PDF)
        </a>
      </div>
      {link && (
        <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Liên kết chia sẻ"
               className="w-full min-h-[44px] rounded-xl bg-black/40 border border-white/10 px-3 text-xs text-white/80" />
      )}
      {msg && <p role="status" className="text-xs text-neutral-400">{msg}</p>}
      <p className="text-[11px] text-neutral-500 leading-relaxed">
        Bản chia sẻ chỉ gồm ảnh, tóm tắt và khoảng giá sơ bộ; không có thông tin liên hệ hay chi tiết hạng mục.
      </p>
    </div>
  );
}
