import { useState, useEffect } from 'react'

export default function FamilyInvestmentSummary() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('/api/transactions/investment-summary', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
    }).then(r => r.json()).then(setData).catch(() => {})
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

      <div className="grid-4">
        <div className="card text-center">
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>總投入本金</div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>
            ${data.totalCost.toLocaleString()}
          </div>
        </div>

        <div className="card text-center">
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>目前市值</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--primary)' }}>
            ${data.totalMV.toLocaleString()}
          </div>
        </div>

        <div className="card text-center">
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>總損益（含股利）</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: data.totalReturn >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {data.totalReturn >= 0 ? '+' : ''}${data.totalReturn.toLocaleString()}
          </div>
          {data.totalDividends > 0 && (
            <div style={{ fontSize: 13, color: 'var(--warning)', marginTop: 4 }}>
              含股利 ${data.totalDividends.toLocaleString()}
            </div>
          )}
        </div>

        <div className="card text-center">
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>整體報酬率</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: data.roi >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {data.roi >= 0 ? '+' : ''}{data.roi}%
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {data.roi >= 0 ? '📈 正報酬' : '📉 負報酬'}
          </div>
        </div>
      </div>
    </div>
  )
}
