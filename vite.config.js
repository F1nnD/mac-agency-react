import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // Import trực tiếp Tailwind v4

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Kích hoạt ở đây là xong, tự động quét sạch các file .jsx
  ],
  // Mở khóa cấu hình Server để expose cổng Network ra mạng Wi-Fi nội bộ
  server: {
    host: true,
    port: 3000,          // ← Đổi từ 5173 sang 3000
    strictPort: true,    // ← Nếu port bận thì BÁO LỖI, không tự nhảy port khác
    open: false          // ← Không tự mở browser (tuỳ chọn)
  },
  preview: {
    port: 3000,
    strictPort: true
  }
})