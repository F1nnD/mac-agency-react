import React from 'react';

// Ô đồng ý bắt buộc khi đăng ký; liên kết mở tab mới để không mất dữ liệu đang nhập
export default function ConsentCheckbox({ checked, onChange }) {
  return (
    <label className="flex items-start gap-3 min-h-11 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required
        className="mt-1 w-5 h-5 shrink-0 accent-amber-400 cursor-pointer"
      />
      <span className="text-[12px] leading-relaxed text-gray-400">
        Tôi đã đọc và đồng ý với{' '}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline underline-offset-2 hover:text-amber-300">
          Chính sách quyền riêng tư
        </a>{' '}
        và{' '}
        <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline underline-offset-2 hover:text-amber-300">
          Điều khoản sử dụng
        </a>
        , gồm việc MAC Concept thu thập, xử lý dữ liệu của tôi (kể cả bằng AI) và liên hệ tư vấn lại.
      </span>
    </label>
  );
}
