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
  getMyFamily: () => request('/families/mine'),
  createFamily: (body) => request('/families', { method: 'POST', body: JSON.stringify(body) }),
  joinFamily: (inviteCode) => request('/families/join', { method: 'POST', body: JSON.stringify({ inviteCode }) }),
  getMembers: () => request('/families/members'),
  addMember: (body) => request('/families/members', { method: 'POST', body: JSON.stringify(body) }),
  addExistingMember: (email) => request('/families/members/existing', { method: 'POST', body: JSON.stringify({ email }) }),
  removeMember: (userId) => request(`/families/members/${userId}`, { method: 'DELETE' }),

  // Transactions
  getTransactions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/transactions${qs ? `?${qs}` : ''}`);
  },
  createTransaction: (body) => request('/transactions', { method: 'POST', body: JSON.stringify(body) }),
  updateTransaction: (id, body) => request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),

  // Analysis
  getAnalysis: () => request('/analysis/family'),

  // Prices
  getPrices: (tickers, fxCurrencies) => {
    const list = (tickers || []).filter(Boolean).join(',');
    const fx = (fxCurrencies || []).filter(Boolean).join(',');
    if (!list && !fx) return Promise.resolve({ prices: {}, fx: { TWD: 1 } });
    const params = new URLSearchParams();
    if (list) params.set('tickers', list);
    if (fx) params.set('fx', fx);
    return request(`/prices?${params.toString()}`);
  }
};
