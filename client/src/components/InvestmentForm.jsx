import { useState, useEffect } from 'react'
import { api } from '../api'

export default function InvestmentForm({ categories, onSuccess }) {
  const [form, setForm] = useState({
    category: categories[0] || '', amount: '', note: '', date: new Date().toISOString().split('T')[0],
    assetName: '', quantity: '', unitPrice: '', fee: '0', txType: 'buy', currentPrice: '',
  })
  const [transactions, setTransactions] = useState([])
  const [portfolio, setPortfolio] = useState(null)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [view, setView] = useState('portfolio')

  const fetchData = () => {
    api.transactions.list({ type: 'investment', mine: 'true' }).then(setTransactions).catch(() => {})
    api.transactions.list({ type: 'investment', mine: 'true', _: Date.now() }).then(async () => {
      try {
        const res = await fetch('/api/transactions/portfolio', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setPortfolio(data)
      } catch {}
    }).catch(() => {})
  }

  useEffect(() => { fetchData() }, [])

  useEffect(() => { if (onSuccess) fetchData() }, [onSuccess])

  const resetForm = () => {
    setForm({ category: categories[0] || '', amount: '', note: '', date: new Date().toISOString().split('T')[0],
      assetName: '', quantity: '', unitPrice: '', fee: '0', txType: 'buy', currentPrice: '' })
    setEditingId(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const body = {
        ...form, type: 'investment',
        amount: Number(form.amount),
        quantity: form.quantity ? Number(form.quantity) : 0,
        unitPrice: form.unitPrice ? Number(form.unitPrice) : 0,
        fee: form.fee ? Number(form.fee) : 0,
        currentPrice: form.currentPrice ? Number(form.currentPrice) : 0,
      }
      if (editingId) {
        await api.transactions.update(editingId, body)
      } else {
        await api.transactions.create(body)
      }
      resetForm()
      fetchData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleEdit = (t) => {
    setForm({
      category: t.category, amount: String(t.amount), note: t.note || '', date: t.date,
      assetName: t.asset_name || '', quantity: String(t.quantity || ''),
      unitPrice: String(t.unit_price || ''), fee: String(t.fee || '0'),
      txType: t.tx_type || 'buy', currentPrice: String(t.current_price || ''),
    })
    setEditingId(t.id)
    setView('form')
  }

  const handleDelete = async (id) => {
    if (!confirm('確定刪除？')) return
    await api.transactions.delete(id)
    fetchData()
  }

  const txTypeLabels = { buy: '買入', sell: '賣出', dividend: '股利' }
  const totalInvested = transactions.filter(t => t.tx_type === 'buy').reduce((s, t) => s + t.amount, 0)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={`btn ${view === 'portfolio' ? 'btn-primary' : 'btn-outline'} btn-sm`} onClick={() => setView('portfolio')}>投資組合</button>
        <button className={`btn ${view === 'form' ? 'btn-primary' : 'btn-outline'} btn-sm`} onClick={() => setView('form')}>新增交易</button>
        <button className={`btn ${view === 'history' ? 'btn-primary' : 'btn-outline'} btn-sm`} onClick={() => setView('history')}>交易記錄</button>
        <button className={`btn ${view === 'calculator' ? 'btn-primary' : 'btn-outline'} btn-sm`} onClick={() => setView('calculator')}>複利計算</button>
      </div>

      {view === 'calculator' && <CompoundCalculator />}

      {view === 'portfolio' && portfolio && (
        <>
          <div className="grid-3 mb-3">
            <div className="card text-center">
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>總投入本金</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>${portfolio.summary.totalInvested.toLocaleString()}</div>
            </div>
            <div className="card text-center">
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>總報酬（已實現+股利）</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: portfolio.summary.totalReturn >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                ${portfolio.summary.totalReturn.toLocaleString()}
              </div>
            </div>
            <div className="card text-center">
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>整體報酬率</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: portfolio.summary.roi >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {portfolio.summary.roi}%
              </div>
            </div>
          </div>
          {portfolio.portfolio.some(a => a.totalDividends > 0) && (
            <div className="card mb-3" style={{ background: '#fff3e0', textAlign: 'center', padding: 12 }}>
              <span style={{ fontSize: 15 }}>📋 股利總計：
                <strong style={{ color: 'var(--warning)', fontSize: 20 }}>
                  ${portfolio.portfolio.reduce((s, a) => s + (a.totalDividends || 0), 0).toLocaleString()}
                </strong>
              </span>
            </div>
          )}

          {portfolio.portfolio.length === 0 ? (
            <div className="card text-center" style={{ padding: 40, color: 'var(--text-secondary)' }}>
              尚無投資組合資料，請先新增買入交易
            </div>
          ) : (
            <div className="card">
              <h2 style={{ fontWeight: 700, marginBottom: 16 }}>投資組合明細</h2>
              <div style={{ overflowX: 'auto' }}>
                <table className="portfolio-table">
                  <thead>
                    <tr>
                      <th>標的</th>
                      <th>分類</th>
                      <th>持有數量</th>
                      <th>平均成本</th>
                      <th>投入本金</th>
                      <th>股利合計</th>
                      <th>已實現損益</th>
                      <th>報酬率</th>
                      <th>配置比例</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.portfolio.map(a => {
                      const allocPct = portfolio.summary.totalInvested > 0 ? (a.totalInvested / portfolio.summary.totalInvested * 100) : 0
                      return (
                        <tr key={a.name}>
                          <td style={{ fontWeight: 700 }}>{a.name}</td>
                          <td><span className="badge badge-investment">{a.category}</span></td>
                          <td>{a.totalShares.toFixed(2)}</td>
                          <td>${a.avgCost.toLocaleString()}</td>
                          <td style={{ color: 'var(--danger)' }}>-${a.totalInvested.toLocaleString()}</td>
                          <td style={{ color: 'var(--warning)', fontWeight: 700 }}>
                            +${(a.totalDividends || 0).toLocaleString()}
                          </td>
                          <td style={{ color: a.totalPL >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                            {a.totalPL >= 0 ? '+' : ''}${a.totalPL.toLocaleString()}
                          </td>
                          <td style={{ color: a.roi >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                            {a.roi >= 0 ? '+' : ''}{a.roi}%
                          </td>
                          <td>{allocPct.toFixed(1)}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {view === 'portfolio' && !portfolio && (
        <div className="card text-center" style={{ padding: 40, color: 'var(--text-secondary)' }}>載入中...</div>
      )}

      {view === 'form' && (
        <div className="card">
          <h2 style={{ fontWeight: 700, marginBottom: 16 }}>{editingId ? '編輯交易' : '新增投資交易'}</h2>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="grid-3">
              <div className="input-group">
                <label>交易類型</label>
                <select value={form.txType} onChange={e => setForm({ ...form, txType: e.target.value })}>
                  <option value="buy">買入</option>
                  <option value="sell">賣出</option>
                  <option value="dividend">股利/配息</option>
                </select>
              </div>
              <div className="input-group">
                <label>投資分類</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>投資標的名稱</label>
                <input value={form.assetName} onChange={e => setForm({ ...form, assetName: e.target.value })} />
              </div>
            </div>
            <div className="grid-3">
              <div className="input-group">
                <label>數量（股/單位）</label>
                <input type="number" step="0.0001" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div className="input-group">
                <label>單價</label>
                <input type="number" step="0.01" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: e.target.value })} />
              </div>
              <div className="input-group">
                <label>交易金額（總額）*</label>
                <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
              </div>
            </div>
            <div className="grid-3">
              <div className="input-group">
                <label>手續費</label>
                <input type="number" step="0.01" value={form.fee} onChange={e => setForm({ ...form, fee: e.target.value })} />
              </div>
              <div className="input-group">
                <label>現價（用於計算未實現損益）</label>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.01" value={form.currentPrice} onChange={e => setForm({ ...form, currentPrice: e.target.value })} style={{ flex: 1 }} />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={async () => {
                    const sym = form.assetName.trim()
                    if (!sym) { setError('請先輸入投資標的名稱'); return }
                    setError('')
                    try {
                      const r = await fetch(`/api/prices/${encodeURIComponent(sym)}`, { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } })
                      const d = await r.json()
                      if (!r.ok) throw new Error(d.error)
                      setForm(prev => ({ ...prev, currentPrice: String(d.price) }))
                    } catch (e) { setError('查價失敗：' + e.message) }
                  }}>🔍 獲取現價</button>
                </div>
              </div>
              <div className="input-group">
                <label>交易日期 *</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              </div>
            </div>
            <div className="input-group">
              <label>備註</label>
              <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary">
                {editingId ? '更新' : '新增'}
              </button>
              {editingId && (
                <button type="button" className="btn btn-outline" onClick={resetForm}>取消</button>
              )}
            </div>
          </form>
        </div>
      )}

      {view === 'history' && (
        <div className="card">
          <h2 style={{ fontWeight: 700, marginBottom: 16 }}>所有交易記錄</h2>
          <div className="transaction-list">
            {transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>尚無交易記錄</div>
            ) : (
              transactions.map(t => (
                <div key={t.id} className="transaction-item">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`badge ${t.tx_type === 'buy' ? 'badge-income' : t.tx_type === 'sell' ? 'badge-expense' : 'badge-investment'}`}>
                        {txTypeLabels[t.tx_type] || t.tx_type}
                      </span>
                      <span style={{ fontWeight: 700 }}>{t.asset_name || t.category}</span>
                      {t.quantity > 0 && <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.quantity}股</span>}
                      {t.unit_price > 0 && <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>@${t.unit_price}</span>}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {t.date} {t.category} {t.note && `- ${t.note}`}
                      {t.fee > 0 && ` | 手續費 $${t.fee}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontWeight: 700, fontSize: 18, color: t.tx_type === 'sell' ? 'var(--success)' : t.tx_type === 'dividend' ? 'var(--warning)' : 'var(--danger)' }}>
                      {t.tx_type === 'sell' || t.tx_type === 'dividend' ? '+' : '-'}${t.amount.toLocaleString()}
                    </span>
                    <button className="btn btn-outline btn-sm" onClick={() => handleEdit(t)}>編輯</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>刪除</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  )
}

function CompoundCalculator() {
  const [principal, setPrincipal] = useState('100000')
  const [rate, setRate] = useState('5')
  const [years, setYears] = useState('10')
  const [freq, setFreq] = useState('12')
  const [extra, setExtra] = useState('0')

  const freqLabels = { 1: '每年', 4: '每季', 12: '每月' }
  const P = parseFloat(principal) || 0
  const r = (parseFloat(rate) || 0) / 100
  const n = parseInt(freq) || 1
  const t = parseFloat(years) || 0
  const E = parseFloat(extra) || 0

  const fv = P * Math.pow(1 + r / n, n * t)
  let totalExtra = 0
  if (E > 0) {
    totalExtra = E * ((Math.pow(1 + r / n, n * t) - 1) / (r / n))
  }
  const finalAmount = fv + totalExtra
  const totalContrib = P + (E * n * t)
  const interest = finalAmount - totalContrib

  return (
    <div className="card">
      <h2 style={{ fontWeight: 700, marginBottom: 16 }}>複利計算器</h2>
      <div className="grid-3">
        <div className="input-group">
          <label>本金</label>
          <input type="number" value={principal} onChange={e => setPrincipal(e.target.value)} />
        </div>
        <div className="input-group">
          <label>年利率 (%)</label>
          <input type="number" step="0.1" value={rate} onChange={e => setRate(e.target.value)} />
        </div>
        <div className="input-group">
          <label>期數（年）</label>
          <input type="number" step="0.5" value={years} onChange={e => setYears(e.target.value)} />
        </div>
      </div>
      <div className="grid-3">
        <div className="input-group">
          <label>複利頻率</label>
          <select value={freq} onChange={e => setFreq(e.target.value)}>
            {Object.entries(freqLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="input-group">
          <label>每期投入金額</label>
          <input type="number" value={extra} onChange={e => setExtra(e.target.value)} />
        </div>
        <div className="input-group" style={{ justifyContent: 'center' }}>
          <label style={{ opacity: 0 }}>.</label>
          <button className="btn btn-outline btn-sm" onClick={() => { setPrincipal(''); setRate(''); setYears(''); setExtra('') }}>清除</button>
        </div>
      </div>

      {t > 0 && (
        <div className="grid-3 mt-2">
          <div className="card text-center" style={{ padding: 16, background: '#e3f2fd' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>最終總額</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)' }}>
              ${Math.round(finalAmount).toLocaleString()}
            </div>
          </div>
          <div className="card text-center" style={{ padding: 16, background: '#e8f5e9' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>總投入本金</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--success)' }}>
              ${Math.round(totalContrib).toLocaleString()}
            </div>
          </div>
          <div className="card text-center" style={{ padding: 16, background: '#fff3e0' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>複利收益</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--warning)' }}>
              ${Math.round(interest).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = `
  .transaction-list { max-height: 500px; overflow-y: auto; }
  .transaction-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 0; border-bottom: 1px solid var(--border);
  }
  .transaction-item:last-child { border-bottom: none; }
  .portfolio-table { width: 100%; border-collapse: collapse; font-size: 14px; }
  .portfolio-table th { text-align: left; padding: 10px 8px; border-bottom: 2px solid var(--border); font-weight: 600; color: var(--text-secondary); white-space: nowrap; }
  .portfolio-table td { padding: 10px 8px; border-bottom: 1px solid var(--border); }
  .portfolio-table tr:last-child td { border-bottom: none; }
  .portfolio-table tr:hover td { background: #f8f9fa; }
`
