// API nhập file, giá cũ và CRM telesale (khu vực C)
import { api, API_BASE_URL } from './apiClient';

export const importApi = {
  materials: (rows, dryRun) => api.post('/api/import/materials', { rows, dryRun }),
  marketPrices: (rows, dryRun) => api.post('/api/import/market-prices', { rows, dryRun }),

  // File mẫu cần token nên tải bằng fetch rồi lưu qua Blob
  async downloadTemplate(kind, filename) {
    const token = localStorage.getItem('mac_token');
    const res = await fetch(`${API_BASE_URL}/api/import/template/${kind}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error('Không tải được file mẫu.');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};

export const crmApi = {
  stalePrices: (days = 120) => api.get(`/api/crm/stale-prices?days=${days}`),
  staff: () => api.get('/api/crm/staff'),
  assign: (leadId, userId) => api.put(`/api/crm/leads/${leadId}/assign`, { userId: userId || null }),
  followUp: (leadId, followUpAt, note = '') => api.put(`/api/crm/leads/${leadId}/follow-up`, { followUpAt: followUpAt || null, note }),
  contact: (leadId, body = {}) => api.post(`/api/crm/leads/${leadId}/contact`, body),
  followUps: (scope = 'mine', due = '') => api.get(`/api/crm/follow-ups?scope=${scope}${due ? `&due=${due}` : ''}`),
  board: () => api.get('/api/crm/board')
};

// ---- Tiện ích hiển thị ----
// Số điện thoại → liên kết Zalo (0912345678 → https://zalo.me/84912345678)
export function zaloUrl(phone) {
  let digits = String(phone || '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('0')) digits = `84${digits.slice(1)}`;
  return digits ? `https://zalo.me/${digits}` : '';
}

// ISO → giá trị cho <input type="datetime-local"> theo giờ Việt Nam
export function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const vn = new Date(d.getTime() + 7 * 3600000);
  return vn.toISOString().slice(0, 16);
}

// Giá trị datetime-local (giờ VN) → ISO
export function fromLocalInput(value) {
  return value ? new Date(`${value}:00+07:00`).toISOString() : null;
}

export const formatDateTimeVN = iso =>
  iso ? new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false }) : '';

export const isOverdue = lead =>
  !!lead?.followUpAt && !['converted', 'lost'].includes(lead.status) && new Date(lead.followUpAt).getTime() < Date.now();

export const formatMoney = n => `${Math.round(Number(n) || 0).toLocaleString('vi-VN')}đ`;
