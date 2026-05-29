import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import TransactionForm from './TransactionForm';

const typeLabels = { income: '收入', expense: '支出', investment: '投資', savings: '存款' };

export default function TransactionPage({ type, description }) {
  const [family, setFamily] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState({});
  const [pricesLoading, setPricesLoading] = useState(false);

  const loadPrices = useCallback(async (txs) => {
    if (type !== 'investment') return;
    const tickers = [...new Set(txs.map(t => (t.ticker || '').trim().toUpperCase()).filter(Boolean))];
    if (!tickers.length) { setPrices({}); return; }
    setPricesLoading(true);
    try {
      const { prices } = await api.getPrices(tickers);
      setPrices(prices || {});
    } catch (err) {
      console.error('Load prices error:', err);
    } finally {
      setPricesLoading(false);
    }
  }, [type]);

  const txTotalCost = useCallback((tx) => {
    if (type === 'investment') {
      const sh = parseFloat(tx.shares);
      if (!Number.isNaN(sh) && sh > 0) return (parseFloat(tx.amount) || 0) * sh;
    }
    return parseFloat(tx.amount) || 0;
  }, [type]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [familyData, txData] = await Promise.all([
        api.getMyFamily(),
        api.getTransactions({ type })
      ]);
      setFamily(familyData.family);
      const txs = txData.transactions || [];
      setTransactions(txs);
      const t = txs.reduce((sum, tx) => sum + txTotalCost(tx), 0);
      setTotal(t);
      loadPrices(txs);
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

  let marketValue = 0;
  let costOfPriced = 0;
  if (type === 'investment') {
    transactions.forEach(t => {
      const tk = (t.ticker || '').trim().toUpperCase();
      const p = tk && prices[tk] && !prices[tk].error ? prices[tk].price : null;
      const sh = parseFloat(t.shares);
      if (p != null && !Number.isNaN(sh) && sh > 0) {
        marketValue += p * sh;
        costOfPriced += (parseFloat(t.amount) || 0) * sh;
      }
    });
  }
  const pnl = marketValue - costOfPriced;
  const pnlPct = costOfPriced > 0 ? (pnl / costOfPriced) * 100 : 0;

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
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>損益（已估價部分）</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: pnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {pnl >= 0 ? '+' : ''}NT$ {pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  <span style={{ fontSize: 14, marginLeft: 8 }}>({pnl >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)</span>
                </div>
              </div>
            </>
          )}
        </div>
        <button className="btn btn-primary" onClick={() => { setEditData(null); setShowForm(true); }} disabled={!family}>
          新增{typeLabels[type]}
        </button>
      </div>

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
                    {type === 'investment' && <th>名稱</th>}
                    {type === 'investment' && <th>代號</th>}
                    {type === 'investment' && <th>股數</th>}
                    <th>類別</th>
                    <th>{type === 'investment' ? '買入價' : '金額'}</th>
                    {type === 'investment' && <th>總成本</th>}
                    {type === 'investment' && <th>現價</th>}
                    {type === 'investment' && <th>市值</th>}
                    {type === 'investment' && <th>損益</th>}
                    <th>備註</th>
                    {type !== 'investment' && <th>固定</th>}
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => {
                    const tk = (t.ticker || '').trim().toUpperCase();
                    const priceInfo = type === 'investment' && tk ? prices[tk] : null;
                    const livePrice = priceInfo && !priceInfo.error ? priceInfo.price : null;
                    const sh = parseFloat(t.shares);
                    const hasShares = !Number.isNaN(sh) && sh > 0;
                    const unitCost = parseFloat(t.amount) || 0;
                    const rowTotalCost = type === 'investment' && hasShares ? unitCost * sh : unitCost;
                    const rowMarketValue = livePrice != null && hasShares ? livePrice * sh : null;
                    const rowPnl = rowMarketValue != null ? rowMarketValue - rowTotalCost : null;
                    const rowPnlPct = rowPnl != null && rowTotalCost > 0 ? (rowPnl / rowTotalCost) * 100 : null;
                    return (
                    <tr key={t.id}>
                      <td>{new Date(t.date).toLocaleDateString('zh-TW')}</td>
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
                      <td><span className={`badge badge-${t.type}`}>{t.category || '未分類'}</span></td>
                      <td style={{ fontWeight: 600 }}>
                        {type === 'investment' ? `NT$ ${unitCost.toLocaleString(undefined, { maximumFractionDigits: 4 })}` : `NT$ ${unitCost.toLocaleString()}`}
                      </td>
                      {type === 'investment' && (
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          NT$ {rowTotalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                      )}
                      {type === 'investment' && (
                        <td style={{ textAlign: 'right' }}>
                          {priceInfo?.error ? (
                            <span style={{ color: 'var(--color-danger)', fontSize: 12 }} title={priceInfo.error}>抓取失敗</span>
                          ) : livePrice != null ? (
                            <>
                              {priceInfo.currency || ''} {livePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </>
                          ) : pricesLoading && tk ? (
                            <span style={{ color: 'var(--color-text-muted)' }}>…</span>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)' }}>-</span>
                          )}
                        </td>
                      )}
                      {type === 'investment' && (
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {rowMarketValue != null ? rowMarketValue.toLocaleString(undefined, { maximumFractionDigits: 0 }) : <span style={{ color: 'var(--color-text-muted)' }}>-</span>}
                        </td>
                      )}
                      {type === 'investment' && (
                        <td style={{ textAlign: 'right', fontWeight: 600, color: rowPnl == null ? 'var(--color-text-muted)' : rowPnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {rowPnl == null ? '-' : (
                            <>
                              {rowPnl >= 0 ? '+' : ''}{rowPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
