const BASE = '/api';

function getToken() {
  return localStorage.getItem('capex_token');
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  me: () => request('GET', '/auth/me'),
  users: () => request('GET', '/auth/users'),

  // Requests
  getRequests: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/requests${q ? '?' + q : ''}`);
  },
  getRequest: (id) => request('GET', `/requests/${id}`),
  createRequest: (data) => request('POST', '/requests', data),
  updateRequest: (id, data) => request('PUT', `/requests/${id}`, data),
  submitRequest: (id, comments) => request('POST', `/requests/${id}/submit`, { comments }),
  approveRequest: (id, comments) => request('POST', `/requests/${id}/approve`, { comments }),
  rejectRequest: (id, comments) => request('POST', `/requests/${id}/reject`, { comments }),
  cancelRequest: (id) => request('POST', `/requests/${id}/cancel`),

  // Budgets
  getBudgets: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/budgets${q ? '?' + q : ''}`);
  },
  getBudgetSummary: (fiscal_year) => request('GET', `/budgets/summary${fiscal_year ? '?fiscal_year=' + fiscal_year : ''}`),
  updateBudget: (department, year, category, data) =>
    request('PUT', `/budgets/${encodeURIComponent(department)}/${year}/${encodeURIComponent(category)}`, data),

  // Dashboard
  getDashboard: () => request('GET', '/dashboard'),
};
