import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import TransactionForm from './TransactionForm';

const typeLabels = { income: '收入', expense: '支出', investment: '投資', savings: '存款' };

export default function TransactionPage({ type, description }) {
  const [family, setFamily] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [familyData, txData] = await Promise.all([
        api.getMyFamily(),
        api.getTransactions({ type })
      ]);
      setFamily(familyData.family);
      setTransactions(txData.transactions || []);
      const t = (txData.transactions || []).reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
      setTotal(t);
    } catch (err) {
      console.error('Load data error:', err);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async (data) => {
    if (!family) return;
    await api.createTransaction({ ...data, family_id: family.id, type });
    loadData();
  };

  const handleUpdate = async (data) => {
    await api.updateTransaction(editData.id, data);
    setEditData(null);
    loadData();
  };

  const handleDelete = async (id) => {
    if (!confirm('確定要刪除此記錄嗎？')) return;
    await api.deleteTransaction(id);
    loadData();
  };

  return (
    <div>
      <div className="page-header">
        <h1>{typeLabels[type]}管理</h1>
        <p>{description}{family ? ` — ${family.name}` : ''}</p>
      </div>

      {!family && (
        <div className="alert" style={{ background: 'var(--color-primary-light)', color: '#1e40af', border: '1px solid #bfdbfe' }}>
          您尚未加入任何家庭，請先到 <a href="/family" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>家庭管理</a> 建立或加入家庭
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>總計</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: type === 'expense' ? 'var(--color-danger)' : 'var(--color-success)' }}>
            NT$ {total.toLocaleString()}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditData(null); setShowForm(true); }} disabled={!family}>
          新增{typeLabels[type]}
        </button>
      </div>

      <div className="card">
        <div className="card-body no-padding">
          {!family ? (
            <div className="empty-state"><h3>請先加入家庭</h3><p>加入家庭後即可開始記錄</p></div>
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
                          <button className="btn btn-secondary btn-sm" onClick={() => { setEditData(t); setShowForm(true); }}>編輯</button>
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

      {showForm && family && (
        <TransactionForm
          familyId={family.id}
          onSubmit={editData ? handleUpdate : handleCreate}
          onClose={() => { setShowForm(false); setEditData(null); }}
          initialData={editData}
        />
      )}
    </div>
  );
}
