import { useState, useMemo, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts'

const COLORS = ['#0d47a1', '#c62828', '#2e7d32', '#ff8f00', '#6a1b9a', '#00838f',
  '#d81b60', '#558b2f', '#1565c0', '#e65100', '#283593', '#4e342e']

const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']

export default function FinancialAnalysis({ transactions }) {
  const [analysisType, setAnalysisType] = useState('income')
  const [chartType, setChartType] = useState('line')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [year, setYear] = useState(new Date().getFullYear())
  const [portfolioData, setPortfolioData] = useState(null)

  useEffect(() => {
    if (analysisType === 'asset') {
      fetch('/api/transactions/portfolio', {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
      }).then(r => r.json()).then(setPortfolioData).catch(() => {})
    }
  }, [analysisType])

  const categories = useMemo(() => {
    if (analysisType === 'asset') return []
    const filtered = transactions.filter(t => t.type === analysisType)
    return [...new Set(filtered.map(t => t.category))]
  }, [transactions, analysisType])

  const lineChartData = useMemo(() => {
    const filtered = transactions.filter(t => {
      const d = new Date(t.date)
      if (d.getFullYear() !== year) return false
      if (analysisType && t.type !== analysisType) return false
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false
      return true
    })

    const monthlyMap = {}
    for (let m = 0; m < 12; m++) {
      monthlyMap[m] = { month: MONTHS[m] }
    }

    if (selectedCategory !== 'all') {
      for (let m = 0; m < 12; m++) {
        monthlyMap[m][selectedCategory] = 0
      }
      filtered.forEach(t => {
        const d = new Date(t.date)
        monthlyMap[d.getMonth()][selectedCategory] += t.amount
      })
    } else {
      categories.forEach(cat => {
        for (let m = 0; m < 12; m++) monthlyMap[m][cat] = 0
      })
      filtered.forEach(t => {
        const d = new Date(t.date)
        if (monthlyMap[d.getMonth()][t.category] !== undefined) {
          monthlyMap[d.getMonth()][t.category] += t.amount
        }
      })
    }

    return Object.values(monthlyMap)
  }, [transactions, year, analysisType, selectedCategory, categories])

  const categoryTotal = useMemo(() => {
    const filtered = transactions.filter(t => t.type === analysisType)
    const map = {}
    filtered.forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount
    })
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [transactions, analysisType])

  const summary = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const invest = transactions.filter(t => t.type === 'investment').reduce((s, t) => s + t.amount, 0)
    return { income, expense, investment: invest, balance: income - expense }
  }, [transactions])

  const assetSummary = useMemo(() => {
    const deposits = transactions.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0)
    const investMV = portfolioData?.summary?.totalMV || 0
    const totalAssets = deposits + investMV
    return { deposits, investMV, totalAssets }
  }, [transactions, portfolioData])

  const bankTotals = useMemo(() => {
    const map = {}
    for (const t of transactions.filter(t => t.type === 'deposit')) {
      const bank = t.bank || '未指定'
      map[bank] = (map[bank] || 0) + t.amount
    }
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [transactions])

  const assetAllocation = useMemo(() => {
    const items = []
    for (const b of bankTotals) {
      items.push({ name: `🏦 ${b.name}`, value: b.value, type: 'deposit' })
    }
    if (portfolioData?.portfolio) {
      for (const p of portfolioData.portfolio) {
        if (p.marketValue > 0) {
          items.push({ name: `💹 ${p.name}`, value: p.marketValue, type: 'investment' })
        }
      }
    }
    return items.sort((a, b) => b.value - a.value)
  }, [bankTotals, portfolioData])

  const years = useMemo(() => {
    const y = [...new Set(transactions.map(t => new Date(t.date).getFullYear()))]
    return y.length > 0 ? y.sort() : [new Date().getFullYear()]
  }, [transactions])

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'white', padding: '12px 16px', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>{label}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color, fontSize: 14 }}>
              {p.name}: ${p.value.toLocaleString()}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const renderChart = () => {
    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={lineChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fill: '#6b7280' }} />
            <YAxis tick={{ fill: '#6b7280' }} tickFormatter={v => `$${v.toLocaleString()}`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {(selectedCategory !== 'all' ? [selectedCategory] : categories).map((cat, i) => (
              <Line
                key={cat}
                type="monotone"
                dataKey={cat}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4, fill: COLORS[i % COLORS.length] }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )
    }

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={lineChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fill: '#6b7280' }} />
            <YAxis tick={{ fill: '#6b7280' }} tickFormatter={v => `$${v.toLocaleString()}`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {(selectedCategory !== 'all' ? [selectedCategory] : categories).map((cat, i) => (
              <Bar key={cat} dataKey={cat} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={categoryTotal}
            cx="50%"
            cy="50%"
            labelLine
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={140}
            dataKey="value"
          >
            {categoryTotal.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  const renderAssetChart = () => {
    if (assetAllocation.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
          暫無資產資料
        </div>
      )
    }
    return (
      <div>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={assetAllocation}
              cx="50%"
              cy="50%"
              labelLine
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
              outerRadius={140}
              dataKey="value"
            >
              {assetAllocation.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap', marginTop: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>🏦 銀行存款</span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>💹 投資</span>
        </div>
      </div>
    )
  }

  const getTypeColor = (type) => {
    if (type === 'income') return 'var(--success)'
    if (type === 'expense') return 'var(--danger)'
    if (type === 'asset') return 'var(--primary)'
    return 'var(--primary)'
  }

  const getTypeLabel = (type) => {
    if (type === 'income') return '收入'
    if (type === 'expense') return '支出'
    if (type === 'asset') return '總資產'
    return '投資'
  }

  return (
    <div>
      {analysisType === 'asset' ? (
        <div className="grid-3 mb-3">
          <div className="card" style={{ background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>銀行存款</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)' }}>
              ${assetSummary.deposits.toLocaleString()}
            </div>
          </div>
          <div className="card" style={{ background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>投資市值</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--success)' }}>
              ${assetSummary.investMV.toLocaleString()}
            </div>
          </div>
          <div className="card" style={{ background: 'linear-gradient(135deg, #fce4ec, #f8bbd0)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>總資產</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--danger)' }}>
              ${assetSummary.totalAssets.toLocaleString()}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid-3 mb-3">
          <div className="card">
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>總收入</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--success)' }}>
              ${summary.income.toLocaleString()}
            </div>
          </div>
          <div className="card">
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>總支出</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--danger)' }}>
              ${summary.expense.toLocaleString()}
            </div>
          </div>
          <div className="card">
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>收支結餘</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: summary.balance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              ${summary.balance.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <h2 style={{ fontWeight: 700 }}>財務分析圖表</h2>
          <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
            <select
              className="filter-select"
              value={analysisType}
              onChange={e => { setAnalysisType(e.target.value); setSelectedCategory('all'); setChartType('line') }}
            >
              <option value="income">收入分析</option>
              <option value="expense">支出分析</option>
              <option value="investment">投資分析</option>
              <option value="asset">總資產分析</option>
            </select>
            {analysisType !== 'asset' && (
              <>
                <select className="filter-select" value={year} onChange={e => setYear(Number(e.target.value))}>
                  {years.map(y => <option key={y} value={y}>{y}年</option>)}
                </select>
                <select className="filter-select" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                  <option value="all">全部分類</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="filter-select" value={chartType} onChange={e => setChartType(e.target.value)}>
                  <option value="line">直線圖</option>
                  <option value="bar">長條圖</option>
                  <option value="pie">圓餅圖</option>
                </select>
              </>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 16, fontSize: 14, color: 'var(--text-secondary)' }}>
          當前分析：{getTypeLabel(analysisType)}
          {analysisType !== 'asset' && selectedCategory !== 'all' && ` > ${selectedCategory}`}
          {analysisType !== 'asset' && ` | ${year}年`}
          {analysisType !== 'asset' && ` | 圖表類型：${chartType === 'line' ? '直線圖' : chartType === 'bar' ? '長條圖' : '圓餅圖'}`}
          {analysisType === 'asset' && ' | 資產配置佔比'}
        </div>

        {analysisType === 'asset' ? renderAssetChart() : renderChart()}
      </div>

      {analysisType === 'asset' ? (
        <>
          <div className="card mt-3">
            <h2 style={{ fontWeight: 700, marginBottom: 16 }}>銀行存款（依銀行）</h2>
            <div className="category-breakdown">
              {bankTotals.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 20 }}>暫無存款資料</div>
              ) : (
                bankTotals.map((item, i) => {
                  const maxVal = bankTotals[0]?.value || 1
                  const pct = (item.value / maxVal) * 100
                  return (
                    <div key={item.name} className="category-row">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>🏦 {item.name}</span>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>${item.value.toLocaleString()}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}, ${COLORS[(i + 2) % COLORS.length]})` }} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
          <div className="card mt-3">
            <h2 style={{ fontWeight: 700, marginBottom: 16 }}>投資組合（依標的）</h2>
            <div className="category-breakdown">
              {!portfolioData || portfolioData.portfolio.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 20 }}>暫無投資資料</div>
              ) : (
                portfolioData.portfolio.map((item, i) => {
                  const maxVal = portfolioData.portfolio[0]?.marketValue || 1
                  const pct = (item.marketValue / maxVal) * 100
                  return (
                    <div key={item.name} className="category-row">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>💹 {item.name}</span>
                        <span style={{ fontWeight: 700, color: item.totalPL >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                          ${item.marketValue.toLocaleString()}
                          <span style={{ fontSize: 13, fontWeight: 400, marginLeft: 8 }}>
                            ({item.totalPL >= 0 ? '+' : ''}${item.totalPL.toLocaleString()}, {item.roi >= 0 ? '+' : ''}{item.roi}%)
                          </span>
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}, ${COLORS[(i + 2) % COLORS.length]})` }} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="card mt-3">
          <h2 style={{ fontWeight: 700, marginBottom: 16 }}>
            {getTypeLabel(analysisType)}分類統計
          </h2>
          <div className="category-breakdown">
            {categoryTotal.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 20 }}>
                暫無{getTypeLabel(analysisType)}資料
              </div>
            ) : (
              categoryTotal.map((item, i) => {
                const maxVal = categoryTotal[0]?.value || 1
                const pct = (item.value / maxVal) * 100
                return (
                  <div key={item.name} className="category-row">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{item.name}</span>
                      <span style={{ fontWeight: 700, color: getTypeColor(analysisType) }}>
                        ${item.value.toLocaleString()}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}, ${COLORS[(i + 2) % COLORS.length]})`
                        }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      <style>{analysisStyles}</style>
    </div>
  )
}

const analysisStyles = `
  .filter-select {
    padding: 8px 12px;
    border: 2px solid var(--border);
    border-radius: 8px;
    font-size: 14px;
    background: white;
    cursor: pointer;
  }
  .filter-select:focus {
    outline: none;
    border-color: var(--primary-light);
  }
  .category-breakdown {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .category-row {
    padding: 4px 0;
  }
  .progress-bar {
    width: 100%;
    height: 8px;
    background: var(--bg);
    border-radius: 4px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }
`
