import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import { useState } from 'react'

export default function App() {
  const { user, loading } = useAuth()
  const [authPage, setAuthPage] = useState('login')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return authPage === 'register' ? (
      <RegisterPage onSwitch={() => setAuthPage('login')} />
    ) : (
      <LoginPage onSwitch={() => setAuthPage('register')} />
    )
  }

  return <DashboardPage />
}
