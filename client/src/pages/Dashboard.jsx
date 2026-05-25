import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import FamilyManager from '../components/FamilyManager'
import VoiceInput from '../components/VoiceInput'
import IncomeForm from '../components/IncomeForm'
import ExpenseForm from '../components/ExpenseForm'
import InvestmentForm from '../components/InvestmentForm'
import FamilyInvestmentSummary from '../components/FamilyInvestmentSummary'
import FinancialAnalysis from '../components/FinancialAnalysis'
import DepositForm from '../components/DepositForm'

const TABS = [
  { key: 'income', label: '收入', icon: '📈' },
  { key: 'expense', label: '支出', icon: '📉' },
  { key: 'deposit', label: '銀行存款', icon: '🏦' },
  { key: 'investment', label: '個人投資', icon: '💹' },
  { key: 'family-investment', label: '家庭總投資', icon: '🏛️' },
  { key: 'analysis', label: '財務分析', icon: '📊' },
]

export default function Dashboard() {
  const { user, logout, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState('income')
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState({})
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    api.transactions.categories().then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    if (user?.family_id) {
      api.transactions.list().then(setTransactions).catch(() => {})
    } else {
      setTransactions([])
    }
  }, [user?.family_id, refreshKey])

  const triggerRefresh = () => setRefreshKey(k => k + 1)

  const handleCreateFamily = async (name) => {
    const data = await api.families.create(name)
    updateUser({ family_id: data.family.id })
    localStorage.setItem('token', data.token)
    triggerRefresh()
    return data.family
  }

  const handleJoinFamily = async (code) => {
    const data = await api.families.join(code)
    updateUser({ family_id: data.family.id })
    localStorage.setItem('token', data.token)
    triggerRefresh()
    return data.family
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'income':
        return <IncomeForm categories={categories.income || []} onSuccess={triggerRefresh} transactions={transactions.filter(t => t.type === 'income' && t.user_id === user.id)} />
      case 'expense':
        return <ExpenseForm categories={categories.expense || []} onSuccess={triggerRefresh} transactions={transactions.filter(t => t.type === 'expense' && t.user_id === user.id)} />
      case 'deposit':
        return <DepositForm categories={categories.deposit || []} onSuccess={triggerRefresh} transactions={transactions.filter(t => t.type === 'deposit')} />
      case 'investment':
        return <InvestmentForm categories={categories.investment || []} onSuccess={triggerRefresh} />
      case 'family-investment':
        return <FamilyInvestmentSummary />
      case 'analysis':
        return <FinancialAnalysis transactions={transactions} />
      default:
        return null
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 28 }}>💰</span>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: 'white' }}>家庭財務管理</h1>
              {user?.family_id && (
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                  {user.display_name || user.email} 的家庭
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FamilyManager
              familyId={user?.family_id}
              onCreate={handleCreateFamily}
              onJoin={handleJoinFamily}
            />
            <button className="btn btn-outline btn-sm" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }} onClick={logout}>
              登出
            </button>
          </div>
        </div>
      </header>

      {!user?.family_id && (
        <div className="container mt-3">
          <div className="card text-center" style={{ padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
            <h2 style={{ marginBottom: 8 }}>歡迎來到家庭財務管理</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
              您還沒有加入任何家庭。請建立一個新家庭或輸入邀請碼加入現有家庭。
            </p>
            <FamilyManager
              familyId={user?.family_id}
              onCreate={handleCreateFamily}
              onJoin={handleJoinFamily}
              inline
            />
          </div>
        </div>
      )}

      {user?.family_id && (
        <>
          <div className="container mt-3">
            <div className="tabs">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  className={`tab ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="container mt-2 mb-3">
            <VoiceInput
              categories={categories}
              onSuccess={triggerRefresh}
            />
          </div>

          <div className="container mb-3">
            {renderTabContent()}
          </div>
        </>
      )}

      <style>{dashboardStyles}</style>
    </div>
  )
}

const dashboardStyles = `
  .dashboard-header {
    background: linear-gradient(135deg, #002171 0%, #0d47a1 50%, #1565c0 100%);
    padding: 16px 0;
    box-shadow: 0 4px 20px rgba(0,33,113,0.2);
  }
  .tabs {
    display: flex;
    gap: 4px;
    background: white;
    border-radius: 12px;
    padding: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    overflow-x: auto;
  }
  .tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    border: none;
    background: transparent;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }
  .tab:hover { background: #f0f2f5; }
  .tab.active {
    background: linear-gradient(135deg, var(--primary), var(--primary-light));
    color: white;
    box-shadow: 0 4px 12px rgba(13,71,161,0.3);
  }
`
