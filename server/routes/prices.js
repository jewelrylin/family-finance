const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

const cache = new Map();
const TTL_MS = 60 * 1000;

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function isAnueFund(ticker) {
  return /^A\d{4,}$/i.test(ticker);
}

function isTaiwanCode(ticker) {
  return /^\d{4,6}[A-Z]?$/.test(ticker);
}

// 一支 ticker 可能對應的鉅亨市場前綴
function candidatesFor(ticker) {
  if (isTaiwanCode(ticker)) return ['TWS', 'TWG']; // 上市、上櫃
  return ['USS']; // 預設視為美股
}

async function fetchAnueFund(ticker) {
  const url = `https://fund.api.cnyes.com/fund/api/v1/funds/${encodeURIComponent(ticker)}`;
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Origin': 'https://fund.cnyes.com', 'Referer': 'https://fund.cnyes.com/' }
  });
  if (!r.ok) throw new Error(`anue ${r.status}`);
  const j = await r.json();
  const it = j?.items;
  if (!it || it.nav == null) throw new Error('no nav');
  const prevClose = it.change != null ? it.nav - it.change : null;
  return {
    ticker,
    resolvedSymbol: ticker,
    source: 'cnyes-fund',
    price: it.nav,
    prevClose,
    currency: it.classCurrency || '',
    name: it.displayNameLocal || it.displayName || '',
    marketState: '',
    ts: Date.now()
  };
}

async function fetchAnueQuotesBatch(tickers) {
  if (!tickers.length) return {};
  // 對每個 ticker 加上所有可能 prefix，鉅亨會自動跳過不存在的
  const symbols = [];
  for (const t of tickers) {
    for (const prefix of candidatesFor(t)) {
      symbols.push(`${prefix}:${t}:STOCK`);
    }
  }
  const url = `https://ws.api.cnyes.com/ws/api/v1/quote/quotes/${symbols.join(',')}`;
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Origin': 'https://www.cnyes.com', 'Referer': 'https://www.cnyes.com/' }
  });
  if (!r.ok) throw new Error(`cnyes ${r.status}`);
  const j = await r.json();
  if (j?.statusCode !== 200 && j?.statusCode !== 4002) throw new Error(`cnyes ${j?.statusCode}`);
  const items = Array.isArray(j?.data) ? j.data : [];
  const out = {};
  for (const it of items) {
    if (!it || typeof it !== 'object' || it.error_message) continue;
    const sym = it['0'] || it['800013'];
    if (!sym) continue;
    const parts = sym.split(':');
    const market = parts[0];
    const code = parts[1];
    if (!code) continue;
    const price = typeof it['6'] === 'number' ? it['6'] : null;
    if (price == null) continue;
    const prevClose = typeof it['21'] === 'number' ? it['21'] : null;
    const isTW = market === 'TWS' || market === 'TWG';
    out[code] = {
      ticker: code,
      resolvedSymbol: sym,
      source: 'cnyes',
      price,
      prevClose,
      currency: isTW ? 'TWD' : (market === 'USS' ? 'USD' : ''),
      name: it['200009'] || it['200010'] || '',
      marketState: '',
      ts: Date.now()
    };
  }
  return out;
}

router.get('/', auth, async (req, res) => {
  try {
    const raw = (req.query.tickers || '').toString();
    const tickers = [...new Set(raw.split(',').map(t => t.trim().toUpperCase()).filter(Boolean))];
    if (!tickers.length) return res.json({ prices: {} });

    const now = Date.now();
    const result = {};
    const pendingFund = [];
    const pendingQuote = [];

    for (const t of tickers) {
      const c = cache.get(t);
      if (c && now - c.ts < TTL_MS) {
        result[t] = c;
        continue;
      }
      if (isAnueFund(t)) pendingFund.push(t);
      else pendingQuote.push(t);
    }

    const tasks = [];

    for (const t of pendingFund) {
      tasks.push(
        fetchAnueFund(t)
          .then(e => { cache.set(t, e); result[t] = e; })
          .catch(e => {
            console.error(`[prices] ${t} anue fund failed:`, e?.message);
            result[t] = { ticker: t, error: e?.message || 'fetch_failed' };
          })
      );
    }

    if (pendingQuote.length) {
      tasks.push(
        fetchAnueQuotesBatch(pendingQuote)
          .then(out => {
            for (const t of pendingQuote) {
              if (out[t]) { cache.set(t, out[t]); result[t] = out[t]; }
              else result[t] = { ticker: t, error: 'not_found' };
            }
          })
          .catch(e => {
            console.error('[prices] cnyes batch failed:', e?.message);
            for (const t of pendingQuote) result[t] = { ticker: t, error: e?.message || 'fetch_failed' };
          })
      );
    }

    await Promise.all(tasks);
    res.json({ prices: result });
  } catch (err) {
    console.error('Get prices error:', err);
    res.status(500).json({ error: '無法取得股價' });
  }
});

module.exports = router;
