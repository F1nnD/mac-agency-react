const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getToken() {
  return localStorage.getItem('mac_token');
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('mac_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem('mac_token');
  localStorage.removeItem('mac_user');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (res.status === 401) {
    logout();
    if (window.location.pathname.startsWith('/admin')) {
      window.location.href = '/admin/login';
    }
    throw new Error(data?.message || 'Phiên đăng nhập đã hết hạn.');
  }

  if (!res.ok) {
    throw new Error(data?.message || `Lỗi ${res.status}`);
  }

  return data;
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' })
};
// =============================================================
// AUTH HELPERS
// =============================================================
export function isLoggedIn() {
    return !!localStorage.getItem('mac_token');
  }
  
  export function getUserRole() {
    const user = getCurrentUser();
    return user?.role || 'guest';
  }
  
  export function isPro() {
    const role = getUserRole();
    return ['admin', 'staff', 'customer_pro'].includes(role);
  }
  
  export function isAdmin() {
    return getUserRole() === 'admin';
  }
  
  export function isStaff() {
    return getUserRole() === 'staff';
  }
  
  export function isCustomer() {
    const role = getUserRole();
    return ['customer_pro', 'customer_free'].includes(role);
  }
  
  // Đăng ký — không cần token
  export async function registerUser({ username, password, fullName, email }) {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, fullName, email })
    });
  
    const data = await res.json().catch(() => null);
  
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || `Lỗi ${res.status}`);
    }
  
    localStorage.setItem('mac_token', data.token);
    localStorage.setItem('mac_user', JSON.stringify(data.user));
    return data;
  }
  
  // Đăng nhập
  export async function loginUser({ username, password }) {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
  
    const data = await res.json().catch(() => null);
  
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || `Lỗi ${res.status}`);
    }
  
    localStorage.setItem('mac_token', data.token);
    localStorage.setItem('mac_user', JSON.stringify(data.user));
    return data;
  }
  
  // =============================================================
  // AI CONSULT
  // =============================================================
  export async function askAI({ userMessage, style, area, spaceType, usePro }) {
    const endpoint = usePro ? '/api/ai-consult-pro' : '/api/ai-consult-free';
  
    const payload = usePro
      ? { userMessage, style, area, spaceType }
      : { userMessage };
  
    const data = await request(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  
    return data;
  }
  // =============================================================
// DATA API — FloorPlan, Concept, Lead, Material, BOQ
// =============================================================

export const dataApi = {
  // FloorPlan
  createFloorPlan: (data) => api.post('/api/data/floor-plans', data),
  getFloorPlans: () => api.get('/api/data/floor-plans'),
  getFloorPlan: (id) => api.get(`/api/data/floor-plans/${id}`),
  updateFloorPlan: (id, data) => api.put(`/api/data/floor-plans/${id}`, data),
  deleteFloorPlan: (id) => api.delete(`/api/data/floor-plans/${id}`),

  // Concept
  createConcept: (data) => api.post('/api/data/concepts', data),
  getConcepts: () => api.get('/api/data/concepts'),
  getConcept: (id) => api.get(`/api/data/concepts/${id}`),

  // Lead
  createLead: (data) => api.post('/api/data/leads', data),
  getLeads: (params = '') => api.get(`/api/data/leads${params}`),
  updateLead: (id, data) => api.put(`/api/data/leads/${id}`, data),
  addLeadNote: (id, note) => api.post(`/api/data/leads/${id}/notes`, { note }),

  // Material
  createMaterial: (data) => api.post('/api/data/materials', data),
  getMaterials: (params = '') => api.get(`/api/data/materials${params}`),
  updateMaterial: (id, data) => api.put(`/api/data/materials/${id}`, data),

  // MarketPrice
  createMarketPrice: (data) => api.post('/api/data/market-prices', data),
  getMarketPrices: (materialId) => api.get(`/api/data/market-prices/${materialId}`),

  // BOQ
  createBOQ: (data) => api.post('/api/data/boqs', data),
  getBOQs: () => api.get('/api/data/boqs'),
  getBOQ: (id) => api.get(`/api/data/boqs/${id}`)
};
// =============================================================
// ADMIN — Quản lý Leads
// =============================================================

export const leadsApi = {
  // Lấy danh sách leads (admin/staff)
  getAll: (params = '') => api.get(`/api/data/leads${params}`),

  // Lấy 1 lead theo id
  getOne: (id) => api.get(`/api/data/leads/${id}`),

  // Cập nhật lead (đổi status, gán người phụ trách)
  update: (id, data) => api.put(`/api/data/leads/${id}`, data),

  // Thêm ghi chú cho lead
  addNote: (id, note) => api.post(`/api/data/leads/${id}/notes`, { note })
};
export { API_BASE_URL };