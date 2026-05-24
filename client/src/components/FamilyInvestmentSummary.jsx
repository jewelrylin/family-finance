import { useState, useEffect } from 'react'
import { api } from '../api'

export default function FamilyInvestmentSummary() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api.transactions.list({ type: 'investment' }).then(all => {
      const total = all.reduce((s, t) => s + t.amount, 0)
      const returns = all.filter(t => t.category === '投資收益').reduce((s, t) => s + t.amount, 0)
      const invested = all.filter(t => t.category !== '投資收益').reduce((s, t) => s + t.amount, 0)
      const roi = invested > 0 ? ((returns - invested) / invested * 100) : 0
      setData({ total, returns, invested, roi, count: all.length })
    }).catch(() => {})
  }, [])

  if (!data) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>載入中...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="card mb-3" style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🏦</div>
        <h2 style={{ fontWeight: 800, marginBottom: 4 }}>家庭總投資概覽</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          所有家庭成員投資資料彙總（共 {data.count} 筆記錄）
        </p>
      </div>

      <div className="grid-3">
        <div className="card text-center">
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>總投資金額</div>
          <div style={{ fontSize: 36, fontWeight: 800 }}>
            ${data.total.toLocaleString()}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            本金：${data.invested.toLocaleString()}
          </div>
        </div>

        <div className="card text-center">
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>投資收益</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: data.returns >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            ${data.returns.toLocaleString()}
          </div>
        </div>

        <div className="card text-center">
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>整體報酬率</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: data.roi >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {data.roi.toFixed(1)}%
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {data.roi >= 0 ? '📈 正報酬' : '📉 負報酬'}
          </div>
        </div>
      </div>
    </div>
  )
}
