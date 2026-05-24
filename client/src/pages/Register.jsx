import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Register({ onSwitch }) {
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('兩次輸入的密碼不一致')
      return
    }
    if (password.length < 4) {
      setError('密碼至少需要4個字元')
      return
    }

    setLoading(true)
    try {
      await register(email, password, displayName || undefined, inviteCode || undefined)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">📝</div>
          <h1>註冊新帳號</h1>
          <p>使用 Email 註冊，加入家庭財務管理</p>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>顯示名稱（選填，預設使用 Email 前綴）</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </div>
          <div className="input-group">
            <label>密碼 *</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>確認密碼 *</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>家庭邀請碼（選填，留空則尚未加入家庭）</label>
            <input value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? '註冊中...' : '註冊'}
          </button>
        </form>
        <div className="login-footer">
          已經有帳號？<button className="link-btn" onClick={onSwitch}>返回登入</button>
        </div>
      </div>
      <style>{registerStyles}</style>
    </div>
  )
}

const registerStyles = `
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
  }
  .link-btn:hover { text-decoration: underline; }
`
