const BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '請求失敗');
  return data;
}

export const api = {
  auth: {
    login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    me: () => request('/auth/me'),
    getUsers: () => request('/auth/users'),
    resetPassword: (id, newPassword) => request(`/auth/reset-password/${id}`, { method: 'PUT', body: JSON.stringify({ newPassword }) }),
  },
  families: {
    create: (name) => request('/families/create', { method: 'POST', body: JSON.stringify({ name }) }),
    join: (inviteCode) => request('/families/join', { method: 'POST', body: JSON.stringify({ inviteCode }) }),
    my: () => request('/families/my'),
  },
  transactions: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/transactions${q ? `?${q}` : ''}`);
    },
    create: (body) => request('/transactions', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),
    categories: () => request('/transactions/categories'),
  },
};
