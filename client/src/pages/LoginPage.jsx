import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Alert from '../components/ui/Alert'

export default function LoginPage({ onSwitch }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [users, setUsers] = useState([])
  const [resetId, setResetId] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await api.auth.login({ email, password })
      login(data.token, data.user)
    } catch (err) {
      setError(err.message || 'Email 或密碼錯誤')
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const data = await api.auth.getUsers()
      setUsers(data)
      setShowAdmin(true)
    } catch (err) {
      setError('無法加載用戶列表')
    }
  }

  const resetPassword = async () => {
    if (!resetId || !newPassword) {
      setError('請填寫用戶 ID 和新密碼')
      return
    }

    try {
      await api.auth.resetPassword(parseInt(resetId), newPassword)
      setError('')
      setResetId('')
      setNewPassword('')
      alert('密碼已重設')
      loadUsers()
    } catch (err) {
      setError('重設失敗: ' + err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>家庭財務管理系統</CardTitle>
          <p className="text-gray-600 text-sm mt-2">登入你的帳號</p>
        </CardHeader>

        <CardContent>
          {error && <Alert variant="error" className="mb-4">{error}</Alert>}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密碼</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading}
            >
              {loading ? '登入中...' : '登入'}
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600 mb-3">
              還沒有帳號？
              <button
                onClick={() => onSwitch('register')}
                className="text-blue-600 hover:underline ml-1"
              >
                立即註冊
              </button>
            </p>
          </div>

          <div className="text-center">
            <button
              onClick={loadUsers}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              管理員
            </button>
          </div>

          {showAdmin && (
            <div className="mt-4 pt-4 border-t space-y-3">
              <h3 className="font-bold text-sm">用戶管理</h3>
              <div className="max-h-40 overflow-y-auto text-xs">
                {users.map((user) => (
                  <div key={user.id} className="flex justify-between items-center py-1 px-2 bg-gray-50 rounded mb-1">
                    <span>{user.email}</span>
                    <button
                      onClick={() => setResetId(user.id)}
                      className="text-blue-600 hover:underline"
                    >
                      重設
                    </button>
                  </div>
                ))}
              </div>

              {resetId && (
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="新密碼"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="text-xs"
                  />
                  <Button
                    onClick={resetPassword}
                    variant="secondary"
                    size="sm"
                    className="w-full"
                  >
                    確認重設
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
