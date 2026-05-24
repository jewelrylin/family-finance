import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import { useState } from 'react'

export default function App() {
  const { user, loading } = useAuth()
  const [page, setPage] = useState('login')

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ fontSize: 18, color: '#6b7280' }}>載入中...</div>
      </div>
    )
  }

  if (!user) {
    return page === 'register' ? (
      <Register onSwitch={() => setPage('login')} />
    ) : (
      <Login onSwitch={() => setPage('register')} />
    )
  }

  return <Dashboard />
}
