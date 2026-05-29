const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

const cache = new Map();
const TTL_MS = 60 * 1000;

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function classify(ticker) {
  if (/^A\d{4,}$/i.test(ticker)) return 'anue';
  if (/^\d{4,6}[A-Z]?$/.test(ticker)) return 'twse';
  return 'yahoo';
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
    source: 'cnyes',
    price: it.nav,
    prevClose,
    currency: it.classCurrency || '',
    name: it.displayNameLocal || it.displayName || '',
    marketState: '',
    ts: Date.now()
  };
}

async function fetchYahooSymbol(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
  if (!r.ok) throw new Error(`yahoo ${r.status}`);
  const j = await r.json();
  const meta = j?.chart?.result?.[0]?.meta;
  if (!meta || meta.regularMarketPrice == null) throw new Error('no price');
  return meta;
}

async function fetchYahoo(ticker) {
  const meta = await fetchYahooSymbol(ticker);
  return {
    ticker,
    resolvedSymbol: ticker,
    source: 'yahoo',
    price: meta.regularMarketPrice,
    prevClose: meta.previousClose ?? meta.chartPreviousClose ?? null,
    currency: meta.currency || '',
    name: meta.shortName || meta.longName || '',
    marketState: meta.marketState || '',
    ts: Date.now()
  };
}

async function fetchTwseBatch(tickers) {
  // 一次查所有 ticker 的上市 + 上櫃版本
  const codes = tickers.flatMap(t => [`tse_${t}.tw`, `otc_${t}.tw`]);
  const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${codes.join('|')}&json=1&delay=0&_=${Date.now()}`;
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://mis.twse.com.tw/stock/index.jsp' }
  });
  if (!r.ok) throw new Error(`twse ${r.status}`);
  const j = await r.json();
  const arr = Array.isArray(j?.msgArray) ? j.msgArray : [];
  const out = {};
  for (const m of arr) {
    const code = m.c;
    if (!code) continue;
    // pz=當前成交，z=最新成交，y=昨收
    const priceStr = m.z && m.z !== '-' ? m.z : (m.pz && m.pz !== '-' ? m.pz : null);
    const price = priceStr ? parseFloat(priceStr) : null;
    const prevClose = m.y ? parseFloat(m.y) : null;
    if (price == null || Number.isNaN(price)) continue;
    // 同一 code 上市/上櫃只會回一個
    out[code] = {
      ticker: code,
      resolvedSymbol: `${m.ex || ''}_${code}.tw`,
      source: 'twse',
      price,
      prevClose,
      currency: 'TWD',
      name: m.n || m.nf || '',
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
    const pending = { anue: [], twse: [], yahoo: [] };

    for (const t of tickers) {
      const c = cache.get(t);
      if (c && now - c.ts < TTL_MS) {
        result[t] = c;
        continue;
      }
      pending[classify(t)].push(t);
    }

    const tasks = [];

    // 鉅亨基金（個別呼叫）
    for (const t of pending.anue) {
      tasks.push(
        fetchAnueFund(t)
          .then(e => { cache.set(t, e); result[t] = e; })
          .catch(e => {
            console.error(`[prices] ${t} anue failed:`, e?.message);
            result[t] = { ticker: t, error: e?.message || 'fetch_failed' };
          })
      );
    }

    // TWSE 批次
    if (pending.twse.length) {
      tasks.push(
        fetchTwseBatch(pending.twse)
          .then(out => {
            for (const t of pending.twse) {
              if (out[t]) { cache.set(t, out[t]); result[t] = out[t]; }
              else result[t] = { ticker: t, error: 'twse_not_found' };
            }
          })
          .catch(e => {
            console.error('[prices] twse batch failed:', e?.message);
            for (const t of pending.twse) result[t] = { ticker: t, error: e?.message || 'twse_failed' };
          })
      );
    }

    // Yahoo 美股等
    for (const t of pending.yahoo) {
      tasks.push(
        fetchYahoo(t)
          .then(e => { cache.set(t, e); result[t] = e; })
          .catch(e => {
            console.error(`[prices] ${t} yahoo failed:`, e?.message);
            result[t] = { ticker: t, error: e?.message || 'fetch_failed' };
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
