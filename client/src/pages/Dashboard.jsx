import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import TransactionForm from '../components/TransactionForm';

const typeIcons = {
  income: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  expense: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  investment: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  savings: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
};

const typeColors = { income: 'income', expense: 'expense', investment: 'investment', savings: 'savings' };
const typeLabels = { income: '收入', expense: '支出', investment: '投資', savings: '存款' };

export default function Dashboard() {
  const { user } = useAuth();
  const [family, setFamily] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [summary, setSummary] = useState({ income: 0, expense: 0, investment: 0, savings: 0 });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [familyData, txData] = await Promise.all([
        api.getMyFamily(),
        api.getTransactions()
      ]);
      setFamily(familyData.family);
      setTransactions(txData.transactions || []);
      const s = { income: 0, expense: 0, investment: 0, savings: 0 };
      (txData.transactions || []).forEach(t => {
        s[t.type] = (s[t.type] || 0) + parseFloat(t.amount);
      });
      setSummary(s);
    } catch (err) {
      console.error('Load data error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async (data) => {
    if (!family) return;
    await api.createTransaction({ ...data, family_id: family.id });
    loadData();
  };

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10);

  return (
    <div>
      <div className="page-header">
        <h1>歡迎回來，{user?.name}</h1>
        <p>以下是您的財務總覽{family ? ` — ${family.name}` : ''}</p>
      </div>

      {!family && (
        <div className="alert" style={{ background: 'var(--color-primary-light)', color: '#1e40af', border: '1px solid #bfdbfe' }}>
          您尚未加入任何家庭，請先到 <a href="/family" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>家庭管理</a> 建立或加入家庭
        </div>
      )}

      <div className="stats-grid">
        {['income', 'expense', 'investment', 'savings'].map(type => (
          <div key={type} className="stat-card">
            <div className="stat-card-header">
              <div className={`stat-card-icon ${typeColors[type]}`}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={typeIcons[type]} />
                </svg>
              </div>
            </div>
            <div className="stat-card-label">{typeLabels[type]}總額</div>
            <div className="stat-card-value" style={{ color: type === 'expense' ? 'var(--color-danger)' : 'var(--color-text)' }}>
              NT$ {summary[type].toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>近期交易記錄</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)} disabled={!family}>
            新增交易
          </button>
        </div>
        <div className="card-body no-padding">
          {!family ? (
            <div className="empty-state">
              <h3>請先加入家庭</h3>
              <p>加入家庭後即可開始記錄交易</p>
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="empty-state">
              <h3>尚無交易記錄</h3>
              <p>點擊右上角按鈕新增您的第一筆交易</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>類型</th>
                    <th>類別</th>
                    <th>金額</th>
                    <th>備註</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map(t => (
                    <tr key={t.id}>
                      <td>{new Date(t.date).toLocaleDateString('zh-TW')}</td>
                      <td><span className={`badge badge-${t.type}`}>{typeLabels[t.type]}</span></td>
                      <td>{t.category || '-'}</td>
                      <td className={t.type === 'expense' ? 'text-negative' : 'text-positive'}>
                        {t.type === 'expense' ? '-' : '+'}NT$ {parseFloat(t.amount).toLocaleString()}
                      </td>
                      <td>{t.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showForm && family && (
        <TransactionForm
          familyId={family.id}
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
