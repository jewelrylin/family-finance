const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

const cache = new Map();
const TTL_MS = 60 * 1000;

async function fetchYahoo(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
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
  return {
    ticker,
    price: meta.regularMarketPrice,
    prevClose: meta.previousClose ?? meta.chartPreviousClose ?? null,
    currency: meta.currency || '',
    name: meta.shortName || meta.longName || '',
    marketState: meta.marketState || '',
    ts: Date.now()
  };
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
        const entry = await fetchYahoo(t);
        cache.set(t, entry);
        result[t] = entry;
      } catch (e) {
        result[t] = { ticker: t, error: e.message || 'fetch_failed' };
      }
    }));

    res.json({ prices: result });
  } catch (err) {
    console.error('Get prices error:', err);
    res.status(500).json({ error: '無法取得股價' });
  }
});

module.exports = router;
