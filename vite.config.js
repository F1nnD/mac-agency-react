import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // Import trực tiếp Tailwind v4

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Kích hoạt ở đây là xong, tự động quét sạch các file .jsx
  ],
  // ĐA THÊM: Mở khóa cấu hình Server để expose cổng Network ra mạng Wi-Fi nội bộ
  server: {
    host: true,
    port: 5173 // Khóa cứng cổng 5173 cho đồng bộ hệ thống
  }
})