const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

const cache = new Map();
const TTL_MS = 60 * 1000;

async function fetchYahooSymbol(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      'Accept': 'application/json'
    }
  });
  if (!r.ok) throw new Error(`yahoo ${r.status}`);
  const j = await r.json();
  const meta = j?.chart?.result?.[0]?.meta;
  if (!meta || meta.regularMarketPrice == null) throw new Error('no price');
  return meta;
}

async function fetchYahoo(ticker) {
  const candidates = /^\d{4,6}[A-Z]?$/.test(ticker) ? [`${ticker}.TW`, `${ticker}.TWO`] : [ticker];
  let lastErr;
  for (const sym of candidates) {
    try {
      const meta = await fetchYahooSymbol(sym);
      return {
        ticker,
        resolvedSymbol: sym,
        source: 'yahoo',
        price: meta.regularMarketPrice,
        prevClose: meta.previousClose ?? meta.chartPreviousClose ?? null,
        currency: meta.currency || '',
        name: meta.shortName || meta.longName || '',
        marketState: meta.marketState || '',
        ts: Date.now()
      };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('no price');
}

async function fetchAnueFund(ticker) {
  const url = `https://fund.api.cnyes.com/fund/api/v1/funds/${encodeURIComponent(ticker)}`;
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      'Accept': 'application/json',
      'Origin': 'https://fund.cnyes.com',
      'Referer': 'https://fund.cnyes.com/'
    }
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

async function fetchPrice(ticker) {
  if (/^A\d{4,}$/i.test(ticker)) return fetchAnueFund(ticker.toUpperCase());
  return fetchYahoo(ticker);
}

router.get('/', auth, async (req, res) => {
  try {
    const raw = (req.query.tickers || '').toString();
    const tickers = [...new Set(raw.split(',').map(t => t.trim().toUpperCase()).filter(Boolean))];
    if (!tickers.length) return res.json({ prices: {} });

    const now = Date.now();
    const result = {};
    const toFetch = [];

    for (const t of tickers) {
      const c = cache.get(t);
      if (c && now - c.ts < TTL_MS) {
        result[t] = c;
      } else {
        toFetch.push(t);
      }
    }

    await Promise.all(toFetch.map(async (t) => {
      try {
        const entry = await fetchPrice(t);
        cache.set(t, entry);
        result[t] = entry;
      } catch (e) {
        console.error(`[prices] ${t} failed:`, e?.message || e);
        result[t] = { ticker: t, error: e?.message || 'fetch_failed' };
      }
    }));

    res.json({ prices: result });
  } catch (err) {
    console.error('Get prices error:', err);
    res.status(500).json({ error: '無法取得股價' });
  }
});

module.exports = router;
