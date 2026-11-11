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
    const err = new Error(data?.message || `Lỗi ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
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
export function isLoggedIn() { return !!localStorage.getItem('mac_token'); }
export function getUserRole() { return getCurrentUser()?.role || 'guest'; }
export function isPro() { return ['admin', 'staff', 'customer_pro'].includes(getUserRole()); }
export function isAdmin() { return getUserRole() === 'admin'; }
export function isStaff() { return getUserRole() === 'staff'; }
export function isCustomer() { return ['customer_pro', 'customer_free'].includes(getUserRole()); }

export async function registerUser({ username, password, fullName, email }) {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, fullName, email })
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) throw new Error(data?.message || `Lỗi ${res.status}`);
  localStorage.setItem('mac_token', data.token);
  localStorage.setItem('mac_user', JSON.stringify(data.user));
  return data;
}

export async function loginUser({ username, password }) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) throw new Error(data?.message || `Lỗi ${res.status}`);
  localStorage.setItem('mac_token', data.token);
  localStorage.setItem('mac_user', JSON.stringify(data.user));
  return data;
}

// =============================================================
// 3 TẦNG AI GỌI API
// =============================================================
export async function askFreeAI({ userMessage, chatHistory }) {
  return await request('/api/ai-free', {
    method: 'POST',
    body: JSON.stringify({ userMessage, chatHistory })
  });
}

export async function askProAI({ userMessage, chatHistory, style, area, spaceType }) {
  return await request('/api/ai-pro', {
    method: 'POST',
    body: JSON.stringify({ userMessage, chatHistory, style, area, spaceType })
  });
}

export async function askAdminAI({ userMessage, chatHistory }) {
  return await request('/api/ai-admin', {
    method: 'POST',
    body: JSON.stringify({ userMessage, chatHistory })
  });
}

// =============================================================
// DATA API & LEADS API
// =============================================================
export const dataApi = {
  createFloorPlan: (data) => api.post('/api/data/floor-plans', data),
  getFloorPlans: () => api.get('/api/data/floor-plans'),
  getFloorPlan: (id) => api.get(`/api/data/floor-plans/${id}`),
  updateFloorPlan: (id, data) => api.put(`/api/data/floor-plans/${id}`, data),
  deleteFloorPlan: (id) => api.delete(`/api/data/floor-plans/${id}`),

  createConcept: (data) => api.post('/api/data/concepts', data),
  getConcepts: () => api.get('/api/data/concepts'),
  getConcept: (id) => api.get(`/api/data/concepts/${id}`),

  createLead: (data) => api.post('/api/data/leads', data),
  getLeads: (params = '') => api.get(`/api/data/leads${params}`),
  updateLead: (id, data) => api.put(`/api/data/leads/${id}`, data),
  addLeadNote: (id, note) => api.post(`/api/data/leads/${id}/notes`, { note }),

  createMaterial: (data) => api.post('/api/data/materials', data),
  getMaterials: (params = '') => api.get(`/api/data/materials${params}`),
  updateMaterial: (id, data) => api.put(`/api/data/materials/${id}`, data),

  createMarketPrice: (data) => api.post('/api/data/market-prices', data),
  getMarketPrices: (materialId) => api.get(`/api/data/market-prices/${materialId}`),

  createBOQ: (data) => api.post('/api/data/boqs', data),
  getBOQs: (params = '') => api.get(`/api/data/boqs${params}`),
  getBOQ: (id) => api.get(`/api/data/boqs/${id}`),
  updateBOQ: (id, data) => api.put(`/api/data/boqs/${id}`, data),
  setBOQStatus: (id, status) => api.put(`/api/data/boqs/${id}/status`, { status })
};

// =============================================================
// AI STUDIO: diễn hoạ từ mặt bằng + concept
// =============================================================
export const studioApi = {
  render: ({ floorPlanId, conceptId }) => api.post('/api/studio/render', { floorPlanId, conceptId }),
  quota: () => api.get('/api/studio/quota'),
  renders: ({ all = false, page = 1, limit = 20 } = {}) =>
    api.get(`/api/studio/renders?page=${page}&limit=${limit}${all ? '&all=true' : ''}`),
  getRender: (id) => api.get(`/api/studio/renders/${id}`),
  deleteRender: (id) => api.delete(`/api/studio/renders/${id}`)
};

// Lịch sử chat lưu theo từng tài khoản: trước đây dùng chung một khoá nên người đăng nhập sau thấy chat của người trước
export function chatStorageKey() {
  return `mac_chat_history_${getCurrentUser()?.userId || 'guest'}`;
}

export const statsApi = {
  funnel: (days = 30) => api.get(`/api/stats/funnel?days=${days}`)
};

export const usersApi = {
  list: (params = '') => api.get(`/api/users${params}`),
  create: (data) => api.post('/api/users', data),
  update: (id, data) => api.put(`/api/users/${id}`, data)
};

export const leadsApi = {
  getAll: (params = '') => api.get(`/api/data/leads${params}`),
  getOne: (id) => api.get(`/api/data/leads/${id}`),
  update: (id, data) => api.put(`/api/data/leads/${id}`, data),
  addNote: (id, note) => api.post(`/api/data/leads/${id}/notes`, { note }),
  summarize: (id) => api.post(`/api/data/leads/${id}/summary`, {})
};

export { API_BASE_URL };