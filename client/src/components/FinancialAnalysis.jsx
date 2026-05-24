import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts'

const COLORS = ['#0d47a1', '#1565c0', '#1976d2', '#1e88e5', '#42a5f5', '#64b5f6',
  '#ff8f00', '#ffa000', '#ffb300', '#ffc107', '#ffd54f', '#ffe082']

const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']

export default function FinancialAnalysis({ transactions }) {
  const [analysisType, setAnalysisType] = useState('income')
  const [chartType, setChartType] = useState('line')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [year, setYear] = useState(new Date().getFullYear())

  const categories = useMemo(() => {
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

  const getTypeColor = (type) => {
    if (type === 'income') return 'var(--success)'
    if (type === 'expense') return 'var(--danger)'
    return 'var(--primary)'
  }

  const getTypeLabel = (type) => {
    if (type === 'income') return '收入'
    if (type === 'expense') return '支出'
    return '投資'
  }

  return (
    <div>
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

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <h2 style={{ fontWeight: 700 }}>財務分析圖表</h2>
          <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
            <select
              className="filter-select"
              value={analysisType}
              onChange={e => { setAnalysisType(e.target.value); setSelectedCategory('all') }}
            >
              <option value="income">收入分析</option>
              <option value="expense">支出分析</option>
              <option value="investment">投資分析</option>
            </select>
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
          </div>
        </div>

        <div style={{ marginBottom: 16, fontSize: 14, color: 'var(--text-secondary)' }}>
          當前分析：{getTypeLabel(analysisType)}
          {selectedCategory !== 'all' && ` > ${selectedCategory}`}
          {' | '}{year}年
          {' | '}圖表類型：{chartType === 'line' ? '直線圖' : chartType === 'bar' ? '長條圖' : '圓餅圖'}
        </div>

        {renderChart()}

        {chartType === 'line' && lineChartData.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
            💡 直線圖顯示每個月各分類的變化趨勢，可切換「全部分類」或選擇特定分類查看
          </div>
        )}
      </div>

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
