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

  // Prices — session 級快取：登入後第一次抓，之後整段 session 重用，
  // 切頁面 / 新增刪除交易都不會再打 API；瀏覽器重新整理或登出才重抓。
  getPrices: (tickers, fxCurrencies) => {
    const wantTickers = [...new Set((tickers || []).filter(Boolean).map(s => String(s).toUpperCase()))];
    const wantFx = [...new Set((fxCurrencies || []).filter(Boolean).map(s => String(s).toUpperCase()))]
      .filter(c => c !== 'TWD');

    const cachedPrices = {};
    const missingTickers = [];
    for (const t of wantTickers) {
      if (priceCache.prices[t]) cachedPrices[t] = priceCache.prices[t];
      else missingTickers.push(t);
    }
    const missingFx = wantFx.filter(c => priceCache.fx[c] == null);

    if (!missingTickers.length && !missingFx.length) {
      return Promise.resolve({
        prices: cachedPrices,
        fx: { TWD: 1, ...pickKeys(priceCache.fx, wantFx) }
      });
    }

    const params = new URLSearchParams();
    if (missingTickers.length) params.set('tickers', missingTickers.join(','));
    if (missingFx.length) params.set('fx', missingFx.join(','));

    return request(`/prices?${params.toString()}`).then(data => {
      Object.assign(priceCache.prices, data.prices || {});
      Object.assign(priceCache.fx, data.fx || {});
      return {
        prices: { ...cachedPrices, ...(data.prices || {}) },
        fx: { TWD: 1, ...pickKeys(priceCache.fx, wantFx) }
      };
    });
  },

  clearPriceCache: () => {
    priceCache.prices = {};
    priceCache.fx = {};
  }
};

const priceCache = { prices: {}, fx: {} };

function pickKeys(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] != null) out[k] = obj[k];
  return out;
}
