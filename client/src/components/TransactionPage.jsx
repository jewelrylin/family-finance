import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import TransactionForm from './TransactionForm';

const typeLabels = { income: '收入', expense: '支出', investment: '投資', savings: '存款' };

// 各投資類別專屬色票（背景 / 文字）
const investmentCategoryColors = {
  '股票':    { bg: '#dbeafe', fg: '#1d4ed8' }, // 藍
  '基金':    { bg: '#ede9fe', fg: '#6d28d9' }, // 紫
  '債券':    { bg: '#dcfce7', fg: '#15803d' }, // 綠
  '房地產':  { bg: '#fef3c7', fg: '#b45309' }, // 琥珀
  '加密貨幣':{ bg: '#fee2e2', fg: '#b91c1c' }, // 紅
  '其他投資':{ bg: '#f1f5f9', fg: '#475569' }  // 灰
};
const defaultBadge = { bg: '#f1f5f9', fg: '#475569' };

function categoryBadgeStyle(type, category) {
  if (type !== 'investment') return null;
  const c = investmentCategoryColors[category] || defaultBadge;
  return { background: c.bg, color: c.fg, border: 'none' };
}

export default function TransactionPage({ type, description }) {
  const [family, setFamily] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState({});
  const [fx, setFx] = useState({ TWD: 1 });
  const [pricesLoading, setPricesLoading] = useState(false);
  const [bankFilter, setBankFilter] = useState(null); // 存款分類：點哪家銀行就只看那家
  const [bankRelatedTxs, setBankRelatedTxs] = useState([]); // 存款頁用：含收入、支出，用來算每家銀行真實餘額
  const [monthFilter, setMonthFilter] = useState(''); // 'YYYY-MM' 或 '' = 全部月份

  const loadPrices = useCallback(async (txs) => {
    if (type !== 'investment') return;
    const tickers = [...new Set(txs.map(t => (t.ticker || '').trim().toUpperCase()).filter(Boolean))];
    const currencies = [...new Set(txs.map(t => (t.currency || 'TWD').toUpperCase()).filter(c => c && c !== 'TWD'))];
    if (!tickers.length && !currencies.length) { setPrices({}); setFx({ TWD: 1 }); return; }
    setPricesLoading(true);
    try {
      const data = await api.getPrices(tickers, currencies);
      setPrices(data.prices || {});
      setFx({ TWD: 1, ...(data.fx || {}) });
    } catch (err) {
      console.error('Load prices error:', err);
    } finally {
      setPricesLoading(false);
    }
  }, [type]);

  // 用交易記錄的幣別換算回 TWD。投資的「總成本」= 買進金額 - 賣出金額（淨投入本金）
  const txTotalCost = useCallback((tx) => {
    const amt = parseFloat(tx.amount) || 0;
    const sh = parseFloat(tx.shares);
    const sign = type === 'investment' && tx.action === 'sell' ? -1 : 1;
    const native = type === 'investment' && !Number.isNaN(sh) && sh > 0 ? amt * sh : amt;
    if (type !== 'investment') return native;
    const ccy = (tx.currency || 'TWD').toUpperCase();
    const rate = fx[ccy] != null ? fx[ccy] : 1;
    return native * rate * sign;
  }, [type, fx]);

  // 用 ticker 分組計算：各筆已實現損益（賣出列） + 持倉未實現損益
  // 同一 ticker 跨幣別不合併（理論上同一資產不該換幣別，這裡保持簡單分開處理）
  const investmentMetrics = (() => {
    if (type !== 'investment') return null;
    const groups = new Map(); // key = ticker|currency, value = { buys: [...], sells: [...] }
    transactions.forEach(t => {
      const tk = (t.ticker || '').trim().toUpperCase();
      if (!tk) return;
      const sh = parseFloat(t.shares);
      if (Number.isNaN(sh) || sh <= 0) return;
      const ccy = (t.currency || 'TWD').toUpperCase();
      const key = `${tk}|${ccy}`;
      if (!groups.has(key)) groups.set(key, { ticker: tk, ccy, buys: [], sells: [] });
      const bucket = groups.get(key);
      const entry = { amount: parseFloat(t.amount) || 0, shares: sh, id: t.id };
      if (t.action === 'sell') bucket.sells.push(entry);
      else bucket.buys.push(entry);
    });

    const perTicker = new Map(); // key → metrics
    for (const [key, g] of groups) {
      const totalBuyShares = g.buys.reduce((s, b) => s + b.shares, 0);
      const totalBuyAmount = g.buys.reduce((s, b) => s + b.amount * b.shares, 0);
      const avgCost = totalBuyShares > 0 ? totalBuyAmount / totalBuyShares : 0;
      const totalSellShares = g.sells.reduce((s, b) => s + b.shares, 0);
      const realizedNative = g.sells.reduce((s, sl) => s + (sl.amount - avgCost) * sl.shares, 0);
      const openShares = totalBuyShares - totalSellShares;
      perTicker.set(key, {
        ticker: g.ticker,
        currency: g.ccy,
        avgCost,
        openShares,
        realizedNative
      });
    }

    let marketValueTwd = 0;
    let openCostTwd = 0;
    let realizedTwd = 0;
    for (const m of perTicker.values()) {
      const info = prices[m.ticker];
      const priceCcy = info?.currency ? info.currency.toUpperCase() : m.currency;
      const livePriceNative = info && !info.error && info.price != null ? info.price : null;
      const rate = fx[m.currency] != null ? fx[m.currency] : 1;
      const priceRate = fx[priceCcy] != null ? fx[priceCcy] : 1;
      const livePriceInCost = livePriceNative != null
        ? (priceCcy === m.currency ? livePriceNative : livePriceNative * priceRate / rate)
        : null;
      if (livePriceInCost != null && m.openShares > 0) {
        marketValueTwd += livePriceInCost * m.openShares * rate;
        openCostTwd += m.avgCost * m.openShares * rate;
      }
      realizedTwd += m.realizedNative * rate;
    }
    const unrealizedTwd = marketValueTwd - openCostTwd;
    return {
      perTicker,
      marketValueTwd,
      openCostTwd,
      unrealizedTwd,
      realizedTwd,
      totalPnlTwd: unrealizedTwd + realizedTwd
    };
  })();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 存款頁要看「真實餘額」必須含收入/支出 → 不帶 type filter 一次抓全部
      const params = type === 'savings' ? {} : { type };
      const [familyData, txData] = await Promise.all([
        api.getMyFamily(),
        api.getTransactions(params)
      ]);
      setFamily(familyData.family);
      const allTxs = txData.transactions || [];
      const ownType = type === 'savings' ? allTxs.filter(t => t.type === 'savings') : allTxs;
      setTransactions(ownType);
      // 銀行匯總用：所有非投資的交易（投資的 name 是資產不是帳戶）
      setBankRelatedTxs(type === 'savings' ? allTxs.filter(t => t.type !== 'investment') : []);
      const t = ownType.reduce((sum, tx) => sum + txTotalCost(tx), 0);
      setTotal(t);
      loadPrices(ownType);
    } catch (err) {
      console.error('Load data error:', err);
    } finally {
      setLoading(false);
    }
  }, [type, loadPrices, txTotalCost]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async (data) => {
    if (!family) return;
    await api.createTransaction({ ...data, family_id: family.id, type });
    loadData();
  };

  const handleUpdate = async (data) => {
    await api.updateTransaction(editData.id, data);
    setEditData(null);
    loadData();
  };

  const handleDelete = async (id) => {
    if (!confirm('確定要刪除此記錄嗎？')) return;
    await api.deleteTransaction(id);
    loadData();
  };

  // 存款：依銀行匯總「真實餘額」（含收入/支出影響）
  const bankSummary = (() => {
    if (type !== 'savings') return null;
    const m = new Map();
    for (const t of bankRelatedTxs) {
      const bank = t.name || '未指定';
      const amt = parseFloat(t.amount) || 0;
      const cur = m.get(bank) || { bank, balance: 0, savings: 0, income: 0, expense: 0, savingsCount: 0 };
      if (t.type === 'income') { cur.income += amt; cur.balance += amt; }
      else if (t.type === 'expense') { cur.expense += amt; cur.balance -= amt; }
      else if (t.type === 'savings') { cur.savings += amt; cur.balance += amt; cur.savingsCount += 1; }
      m.set(bank, cur);
    }
    return [...m.values()].sort((a, b) => b.balance - a.balance);
  })();

  const txMonth = (t) => (t.date ? String(t.date).slice(0, 7) : '');
  const monthOptions = type === 'savings'
    ? [...new Set(bankRelatedTxs.map(txMonth).filter(Boolean))].sort().reverse()
    : [];

  // 銀行明細：點銀行後顯示所有相關交易（收入 / 支出 / 存款）
  const bankDetail = (type === 'savings' && bankFilter)
    ? bankRelatedTxs
        .filter(t => (t.name || '未指定') === bankFilter)
        .filter(t => !monthFilter || txMonth(t) === monthFilter)
    : null;

  // 沒選銀行時表格走原本邏輯（只看 savings 類型）
  const visibleTransactions = type === 'savings' && bankFilter
    ? []
    : transactions;
  const filteredSubtotal = null;

  const marketValue = investmentMetrics?.marketValueTwd || 0;
  const realizedPnl = investmentMetrics?.realizedTwd || 0;
  const unrealizedPnl = investmentMetrics?.unrealizedTwd || 0;
  const totalPnl = investmentMetrics?.totalPnlTwd || 0;
  const openCost = investmentMetrics?.openCostTwd || 0;
  const totalPnlPct = openCost > 0 ? (totalPnl / openCost) * 100 : 0;

  return (
    <div>
      <div className="page-header">
        <h1>{typeLabels[type]}管理</h1>
        <p>{description}{family ? ` — ${family.name}` : ''}</p>
      </div>

      {!family && (
        <div className="alert" style={{ background: 'var(--color-primary-light)', color: '#1e40af', border: '1px solid #bfdbfe' }}>
          您尚未加入任何家庭，請先到 <a href="/family" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>家庭管理</a> 建立或加入家庭
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{type === 'investment' ? '總成本' : '總計'}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: type === 'expense' ? 'var(--color-danger)' : 'var(--color-success)' }}>
              NT$ {total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          {type === 'investment' && (
            <>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  目前市值{pricesLoading ? '（更新中…）' : ''}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-primary)' }}>
                  NT$ {marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>未實現損益</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: unrealizedPnl >= 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                  {unrealizedPnl >= 0 ? '+' : ''}NT$ {unrealizedPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>已實現損益</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: realizedPnl >= 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                  {realizedPnl >= 0 ? '+' : ''}NT$ {realizedPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>總損益</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: totalPnl >= 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                  {totalPnl >= 0 ? '+' : ''}NT$ {totalPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  {openCost > 0 && (
                    <span style={{ fontSize: 14, marginLeft: 8 }}>({totalPnl >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%)</span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        <button className="btn btn-primary" onClick={() => { setEditData(null); setShowForm(true); }} disabled={!family}>
          新增{typeLabels[type]}
        </button>
      </div>

      {type === 'savings' && bankSummary && bankSummary.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3>依銀行匯總</h3>
            {bankFilter && (
              <button className="btn btn-secondary btn-sm" onClick={() => { setBankFilter(null); setMonthFilter(''); }}>
                顯示全部
              </button>
            )}
          </div>
          <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {bankSummary.map(b => {
              const isActive = bankFilter === b.bank;
              const balanceColor = b.balance < 0 ? 'var(--color-danger)' : isActive ? '#fff' : 'inherit';
              return (
                <button
                  key={b.bank}
                  type="button"
                  onClick={() => setBankFilter(isActive ? null : b.bank)}
                  style={{
                    flex: '0 1 200px',
                    textAlign: 'left',
                    padding: '12px 16px',
                    background: isActive ? 'var(--color-primary)' : 'var(--color-bg)',
                    color: isActive ? '#fff' : 'inherit',
                    border: '1.5px solid ' + (isActive ? 'var(--color-primary)' : 'var(--color-border)'),
                    borderRadius: 8,
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: 13, opacity: 0.85 }}>{b.bank}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2, color: balanceColor }}>
                    NT$ {b.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4, lineHeight: 1.5 }}>
                    存款 {b.savings.toLocaleString()}
                    {b.income > 0 && <> · 收入 +{b.income.toLocaleString()}</>}
                    {b.expense > 0 && <> · 支出 −{b.expense.toLocaleString()}</>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 銀行明細（含收入 / 支出 / 存款） */}
      {type === 'savings' && bankFilter && bankDetail && (() => {
        const b = bankSummary.find(x => x.bank === bankFilter);
        const monthSubtotal = bankDetail.reduce((s, t) => {
          const amt = parseFloat(t.amount) || 0;
          return s + (t.type === 'expense' ? -amt : amt);
        }, 0);
        return (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <h3 style={{ margin: 0 }}>
                {bankFilter} 明細
                <span style={{ marginLeft: 12, fontSize: 13, fontWeight: 400, color: 'var(--color-text-secondary)' }}>
                  總餘額 <strong style={{ color: b && b.balance < 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    NT$ {(b?.balance || 0).toLocaleString()}
                  </strong>
                </span>
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>月份</label>
                <select
                  className="form-select"
                  value={monthFilter}
                  onChange={e => setMonthFilter(e.target.value)}
                  style={{ width: 'auto', fontSize: 13 }}
                >
                  <option value="">全部</option>
                  {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="card-body no-padding">
              {bankDetail.length === 0 ? (
                <div className="empty-state"><p>此月份沒有交易紀錄</p></div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>日期</th>
                        <th>類型</th>
                        <th>類別</th>
                        <th style={{ textAlign: 'right' }}>金額</th>
                        <th>備註</th>
                        <th style={{ textAlign: 'right' }}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bankDetail.map(t => {
                        const amt = parseFloat(t.amount) || 0;
                        const isExpense = t.type === 'expense';
                        const sign = isExpense ? '−' : '+';
                        return (
                          <tr key={t.id}>
                            <td>{new Date(t.date).toLocaleDateString('zh-TW')}</td>
                            <td>
                              <span className={`badge badge-${t.type}`}>{typeLabels[t.type]}</span>
                            </td>
                            <td style={{ color: 'var(--color-text-secondary)' }}>{t.category || '-'}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: isExpense ? 'var(--color-danger)' : 'var(--color-success)' }}>
                              {sign}NT$ {amt.toLocaleString()}
                            </td>
                            <td style={{ color: 'var(--color-text-secondary)' }}>{t.description || '-'}</td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => { setEditData(t); setShowForm(true); }}>編輯</button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>刪除</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ padding: '12px 24px', borderTop: '1px solid var(--color-border)', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                共 {bankDetail.length} 筆{monthFilter ? `（${monthFilter}）` : ''}，
                當期淨額 <strong style={{ color: monthSubtotal < 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                  {monthSubtotal >= 0 ? '+' : ''}NT$ {monthSubtotal.toLocaleString()}
                </strong>
              </div>
            </div>
          </div>
        );
      })()}

      {!(type === 'savings' && bankFilter) && (
      <div className="card">
        <div className="card-body no-padding">
          {!family ? (
            <div className="empty-state"><h3>請先加入家庭</h3><p>加入家庭後即可開始記錄</p></div>
          ) : transactions.length === 0 ? (
            <div className="empty-state">
              <h3>尚無{typeLabels[type]}記錄</h3>
              <p>點擊右上角按鈕新增您的第一筆{typeLabels[type]}</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>日期</th>
                    {type === 'savings' && <th>銀行</th>}
                    {(type === 'income' || type === 'expense') && <th>帳戶</th>}
                    {type === 'investment' && <th>動作</th>}
                    {type === 'investment' && <th>名稱</th>}
                    {type === 'investment' && <th>代號</th>}
                    {type === 'investment' && <th>股數</th>}
                    <th>類別</th>
                    <th>{type === 'investment' ? '單價' : '金額'}</th>
                    {type === 'investment' && <th>總額</th>}
                    {type === 'investment' && <th>現價</th>}
                    {type === 'investment' && <th>市值</th>}
                    {type === 'investment' && <th>損益</th>}
                    <th>備註</th>
                    {type !== 'investment' && <th>固定</th>}
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTransactions.map(t => {
                    const tk = (t.ticker || '').trim().toUpperCase();
                    const isSell = type === 'investment' && t.action === 'sell';
                    const priceInfo = type === 'investment' && tk ? prices[tk] : null;
                    const livePriceRaw = priceInfo && !priceInfo.error ? priceInfo.price : null;
                    const priceCcy = priceInfo?.currency ? priceInfo.currency.toUpperCase() : 'TWD';
                    const costCcy = (t.currency || 'TWD').toUpperCase();
                    const priceRate = fx[priceCcy] != null ? fx[priceCcy] : 1;
                    const costRate = fx[costCcy] != null ? fx[costCcy] : 1;
                    const livePrice = livePriceRaw != null
                      ? (priceCcy === costCcy ? livePriceRaw : livePriceRaw * priceRate / costRate)
                      : null;
                    const sh = parseFloat(t.shares);
                    const hasShares = !Number.isNaN(sh) && sh > 0;
                    const unitCost = parseFloat(t.amount) || 0;
                    const rowGross = type === 'investment' && hasShares ? unitCost * sh : unitCost;
                    // 買進列：未實現損益 = 現價市值 - 成本
                    const buyMarketValue = !isSell && livePrice != null && hasShares ? livePrice * sh : null;
                    const buyPnl = buyMarketValue != null ? buyMarketValue - rowGross : null;
                    const buyPnlPct = buyPnl != null && rowGross > 0 ? (buyPnl / rowGross) * 100 : null;
                    // 賣出列：已實現損益 = (賣價 - 該 ticker 平均成本) × 股數
                    const grpKey = tk ? `${tk}|${costCcy}` : null;
                    const group = grpKey && investmentMetrics ? investmentMetrics.perTicker.get(grpKey) : null;
                    const avgCost = group?.avgCost || 0;
                    const realizedPerRow = isSell && hasShares ? (unitCost - avgCost) * sh : null;
                    const realizedPct = realizedPerRow != null && avgCost > 0 ? ((unitCost - avgCost) / avgCost) * 100 : null;
                    const rowPnl = isSell ? realizedPerRow : buyPnl;
                    const rowPnlPct = isSell ? realizedPct : buyPnlPct;
                    const ccyPrefix = type === 'investment' ? costCcy + ' ' : 'NT$ ';
                    return (
                    <tr key={t.id}>
                      <td>{new Date(t.date).toLocaleDateString('zh-TW')}</td>
                      {type === 'savings' && <td style={{ fontWeight: 600 }}>{t.name || '-'}</td>}
                      {(type === 'income' || type === 'expense') && <td style={{ fontWeight: 600 }}>{t.name || '-'}</td>}
                      {type === 'investment' && (
                        <td>
                          <span className="badge" style={{
                            background: isSell ? '#dcfce7' : '#fee2e2',
                            color: isSell ? '#15803d' : '#b91c1c',
                            border: 'none',
                            fontWeight: 600
                          }}>
                            {isSell ? '賣出' : '買進'}
                          </span>
                        </td>
                      )}
                      {type === 'investment' && <td style={{ fontWeight: 600 }}>{t.name || '-'}</td>}
                      {type === 'investment' && (
                        <td style={{ fontFamily: 'monospace', fontSize: 13 }}>
                          {tk || <span style={{ color: 'var(--color-text-muted)' }}>-</span>}
                        </td>
                      )}
                      {type === 'investment' && (
                        <td style={{ textAlign: 'right' }}>
                          {hasShares ? sh.toLocaleString(undefined, { maximumFractionDigits: 4 }) : <span style={{ color: 'var(--color-text-muted)' }}>-</span>}
                        </td>
                      )}
                      <td>
                        <span
                          className={`badge badge-${t.type}`}
                          style={categoryBadgeStyle(t.type, t.category) || undefined}
                        >
                          {t.category || '未分類'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {ccyPrefix}{unitCost.toLocaleString(undefined, { maximumFractionDigits: type === 'investment' ? 4 : 0 })}
                      </td>
                      {type === 'investment' && (
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {ccyPrefix}{rowGross.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                      )}
                      {type === 'investment' && (
                        <td style={{ textAlign: 'right' }}>
                          {isSell ? (
                            <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                          ) : priceInfo?.error ? (
                            <span style={{ color: 'var(--color-danger)', fontSize: 12 }} title={priceInfo.error}>抓取失敗</span>
                          ) : livePrice != null ? (
                            <>{costCcy} {livePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</>
                          ) : pricesLoading && tk ? (
                            <span style={{ color: 'var(--color-text-muted)' }}>…</span>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)' }}>-</span>
                          )}
                        </td>
                      )}
                      {type === 'investment' && (
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {isSell ? (
                            <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                          ) : buyMarketValue != null
                            ? `${ccyPrefix}${buyMarketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                            : <span style={{ color: 'var(--color-text-muted)' }}>-</span>}
                        </td>
                      )}
                      {type === 'investment' && (
                        <td style={{ textAlign: 'right', fontWeight: 600, color: rowPnl == null ? 'var(--color-text-muted)' : rowPnl >= 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                          {rowPnl == null ? '-' : (
                            <>
                              {rowPnl >= 0 ? '+' : ''}{ccyPrefix}{rowPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              {rowPnlPct != null && (
                                <div style={{ fontSize: 11, fontWeight: 400 }}>
                                  {rowPnl >= 0 ? '+' : ''}{rowPnlPct.toFixed(2)}%
                                </div>
                              )}
                            </>
                          )}
                        </td>
                      )}
                      <td style={{ color: 'var(--color-text-secondary)' }}>{t.description || '-'}</td>
                      {type !== 'investment' && (
                        <td>
                          {t.recurring ? (
                            <span style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 500 }}>
                              🔄 {t.recurring_freq === 'weekly' ? '每週' : t.recurring_freq === 'yearly' ? '每年' : '每月'}
                            </span>
                          ) : <span style={{ color: 'var(--color-text-muted)' }}>-</span>}
                        </td>
                      )}
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setEditData(t); setShowForm(true); }}>編輯</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>刪除</button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      )}

      {showForm && family && (
        <TransactionForm
          familyId={family.id}
          onSubmit={editData ? handleUpdate : handleCreate}
          onClose={() => { setShowForm(false); setEditData(null); }}
          initialData={editData}
          defaultType={editData ? undefined : type}
        />
      )}
    </div>
  );
}
