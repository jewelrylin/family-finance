import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import TransactionForm from './TransactionForm';

const typeLabels = {
  income: '收入',
  expense: '支出',
  investment: '投資',
  savings: '存款'
};

export default function TransactionPage({ type, icon, description }) {
  const [families, setFamilies] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [total, setTotal] = useState(0);
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

  const loadTransactions = useCallback(async () => {
    if (!selectedFamily) return;
    setLoading(true);
    try {
      const data = await api.getTransactions({ family_id: selectedFamily, type });
      setTransactions(data.transactions || []);
      const t = (data.transactions || []).reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
      setTotal(t);
    } catch (err) {
      console.error('Load transactions error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedFamily, type]);

  useEffect(() => { loadFamilies(); }, [loadFamilies]);
  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  const handleCreate = async (data) => {
    await api.createTransaction(data);
    loadTransactions();
  };

  const handleUpdate = async (data) => {
    await api.updateTransaction(editData.id, data);
    setEditData(null);
    loadTransactions();
  };

  const handleDelete = async (id) => {
    if (!confirm('確定要刪除此記錄嗎？')) return;
    await api.deleteTransaction(id);
    loadTransactions();
  };

  const handleEdit = (tx) => {
    setEditData(tx);
    setShowForm(true);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div className="page-header">
        <h1>{typeLabels[type]}管理</h1>
        <p>{description}</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div className="family-selector" style={{ marginBottom: 0 }}>
          <span style={{ fontSize: 14, color: 'var(--color-text-secondary)', fontWeight: 500 }}>目前家庭：</span>
          <select value={selectedFamily} onChange={e => setSelectedFamily(e.target.value)}>
            {families.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>總計</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: type === 'expense' ? 'var(--color-danger)' : 'var(--color-success)' }}>
              NT$ {total.toLocaleString()}
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditData(null); setShowForm(true); }}>
            新增{typeLabels[type]}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body no-padding">
          {loading ? (
            <div className="empty-state"><p>載入中...</p></div>
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
                    <th>類別</th>
                    <th>金額</th>
                    <th>備註</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t.id}>
                      <td>{new Date(t.date).toLocaleDateString('zh-TW')}</td>
                      <td><span className={`badge badge-${t.type}`}>{t.category || '未分類'}</span></td>
                      <td style={{ fontWeight: 600 }}>NT$ {parseFloat(t.amount).toLocaleString()}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{t.description || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(t)}>編輯</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>刪除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <TransactionForm
          familyId={selectedFamily}
          onSubmit={editData ? handleUpdate : handleCreate}
          onClose={() => { setShowForm(false); setEditData(null); }}
          initialData={editData}
        />
      )}
    </div>
  );
}
