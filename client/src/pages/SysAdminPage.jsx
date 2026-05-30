import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function SysAdminPage() {
  const [authed, setAuthed] = useState(api.sysadminHasToken());
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [data, setData] = useState({ total: 0, users: [] });
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const flash = (kind, msg) => {
    if (kind === 'error') setError(msg);
    else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.sysadminListUsers();
      setData(d);
    } catch (err) {
      // token 失效則回登入畫面
      api.sysadminLogout();
      setAuthed(false);
      flash('error', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) loadUsers();
  }, [authed, loadUsers]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.sysadminLogin(secret);
      setSecret('');
      setAuthed(true);
    } catch (err) {
      flash('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.sysadminLogout();
    setAuthed(false);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!resetTarget) return;
    setLoading(true);
    try {
      await api.sysadminResetPassword(resetTarget.id, newPassword);
      flash('success', `${resetTarget.email} 的密碼已重設`);
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      flash('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (u) => {
    if (!confirm(`確定刪除「${u.name || u.email}」嗎？\n此操作會連同其所有交易紀錄一併刪除。`)) return;
    setLoading(true);
    try {
      await api.sysadminDeleteUser(u.id);
      flash('success', '使用者已刪除');
      loadUsers();
    } catch (err) {
      flash('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!authed) {
    return (
      <div className="auth-layout">
        <div className="auth-card">
          <div className="auth-logo">
            <h1>系統管理</h1>
            <p>請輸入管理員密碼</p>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleAuth}>
            <div className="form-group">
              <label className="form-label">管理員密碼</label>
              <input
                type="password"
                className="form-input"
                value={secret}
                onChange={e => setSecret(e.target.value)}
                required
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? '驗證中...' : '進入'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13 }}>
            <Link to="/login" style={{ color: 'var(--color-text-muted)' }}>← 回登入頁</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: 32 }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0 }}>系統管理</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)' }}>
              共 <strong>{data.total}</strong> 位註冊使用者
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/login" className="btn btn-secondary">回登入頁</Link>
            <button className="btn btn-secondary" onClick={handleLogout}>登出管理員</button>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="card">
          <div className="card-body no-padding">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>姓名 / 信箱</th>
                    <th>家庭</th>
                    <th>角色</th>
                    <th>註冊時間</th>
                    <th style={{ textAlign: 'right' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>{u.id}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{u.name || '-'}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{u.email}</div>
                      </td>
                      <td>{u.family_name || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</td>
                      <td>
                        <span className={`badge badge-${u.role === 'admin' ? 'admin' : 'member'}`}>
                          {u.role === 'admin' ? '管理員' : '成員'}
                        </span>
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('zh-TW') : '-'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => setResetTarget(u)}>
                            重設密碼
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u)}>
                            刪除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data.users.length === 0 && !loading && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                      沒有使用者
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {resetTarget && (
          <div className="modal-overlay" onClick={() => setResetTarget(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>重設密碼：{resetTarget.email}</h3>
                <button className="modal-close" onClick={() => setResetTarget(null)}>&times;</button>
              </div>
              <form onSubmit={handleReset}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">新密碼</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      minLength={6}
                      required
                      autoFocus
                    />
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                      至少 6 字，告訴使用者後請他自行更改
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setResetTarget(null)}>取消</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? '重設中...' : '重設'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
