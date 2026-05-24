const express = require('express');
const router = express.Router();

function detectSymbol(symbol) {
  const s = symbol.toUpperCase().trim();
  if (/^\d{4}$/.test(s)) return { type: 'twse', code: s };
  if (/^\d{6}$/.test(s)) return { type: 'tpex', code: s };
  return { type: 'yahoo', code: s };
}

async function fetchTWSE(code) {
  const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${code}.tw&json=1&delay=0`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const text = await res.text();
  const match = text.match(/z"\s*:\s*"([\d.]+)/);
  if (match) return { price: parseFloat(match[1]), currency: 'TWD' };
  return null;
}

async function fetchTPEX(code) {
  const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=otc_${code}.tw&json=1&delay=0`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const text = await res.text();
  const match = text.match(/z"\s*:\s*"([\d.]+)/);
  if (match) return { price: parseFloat(match[1]), currency: 'TWD' };
  return null;
}

async function fetchYahoo(code) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${code}?interval=1d&range=1d`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return null;
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) return null;
  const price = result.meta?.regularMarketPrice;
  const currency = result.meta?.currency || 'USD';
  const name = result.meta?.symbol || code;
  return { price, currency, name };
}

router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!symbol) return res.status(400).json({ error: '請提供股票代號' });

    const info = detectSymbol(symbol);
    let result = null;

    if (info.type === 'twse') result = await fetchTWSE(info.code);
    else if (info.type === 'tpex') result = await fetchTPEX(info.code);
    else result = await fetchYahoo(info.code);

    if (!result) return res.status(404).json({ error: '無法取得價格，請確認代號是否正確' });

    res.json({ symbol: info.code, ...result });
  } catch (err) {
    res.status(500).json({ error: '價格查詢失敗' });
  }
});

module.exports = router;
