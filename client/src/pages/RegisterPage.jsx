import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Alert from '../components/ui/Alert'

export default function RegisterPage({ onSwitch }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('密碼不一致')
      return
    }

    if (password.length < 6) {
      setError('密碼至少 6 個字符')
      return
    }

    setLoading(true)

    try {
      const data = await api.auth.register({
        email,
        password,
        displayName: displayName || email.split('@')[0],
        inviteCode: inviteCode || undefined
      })
      login(data.token, data.user)
    } catch (err) {
      setError(err.message || '註冊失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>註冊帳號</CardTitle>
          <p className="text-gray-600 text-sm mt-2">加入家庭財務管理系統</p>
        </CardHeader>

        <CardContent>
          {error && <Alert variant="error" className="mb-4">{error}</Alert>}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">顯示名稱</label>
              <Input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="你的名字"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密碼</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 個字符"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">確認密碼</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次輸入密碼"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邀請碼（可選）</label>
              <Input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="ABCD1234"
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading}
            >
              {loading ? '註冊中...' : '註冊'}
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t text-center">
            <p className="text-sm text-gray-600">
              已有帳號？
              <button
                onClick={() => onSwitch('login')}
                className="text-blue-600 hover:underline ml-1"
              >
                登入
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
