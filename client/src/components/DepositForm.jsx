import { useState } from 'react'
import { api } from '../api'

export default function DepositForm({ categories, onSuccess, transactions }) {
  const [view, setView] = useState('add')

  return (
    <div>
      <div className="card mb-2" style={{ padding: 0 }}>
        <div style={{ display: 'flex' }}>
          <button
            className={`btn ${view === 'add' ? 'btn-primary' : 'btn-outline'}`}
            style={{ flex: 1, borderRadius: 0, border: 'none', padding: 12 }}
            onClick={() => setView('add')}
          >新增存款</button>
          <button
            className={`btn ${view === 'transfer' ? 'btn-primary' : 'btn-outline'}`}
            style={{ flex: 1, borderRadius: 0, border: 'none', padding: 12 }}
            onClick={() => setView('transfer')}
          >帳戶互轉</button>
          <button
            className={`btn ${view === 'list' ? 'btn-primary' : 'btn-outline'}`}
            style={{ flex: 1, borderRadius: 0, border: 'none', padding: 12 }}
            onClick={() => setView('list')}
          >存款記錄</button>
        </div>
      </div>

      {view === 'add' && <AddDeposit categories={categories} onSuccess={onSuccess} />}
      {view === 'transfer' && <TransferForm categories={categories} onSuccess={onSuccess} />}
      {view === 'list' && <DepositList categories={categories} onSuccess={onSuccess} transactions={transactions} />}
    </div>
  )
}

function AddDeposit({ categories, onSuccess }) {
  const [form, setForm] = useState({ category: categories[0] || '', amount: '', note: '', date: new Date().toISOString().split('T')[0] })
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.transactions.create({ ...form, type: 'deposit' })
      setForm({ category: categories[0] || '', amount: '', note: '', date: new Date().toISOString().split('T')[0] })
      onSuccess()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="card">
      <h2 style={{ fontWeight: 700, marginBottom: 16 }}>新增存款</h2>
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
          <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
        </div>
        <div className="input-group">
          <label>日期</label>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
        </div>
        <div className="input-group">
          <label>備註</label>
          <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
        </div>
        <button type="submit" className="btn btn-primary">新增</button>
      </form>
    </div>
  )
}

function TransferForm({ categories, onSuccess }) {
  const [form, setForm] = useState({
    from: categories[0] || '',
    to: categories[1] || categories[0] || '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.from === form.to) {
      setError('來源與目標帳戶不能相同')
      return
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError('請輸入有效金額')
      return
    }
    setLoading(true)
    try {
      await Promise.all([
        api.transactions.create({
          type: 'deposit',
          category: form.from,
          amount: -Math.abs(parseFloat(form.amount)),
          date: form.date,
          note: `轉帳至 ${form.to}${form.note ? ` (${form.note})` : ''}`,
        }),
        api.transactions.create({
          type: 'deposit',
          category: form.to,
          amount: Math.abs(parseFloat(form.amount)),
          date: form.date,
          note: `來自 ${form.from}${form.note ? ` (${form.note})` : ''}`,
        }),
      ])
      setForm({
        from: categories[0] || '',
        to: categories[1] || categories[0] || '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        note: '',
      })
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFromChange = (from) => {
    setForm(prev => ({ ...prev, from, to: prev.to === from ? categories.find(c => c !== from) || '' : prev.to }))
  }

  return (
    <div className="card">
      <h2 style={{ fontWeight: 700, marginBottom: 16 }}>帳戶互轉</h2>
      {error && <div className="error-msg">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label>從（轉出）</label>
          <select value={form.from} onChange={e => handleFromChange(e.target.value)}>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="input-group">
          <label>到（轉入）</label>
          <select value={form.to} onChange={e => setForm({ ...form, to: e.target.value })}>
            {categories.filter(c => c !== form.from).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="input-group">
          <label>金額</label>
          <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
        </div>
        <div className="input-group">
          <label>日期</label>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
        </div>
        <div className="input-group">
          <label>備註</label>
          <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? '處理中...' : '確認轉帳'}
        </button>
      </form>
    </div>
  )
}

function DepositList({ categories, onSuccess, transactions }) {
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ category: '', amount: '', note: '', date: '' })

  const total = transactions.reduce((s, t) => s + t.amount, 0)

  const handleEdit = (t) => {
    setEditingId(t.id)
    setEditForm({ category: t.category, amount: String(t.amount), note: t.note, date: t.date })
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    await api.transactions.update(editingId, { ...editForm, amount: parseFloat(editForm.amount) })
    setEditingId(null)
    onSuccess()
  }

  const handleDelete = async (id) => {
    if (!confirm('確定刪除此筆記錄？')) return
    await api.transactions.delete(id)
    onSuccess()
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontWeight: 700 }}>存款記錄</h2>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>總存款金額</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>
            ${total.toLocaleString()}
          </div>
        </div>
      </div>
      {editingId && (
        <form onSubmit={handleUpdate} style={{ marginBottom: 16, padding: 12, background: '#f8f9fa', borderRadius: 8 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
            <div className="input-group" style={{ flex: 1, minWidth: 120 }}>
              <label>分類</label>
              <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="input-group" style={{ flex: 1, minWidth: 100 }}>
              <label>金額</label>
              <input type="number" step="0.01" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} required />
            </div>
            <div className="input-group" style={{ flex: 1, minWidth: 100 }}>
              <label>日期</label>
              <input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} required />
            </div>
            <div className="input-group" style={{ flex: 2, minWidth: 140 }}>
              <label>備註</label>
              <input value={editForm.note} onChange={e => setEditForm({ ...editForm, note: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button type="submit" className="btn btn-primary btn-sm">更新</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditingId(null)}>取消</button>
            </div>
          </div>
        </form>
      )}
      <div className="transaction-list">
        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>尚無存款記錄</div>
        ) : (
          [...transactions].reverse().map(t => (
            <div key={t.id} className="transaction-item">
              <div>
                <div style={{ fontWeight: 600 }}>{t.category}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.date} {t.note && `- ${t.note}`}</div>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ fontWeight: 700, fontSize: 18, color: t.amount >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
                  {t.amount >= 0 ? '+' : ''}${t.amount.toLocaleString()}
                </span>
                <button className="btn btn-outline btn-sm" onClick={() => handleEdit(t)}>編輯</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>刪除</button>
              </div>
            </div>
          ))
        )}
      </div>
      <style>{transactionStyles}</style>
    </div>
  )
}

const transactionStyles = `
  .transaction-list { max-height: 500px; overflow-y: auto; }
  .transaction-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 0; border-bottom: 1px solid var(--border);
  }
  .transaction-item:last-child { border-bottom: none; }
`
