import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Alert from '../components/ui/Alert'

const CATEGORIES_INCOME = ['薪資', '投資收益', '紅利', '其他']
const CATEGORIES_EXPENSE = ['食物', '交通', '娛樂', '教育', '醫療', '購物', '其他']
const CATEGORIES_INVESTMENT = ['股票', '基金', '加密貨幣', '房產', '其他']

export default function DashboardPage() {
  const { user, logout, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState('income')
  const [transactions, setTransactions] = useState([])
  const [families, setFamilies] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // 表單狀態
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    symbol: ''
  })

  const [familyData, setFamilyData] = useState({
    familyName: '',
    inviteCode: ''
  })

  // 加載數據
  useEffect(() => {
    loadData()
  }, [refreshKey])

  const loadData = async () => {
    try {
      if (user?.family_id) {
        const data = await api.transactions.list()
        setTransactions(data || [])
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCreateFamily = async () => {
    if (!familyData.familyName) {
      setError('請輸入家庭名稱')
      return
    }

    setLoading(true)
    try {
      const data = await api.families.create(familyData.familyName)
      updateUser({ family_id: data.family.id })
      localStorage.setItem('token', data.token)
      setSuccess('家庭已建立！')
      setFamilyData({ familyName: '', inviteCode: '' })
      setRefreshKey(k => k + 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinFamily = async () => {
    if (!familyData.inviteCode) {
      setError('請輸入邀請碼')
      return
    }

    setLoading(true)
    try {
      const data = await api.families.join(familyData.inviteCode)
      updateUser({ family_id: data.family.id })
      localStorage.setItem('token', data.token)
      setSuccess('已加入家庭！')
      setFamilyData({ familyName: '', inviteCode: '' })
      setRefreshKey(k => k + 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTransaction = async () => {
    if (!formData.amount || !formData.category) {
      setError('請填寫必填欄位')
      return
    }

    setLoading(true)
    try {
      const type = activeTab
      await api.transactions.create({
        type,
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        date: formData.date,
        symbol: formData.symbol || undefined
      })
      setSuccess('記錄已添加！')
      setFormData({
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        symbol: ''
      })
      setRefreshKey(k => k + 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('確定要刪除嗎？')) return

    try {
      await api.transactions.delete(id)
      setSuccess('已刪除')
      setRefreshKey(k => k + 1)
    } catch (err) {
      setError(err.message)
    }
  }

  if (!user?.family_id) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto pt-20">
          <Card>
            <CardHeader>
              <CardTitle>建立或加入家庭</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && <Alert variant="error">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <div>
                <h3 className="font-bold mb-3">建立新家庭</h3>
                <div className="space-y-3">
                  <Input
                    placeholder="輸入家庭名稱"
                    value={familyData.familyName}
                    onChange={(e) => setFamilyData({ ...familyData, familyName: e.target.value })}
                  />
                  <Button
                    onClick={handleCreateFamily}
                    variant="primary"
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? '建立中...' : '建立家庭'}
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-bold mb-3">或加入現有家庭</h3>
                <div className="space-y-3">
                  <Input
                    placeholder="輸入邀請碼"
                    value={familyData.inviteCode}
                    onChange={(e) => setFamilyData({ ...familyData, inviteCode: e.target.value })}
                  />
                  <Button
                    onClick={handleJoinFamily}
                    variant="secondary"
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? '加入中...' : '加入家庭'}
                  </Button>
                </div>
              </div>

              <Button
                onClick={logout}
                variant="outline"
                className="w-full"
              >
                登出
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const getCategories = () => {
    switch(activeTab) {
      case 'expense': return CATEGORIES_EXPENSE
      case 'investment': return CATEGORIES_INVESTMENT
      default: return CATEGORIES_INCOME
    }
  }

  const getTransactionLabel = () => {
    switch(activeTab) {
      case 'expense': return '支出'
      case 'investment': return '投資'
      default: return '收入'
    }
  }

  const tabLabels = {
    income: '📈 收入',
    expense: '📉 支出',
    investment: '💹 投資'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頂部欄 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">家庭財務管理</h1>
            <p className="text-sm text-gray-600">歡迎，{user?.display_name}</p>
          </div>
          <Button onClick={logout} variant="secondary">
            登出
          </Button>
        </div>
      </div>

      {/* 主內容 */}
      <div className="max-w-6xl mx-auto p-4">
        {error && <Alert variant="error" className="mb-4">{error}</Alert>}
        {success && <Alert variant="success" className="mb-4">{success}</Alert>}

        {/* 標籤頁 */}
        <div className="flex gap-2 mb-6 border-b">
          {Object.entries(tabLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`py-3 px-4 font-medium border-b-2 transition ${
                activeTab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* 表單 */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">新增{getTransactionLabel()}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">金額</label>
                <Input
                  type="number"
                  placeholder="輸入金額"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  step="0.01"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">分類</label>
                <Select
                  options={getCategories().map(c => ({ value: c, label: c }))}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">描述</label>
                <Input
                  placeholder="備註（可選）"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">日期</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              {activeTab === 'investment' && (
                <div>
                  <label className="text-sm font-medium text-gray-700">代碼/符號</label>
                  <Input
                    placeholder="如：AAPL、TCEHY"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                  />
                </div>
              )}

              <Button
                onClick={handleCreateTransaction}
                variant="primary"
                className="w-full"
                disabled={loading}
              >
                {loading ? '添加中...' : '添加'}
              </Button>
            </CardContent>
          </Card>

          {/* 列表 */}
          <div className="md:col-span-2 space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">記錄</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">沒有記錄</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {transactions.map((t) => (
                      <div
                        key={t.id}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100 transition"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{t.category}</p>
                          <p className="text-sm text-gray-600">{t.date} • {t.description}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-bold ${
                            t.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {t.type === 'income' ? '+' : '-'}${t.amount}
                          </span>
                          <Button
                            onClick={() => handleDeleteTransaction(t.id)}
                            variant="danger"
                            size="sm"
                          >
                            刪除
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
