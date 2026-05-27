const API_URL = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  const res = await fetch(`${API_URL}/api${endpoint}`, {
    ...options,
    headers
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || '請求失敗');
  }

  return data;
}

export const api = {
  // Auth
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),

  // Families
  getFamilies: () => request('/families'),
  createFamily: (body) => request('/families', { method: 'POST', body: JSON.stringify(body) }),
  joinFamily: (id) => request(`/families/${id}/join`, { method: 'POST' }),
  getMembers: (id) => request(`/families/${id}/members`),
  removeMember: (familyId, userId) => request(`/families/${familyId}/members/${userId}`, { method: 'DELETE' }),

  // Transactions
  getTransactions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/transactions${qs ? `?${qs}` : ''}`);
  },
  createTransaction: (body) => request('/transactions', { method: 'POST', body: JSON.stringify(body) }),
  updateTransaction: (id, body) => request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),

  // Analysis
  getAnalysis: (familyId) => request(`/analysis/family/${familyId}`)
};
