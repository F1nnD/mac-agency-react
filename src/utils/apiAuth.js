// Các lời gọi API tài khoản/bảo mật (bổ sung cho apiClient.js)
import { api, API_BASE_URL } from './apiClient';

async function postPublic(path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.success === false) {
    const err = new Error(data?.message || `Lỗi ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// Đăng ký có gửi sự đồng ý (consent) và lưu phiên đăng nhập như registerUser
export async function registerWithConsent({ username, password, fullName, email, consent }) {
  const data = await postPublic('/api/auth/register', { username, password, fullName, email, consent });
  localStorage.setItem('mac_token', data.token);
  localStorage.setItem('mac_user', JSON.stringify(data.user));
  return data;
}

export const forgotPassword = (email) => postPublic('/api/auth/forgot-password', { email });
export const resetPassword = (token, password) => postPublic('/api/auth/reset-password', { token, password });

// Xuất dữ liệu cá nhân và tải về thành tệp JSON
export async function exportMyData() {
  const data = await api.get('/api/auth/me/export');
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'du-lieu-cua-toi.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return data;
}

// DELETE kèm nội dung (api.delete của apiClient không gửi body)
export async function deleteMyAccount(password) {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('mac_token') || ''}`
    },
    body: JSON.stringify({ password })
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.success === false) {
    const err = new Error(data?.message || `Lỗi ${res.status}`);
    err.status = res.status;
    throw err;
  }
  localStorage.removeItem('mac_token');
  localStorage.removeItem('mac_user');
  return data;
}
