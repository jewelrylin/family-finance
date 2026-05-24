const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const CATEGORIES = {
  income: ['薪資', '獎金', '投資收益', '兼職收入', '租金收入', '其他收入'],
  expense: ['餐飲', '交通', '居住', '娛樂', '教育', '醫療', '日常用品', '水電瓦斯', '通訊', '保險', '其他支出'],
  investment: ['股票', '基金', 'ETF', '債券', '外匯', '加密貨幣', '房地產', '定存', '其他投資'],
  deposit: ['活期存款', '定期存款', '數位帳戶', '外幣存款', '利息收入', '其他存款']
};

router.get('/categories', (req, res) => {
  res.json(CATEGORIES);
});

router.get('/', authenticate, async (req, res) => {
  try {
    const { type, startDate, endDate, mine } = req.query;
    const familyId = req.user.family_id;
    if (!familyId) return res.status(400).json({ error: '請先加入或建立一個家庭' });

    let rows = mine === 'true' && type
      ? await db.getTransactionsByUserAndType(req.user.id, type)
      : type
        ? await db.getTransactionsByFamilyAndType(familyId, type)
        : await db.getTransactionsByFamily(familyId);

    if (startDate) rows = rows.filter(r => r.date >= startDate);
    if (endDate) rows = rows.filter(r => r.date <= endDate);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

router.get('/portfolio', authenticate, async (req, res) => {
  try {
    const rows = await db.getTransactionsByUserAndType(req.user.id, 'investment');
    const assets = {};

    for (const t of rows) {
      const key = t.asset_name || t.category;
      if (!assets[key]) assets[key] = {
        name: key, category: t.category, buys: [], sells: [], dividends: [],
        totalInvested: 0, totalShares: 0, totalFee: 0, totalSells: 0, totalDividends: 0,
        latestPrice: null, latestPriceDate: null,
        latestPriceSourceUnitPrice: null,
      };
      if (t.tx_type === 'buy') {
        assets[key].buys.push(t);
        assets[key].totalInvested += t.amount;
        assets[key].totalShares += t.quantity || 0;
        assets[key].totalFee += t.fee || 0;
      } else if (t.tx_type === 'sell') {
        assets[key].sells.push(t);
        assets[key].totalSells += t.amount;
        assets[key].totalShares -= t.quantity || 0;
      } else if (t.tx_type === 'dividend') {
        assets[key].dividends.push(t);
        assets[key].totalDividends += t.amount;
      }
      const cp = t.current_price || 0;
      if (cp > 0 && (!assets[key].latestPriceDate || t.date >= assets[key].latestPriceDate)) {
        assets[key].latestPrice = cp;
        assets[key].latestPriceDate = t.date;
        assets[key].latestPriceSourceUnitPrice = t.unit_price || 0;
      }
    }

    const portfolio = Object.values(assets).map(a => {
      const currentPrice = a.latestPrice || 0;
      const totalSharesBought = a.buys.reduce((s, b) => s + (b.quantity || 0), 0);
      const totalCostTWD = a.buys.reduce((s, b) => s + b.amount, 0);
      const totalSharesHeld = Math.max(0, a.totalShares);
      const fractionHeld = totalSharesBought > 0 ? totalSharesHeld / totalSharesBought : 0;

      // 每筆買入的目前台幣價值 = 買入台幣金額 × (現價 / 當時單價)
      // 有賣出時按持有比例攤算
      let currentValueTWD = 0;
      for (const b of a.buys) {
        const up = b.unit_price || 0;
        if (up > 0 && currentPrice > 0) {
          currentValueTWD += b.amount * (currentPrice / up);
        }
      }
      currentValueTWD = currentValueTWD * fractionHeld;

      // 無單位價格時退回用數量 × 現價估算
      if (currentValueTWD === 0 && a.totalShares > 0 && currentPrice > 0) {
        currentValueTWD = a.totalShares * currentPrice;
      }

      const totalPL = currentValueTWD + a.totalSells + a.totalDividends - totalCostTWD;
      const roi = totalCostTWD > 0 ? (totalPL / totalCostTWD * 100) : 0;

      // 平均每單位台幣成本
      const avgCostTWD = totalSharesBought > 0 ? totalCostTWD / totalSharesBought : 0;

      return {
        ...a, avgCost: Math.round(avgCostTWD * 100) / 100,
        currentPrice,
        marketValue: Math.round(currentValueTWD),
        totalCost: Math.round(totalCostTWD),
        unrealizedPL: Math.round(currentValueTWD - (totalSharesHeld * avgCostTWD)),
        totalPL: Math.round(totalPL), roi: Math.round(roi * 100) / 100,
      };
    });

    const grandCost = portfolio.reduce((s, a) => s + a.totalCost, 0);
    const grandMV = portfolio.reduce((s, a) => s + a.marketValue, 0);
    const grandSells = portfolio.reduce((s, a) => s + a.totalSells, 0);
    const grandDivs = portfolio.reduce((s, a) => s + a.totalDividends, 0);
    const grandReturn = grandMV + grandSells + grandDivs - grandCost;
    const grandROI = grandCost > 0 ? (grandReturn / grandCost * 100) : 0;

    res.json({
      portfolio,
      summary: {
        totalCost: Math.round(grandCost),
        totalReturn: Math.round(grandReturn),
        roi: Math.round(grandROI * 100) / 100,
        assetCount: portfolio.length,
        totalMV: Math.round(grandMV),
        totalDividends: grandDivs,
      }
    });
  } catch (err) {
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

router.get('/investment-summary', authenticate, async (req, res) => {
  try {
    const familyId = req.user.family_id;
    if (!familyId) return res.status(400).json({ error: '請先加入或建立一個家庭' });

    const all = await db.getTransactionsByFamilyAndType(familyId, 'investment');
    const assets = {};

    for (const t of all) {
      const key = t.asset_name || t.category;
      if (!assets[key]) assets[key] = { buys: [], sells: [], dividends: [], totalShares: 0 };
      if (t.tx_type === 'buy') {
        assets[key].buys.push(t);
        assets[key].totalShares += t.quantity || 0;
      } else if (t.tx_type === 'sell') {
        assets[key].sells.push(t);
        assets[key].totalShares -= t.quantity || 0;
      } else if (t.tx_type === 'dividend') {
        assets[key].dividends.push(t);
      }
    }

    let totalCost = 0, totalMV = 0, totalSells = 0, totalDividends = 0;

    for (const a of Object.values(assets)) {
      const totalSharesBought = a.buys.reduce((s, b) => s + (b.quantity || 0), 0);
      totalSells += a.sells.reduce((s, t) => s + t.amount, 0);
      totalDividends += a.dividends.reduce((s, t) => s + t.amount, 0);
      const fractionHeld = totalSharesBought > 0 ? Math.max(0, a.totalShares) / totalSharesBought : 0;
      for (const b of a.buys) {
        totalCost += b.amount;
        const cp = b.current_price || 0;
        const up = b.unit_price || 0;
        if (up > 0 && cp > 0) {
          totalMV += b.amount * (cp / up) * fractionHeld;
        }
      }
    }

    const totalReturn = totalMV + totalSells + totalDividends - totalCost;
    const roi = totalCost > 0 ? (totalReturn / totalCost * 100) : 0;

    res.json({
      totalCost: Math.round(totalCost),
      totalMV: Math.round(totalMV),
      totalSells: Math.round(totalSells),
      totalDividends: Math.round(totalDividends),
      totalReturn: Math.round(totalReturn),
      roi: Math.round(roi * 100) / 100,
      count: all.length,
    });
  } catch (err) {
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { type, category, amount, note, assetName, quantity, unitPrice, fee, txType, currentPrice, date, bank } = req.body;
    const familyId = req.user.family_id;
    const userId = req.user.id;

    if (!familyId) return res.status(400).json({ error: '請先加入或建立一個家庭' });
    if (!type || !category || !amount || !date) return res.status(400).json({ error: '類型、分類、金額、日期為必填' });
    if (!CATEGORIES[type] || !CATEGORIES[type].includes(category)) return res.status(400).json({ error: '無效的分類' });

    await db.createTransaction(userId, familyId, type, category, Number(amount), note || '',
      assetName, Number(quantity) || 0, Number(unitPrice) || 0, Number(fee) || 0,
      txType || 'buy', Number(currentPrice) || 0, date, bank || '');
    res.status(201).json({ message: '新增成功' });
  } catch (err) {
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { category, amount, note, assetName, quantity, unitPrice, fee, txType, currentPrice, date, bank } = req.body;
    await db.updateTransaction(category, Number(amount), note || '',
      assetName, Number(quantity) || 0, Number(unitPrice) || 0, Number(fee) || 0,
      txType || 'buy', Number(currentPrice) || 0, date, req.params.id, req.user.family_id, bank || '');
    res.json({ message: '更新成功' });
  } catch (err) {
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    await db.deleteTransaction(req.params.id, req.user.family_id);
    res.json({ message: '刪除成功' });
  } catch (err) {
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

module.exports = router;
