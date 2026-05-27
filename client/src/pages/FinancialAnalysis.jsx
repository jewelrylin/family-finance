import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = {
  income: '#10b981',
  expense: '#ef4444',
  investment: '#3b82f6',
  savings: '#8b5cf6'
};

const typeLabels = {
  income: '收入',
  expense: '支出',
  investment: '投資',
  savings: '存款'
};

export default function FinancialAnalysis() {
  const [families, setFamilies] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadFamilies = useCallback(async () => {
    try {
      const data = await api.getFamilies();
      setFamilies(data.families);
      if (data.families.length > 0 && !selectedFamily) {
        setSelectedFamily(data.families[0].id);
      }
    } catch (err) {
      console.error('Load families error:', err);
    }
  }, [selectedFamily]);

  const loadAnalysis = useCallback(async () => {
    if (!selectedFamily) return;
    setLoading(true);
    try {
      const data = await api.getAnalysis(selectedFamily);
      setAnalysis(data);
    } catch (err) {
      console.error('Load analysis error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedFamily]);

  useEffect(() => { loadFamilies(); }, [loadFamilies]);
  useEffect(() => { loadAnalysis(); }, [loadAnalysis]);

  if (!analysis) {
    return (
      <div>
        <div className="page-header">
          <h1>財務分析</h1>
          <p>查看家庭財務匯總與分析圖表</p>
        </div>
        <div className="family-selector">
          <span style={{ fontSize: 14, color: 'var(--color-text-secondary)', fontWeight: 500 }}>目前家庭：</span>
          <select value={selectedFamily} onChange={e => setSelectedFamily(e.target.value)}>
            {families.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div className="empty-state">
          <p>{loading ? '載入中...' : '尚無分析數據'}</p>
        </div>
      </div>
    );
  }

  const familyPieData = [
    { name: '收入', value: analysis.familySummary.income, color: COLORS.income },
    { name: '支出', value: analysis.familySummary.expense, color: COLORS.expense },
    { name: '投資', value: analysis.familySummary.investment, color: COLORS.investment },
    { name: '存款', value: analysis.familySummary.savings, color: COLORS.savings }
  ].filter(d => d.value > 0);

  const memberBarData = analysis.members.map(m => ({
    name: m.name,
    收入: m.income,
    支出: m.expense,
    投資: m.investment,
    存款: m.savings
  }));

  const formatCurrency = (v) => `NT$ ${v.toLocaleString()}`;

  return (
    <div>
      <div className="page-header">
        <h1>財務分析</h1>
        <p>家庭財務匯總與分析圖表（個別成員細項不可見，僅顯示總計）</p>
      </div>

      <div className="family-selector">
        <span style={{ fontSize: 14, color: 'var(--color-text-secondary)', fontWeight: 500 }}>目前家庭：</span>
        <select value={selectedFamily} onChange={e => setSelectedFamily(e.target.value)}>
          {families.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label">家庭總收入</div>
          <div className="stat-card-value text-positive">
            NT$ {analysis.familySummary.income.toLocaleString()}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">家庭總支出</div>
          <div className="stat-card-value text-negative">
            NT$ {analysis.familySummary.expense.toLocaleString()}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">家庭總投資</div>
          <div className="stat-card-value" style={{ color: COLORS.investment }}>
            NT$ {analysis.familySummary.investment.toLocaleString()}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">家庭總結餘</div>
          <div className="stat-card-value" style={{ color: analysis.familySummary.total >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            NT$ {analysis.familySummary.total.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3>家庭收支結構</h3>
          </div>
          <div className="card-body">
            {familyPieData.length > 0 ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={familyPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {familyPieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={formatCurrency} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty-state"><p>尚無數據</p></div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>成員貢獻比較</h3>
          </div>
          <div className="card-body">
            {memberBarData.length > 0 ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={memberBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={formatCurrency} />
                    <Legend />
                    <Bar dataKey="收入" fill={COLORS.income} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="支出" fill={COLORS.expense} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="投資" fill={COLORS.investment} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="存款" fill={COLORS.savings} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty-state"><p>尚無數據</p></div>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <h3>成員貢獻明細（僅顯示總額）</h3>
        </div>
        <div className="card-body no-padding">
          {analysis.members.length === 0 ? (
            <div className="empty-state"><p>尚無成員數據</p></div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>成員</th>
                    <th>收入</th>
                    <th>支出</th>
                    <th>投資</th>
                    <th>存款</th>
                    <th>淨值</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.members.map(m => (
                    <tr key={m.user_id}>
                      <td style={{ fontWeight: 600 }}>{m.name}</td>
                      <td className="text-positive">NT$ {m.income.toLocaleString()}</td>
                      <td className="text-negative">NT$ {m.expense.toLocaleString()}</td>
                      <td>NT$ {m.investment.toLocaleString()}</td>
                      <td>NT$ {m.savings.toLocaleString()}</td>
                      <td style={{ fontWeight: 600 }} className={m.total >= 0 ? 'text-positive' : 'text-negative'}>
                        NT$ {m.total.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <h3>我的財務摘要</h3>
        </div>
        <div className="card-body">
          <div className="stats-grid" style={{ marginBottom: 0 }}>
            <div className="stat-card">
              <div className="stat-card-label">我的收入</div>
              <div className="stat-card-value text-positive">
                NT$ {analysis.mySummary.income.toLocaleString()}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">我的支出</div>
              <div className="stat-card-value text-negative">
                NT$ {analysis.mySummary.expense.toLocaleString()}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">我的投資</div>
              <div className="stat-card-value" style={{ color: COLORS.investment }}>
                NT$ {analysis.mySummary.investment.toLocaleString()}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">我的存款</div>
              <div className="stat-card-value" style={{ color: COLORS.savings }}>
                NT$ {analysis.mySummary.savings.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
