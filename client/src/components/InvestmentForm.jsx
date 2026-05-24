import { useState } from 'react'
import { api } from '../api'

export default function InvestmentForm({ categories, onSuccess, transactions }) {
  const [form, setForm] = useState({ category: categories[0] || '', amount: '', note: '', date: new Date().toISOString().split('T')[0] })
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)

  const total = transactions.reduce((s, t) => s + t.amount, 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editingId) {
        await api.transactions.update(editingId, form)
      } else {
        await api.transactions.create({ ...form, type: 'investment' })
      }
      setForm({ category: categories[0] || '', amount: '', note: '', date: new Date().toISOString().split('T')[0] })
      setEditingId(null)
      onSuccess()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleEdit = (t) => {
    setForm({ category: t.category, amount: String(t.amount), note: t.note, date: t.date })
    setEditingId(t.id)
  }

  const handleDelete = async (id) => {
    if (!confirm('確定刪除此筆記錄？')) return
    await api.transactions.delete(id)
    onSuccess()
  }

  const totalReturn = transactions.filter(t => t.category === '投資收益').reduce((s, t) => s + t.amount, 0)
  const totalInvested = transactions.filter(t => t.category !== '投資收益').reduce((s, t) => s + t.amount, 0)
  const roi = totalInvested > 0 ? ((totalReturn - totalInvested) / totalInvested * 100) : 0

  return (
    <div>
      <div className="grid-2">
        <div className="card">
          <h2 style={{ fontWeight: 700, marginBottom: 16 }}>
            {editingId ? '編輯投資' : '新增投資'}
          </h2>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>分類</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>金額</label>
              <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0" required />
            </div>
            <div className="input-group">
              <label>日期</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div className="input-group">
              <label>備註</label>
              <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="備註說明" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                {editingId ? '更新' : '新增'}
              </button>
              {editingId && (
                <button type="button" className="btn btn-outline" onClick={() => { setEditingId(null); setForm({ category: categories[0] || '', amount: '', note: '', date: new Date().toISOString().split('T')[0] }) }}>
                  取消
                </button>
              )}
            </div>
          </form>
        </div>

        <div>
          <div className="card mb-3">
            <div className="grid-3">
              <div className="text-center">
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>總投資金額</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>${total.toLocaleString()}</div>
              </div>
              <div className="text-center">
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>投資收益</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: totalReturn >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  ${totalReturn.toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>報酬率</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: roi >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {roi.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontWeight: 700, marginBottom: 16 }}>投資記錄</h2>
            <div className="transaction-list">
              {transactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>尚無投資記錄</div>
              ) : (
                transactions.map(t => (
                  <div key={t.id} className="transaction-item">
                    <div>
                      <div style={{ fontWeight: 600 }}>{t.category}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.date} {t.note && `- ${t.note}`}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-investment" style={{ fontWeight: 700, fontSize: 18 }}>
                        ${t.amount.toLocaleString()}
                      </span>
                      <button className="btn btn-outline btn-sm" onClick={() => handleEdit(t)}>編輯</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>刪除</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{transactionStyles}</style>
    </div>
  )
}

const transactionStyles = `
  .transaction-list { max-height: 400px; overflow-y: auto; }
  .transaction-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 0; border-bottom: 1px solid var(--border);
  }
  .transaction-item:last-child { border-bottom: none; }
`
