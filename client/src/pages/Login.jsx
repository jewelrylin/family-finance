import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

export default function Login({ onSwitch }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [showAdmin, setShowAdmin] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [users, setUsers] = useState([])
  const [adminAuthed, setAdminAuthed] = useState(false)
  const [resetPasswords, setResetPasswords] = useState({})
  const [adminMsg, setAdminMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAdminLogin = async (e) => {
    e.preventDefault()
    try {
      const data = await api.auth.login({ email: adminEmail, password: adminPassword })
      if (data.user.role !== 'admin') {
        setError('此帳號非管理員')
        return
      }
      localStorage.setItem('token', data.token)
      const allUsers = await api.auth.getUsers()
      setUsers(allUsers)
      setAdminAuthed(true)
      setAdminMsg('')
    } catch (err) {
      setAdminMsg(err.message)
    }
  }

  const handleResetPassword = async (userId) => {
    const newPw = resetPasswords[userId]
    if (!newPw || newPw.length < 4) return
    try {
      await api.auth.resetPassword(userId, newPw)
      setAdminMsg(`使用者 #${userId} 密碼已重設成功`)
      setResetPasswords(prev => ({ ...prev, [userId]: '' }))
      localStorage.removeItem('token')
      setAdminAuthed(false)
      setShowAdmin(false)
      setAdminEmail('')
      setAdminPassword('')
    } catch (err) {
      setAdminMsg(err.message)
    }
  }

  if (showAdmin) {
    if (!adminAuthed) {
      return (
        <div className="login-page">
          <div className="login-card">
            <div className="login-header">
              <div className="login-icon">🔐</div>
              <h1>管理員登入</h1>
              <p>請使用管理員帳號進行密碼重設</p>
            </div>
            {adminMsg && <div className="error-msg">{adminMsg}</div>}
            <form onSubmit={handleAdminLogin}>
              <div className="input-group">
                <label>管理員 Email</label>
                <input value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@familyfinance.com" />
              </div>
              <div className="input-group">
                <label>管理員密碼</label>
                <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="••••••" />
              </div>
              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                登入管理
              </button>
            </form>
            <div className="login-footer">
              <button className="btn btn-outline btn-sm" onClick={() => { setShowAdmin(false); setAdminMsg('') }}>
                返回使用者登入
              </button>
            </div>
          </div>
          <style>{loginStyles}</style>
        </div>
      )
    }

    return (
      <div className="login-page">
        <div className="login-card" style={{ maxWidth: 700 }}>
          <div className="login-header">
            <div className="login-icon">🛡️</div>
            <h1>管理員控制台</h1>
            <p>點擊「重設密碼」為使用者設定新密碼</p>
          </div>
          {adminMsg && (adminMsg.includes('成功') ? <div className="success-msg">{adminMsg}</div> : <div className="error-msg">{adminMsg}</div>)}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '10px 8px' }}>ID</th>
                <th style={{ padding: '10px 8px' }}>Email</th>
                <th style={{ padding: '10px 8px' }}>顯示名稱</th>
                <th style={{ padding: '10px 8px' }}>角色</th>
                <th style={{ padding: '10px 8px' }}>新密碼</th>
                <th style={{ padding: '10px 8px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 8px' }}>{u.id}</td>
                  <td style={{ padding: '10px 8px', fontWeight: 600 }}>{u.email}</td>
                  <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>{u.display_name || '-'}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <span className={`badge ${u.role === 'admin' ? 'badge-investment' : 'badge-income'}`}>{u.role}</span>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <input
                      type="text"
                      value={resetPasswords[u.id] || ''}
                      onChange={e => setResetPasswords(prev => ({ ...prev, [u.id]: e.target.value }))}
                      placeholder="輸入新密碼"
                      style={{ width: 120, padding: '6px 10px', border: '2px solid var(--border)', borderRadius: 6, fontSize: 14 }}
                    />
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleResetPassword(u.id)}
                      disabled={!resetPasswords[u.id] || resetPasswords[u.id].length < 4}
                    >
                      重設
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="login-footer">
            <button className="btn btn-outline btn-sm" onClick={() => { setShowAdmin(false); setAdminAuthed(false); localStorage.removeItem('token'); setAdminMsg('') }}>
              登出管理
            </button>
          </div>
        </div>
        <style>{loginStyles}</style>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">💰</div>
          <h1>家庭財務管理</h1>
          <p>使用 Email 登入您的帳號</p>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" required />
          </div>
          <div className="input-group">
            <label>密碼</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? '登入中...' : '登入'}
          </button>
        </form>
        <div className="login-footer">
          <span>還沒有帳號？<button className="link-btn" onClick={onSwitch}>立即註冊</button></span>
          <button className="link-btn" onClick={() => setShowAdmin(true)}>管理員入口</button>
        </div>
      </div>
      <style>{loginStyles}</style>
    </div>
  )
}

const loginStyles = `
  .login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #002171 0%, #0d47a1 50%, #1565c0 100%);
    padding: 20px;
  }
  .login-card {
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    padding: 40px;
    width: 100%;
    max-width: 440px;
  }
  .login-header {
    text-align: center;
    margin-bottom: 28px;
  }
  .login-icon {
    font-size: 48px;
    margin-bottom: 12px;
  }
  .login-header h1 {
    font-size: 24px;
    font-weight: 800;
    color: var(--primary-dark);
    margin-bottom: 4px;
  }
  .login-header p {
    color: var(--text-secondary);
    font-size: 15px;
  }
  .login-footer {
    text-align: center;
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 14px;
    color: var(--text-secondary);
  }
  .link-btn {
    background: none;
    border: none;
    color: var(--primary-light);
    font-weight: 600;
    cursor: pointer;
    font-size: 14px;
    padding: 0;
    text-decoration: none;
  }
  .link-btn:hover { text-decoration: underline; }
`
