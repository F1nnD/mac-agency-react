import { api } from './apiClient';

// Bọc các lệnh gọi chia sẻ / concept board
export const shareApi = {
  // Chủ sở hữu: tạo (hoặc lấy lại) liên kết chia sẻ → { token, path }
  create: async (renderId) => (await api.post(`/api/studio/renders/${renderId}/share`, {})).data,
  // Chủ sở hữu: thu hồi liên kết
  revoke: (renderId) => api.delete(`/api/studio/renders/${renderId}/share`),
  // Công khai: đọc bản chia sẻ đã làm sạch
  getShared: async (token) => (await api.get(`/api/share/${encodeURIComponent(token)}`)).data,
  // Chủ sở hữu: dữ liệu đầy đủ (bản dành cho khách) để dựng concept board
  getRender: async (id) => (await api.get(`/api/studio/renders/${encodeURIComponent(id)}`)).data
};

export const shareUrl = (path) => `${window.location.origin}${path}`;
