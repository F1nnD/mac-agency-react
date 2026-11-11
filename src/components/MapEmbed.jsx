import React from 'react';

export const MAC_ADDRESS = '44 Nguyễn Văn Dung, Phường 6, Gò Vấp, TP. Hồ Chí Minh';

/**
 * Bản đồ Google nhúng, không cần API key.
 * Tải trễ (lazy) để không làm chậm trang; có nút "Chỉ đường" mở app Google Maps trên điện thoại.
 */
export default function MapEmbed({ address = MAC_ADDRESS, className = '' }) {
  const q = encodeURIComponent(address);
  return (
    <div className={`w-full ${className}`}>
      <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 aspect-[4/3] md:aspect-[21/9]">
        <iframe
          title="Bản đồ văn phòng MAC Concept"
          src={`https://www.google.com/maps?q=${q}&hl=vi&z=16&output=embed`}
          className="absolute inset-0 w-full h-full border-0 grayscale-[0.6] invert-[0.9] contrast-[0.9] hue-rotate-180"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-gray-400 font-light">📍 {address}</p>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${q}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center min-h-11 px-6 rounded-full border border-white/20 text-white text-xs tracking-widest uppercase font-semibold hover:bg-white hover:text-black transition-all"
        >
          Chỉ đường
        </a>
      </div>
    </div>
  );
}
