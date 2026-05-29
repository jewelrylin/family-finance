import { useState, useEffect } from 'react';

const typeConfig = {
  income: { label: '收入', color: 'var(--color-success)' },
  expense: { label: '支出', color: 'var(--color-danger)' },
  investment: { label: '投資', color: 'var(--color-primary)' },
  savings: { label: '存款', color: 'var(--color-purple)' }
};

const defaultCategories = {
  income: ['薪資', '獎金', '投資收益', '副業', '其他收入'],
  expense: ['飲食', '交通', '住房', '娛樂', '醫療', '教育', '購物', '其他支出'],
  investment: ['股票', '基金', '債券', '房地產', '加密貨幣', '其他投資'],
  savings: ['活期存款', '定期存款', '緊急預備金', '退休儲蓄', '其他存款']
};

const freqOptions = [
  { value: 'weekly', label: '每週' },
  { value: 'monthly', label: '每月' },
  { value: 'yearly', label: '每年' }
];

export default function TransactionForm({ onSubmit, onClose, initialData, familyId, defaultType }) {
  const [type, setType] = useState(initialData?.type || defaultType || 'expense');
  const [name, setName] = useState(initialData?.name || '');
  const [ticker, setTicker] = useState(initialData?.ticker || '');
  const [shares, setShares] = useState(initialData?.shares || '');
  const [amount, setAmount] = useState(initialData?.amount || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [recurring, setRecurring] = useState(initialData?.recurring || false);
  const [recurringFreq, setRecurringFreq] = useState(initialData?.recurring_freq || 'monthly');
  const [customCategory, setCustomCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = defaultCategories[type] || [];

  useEffect(() => {
    if (!categories.includes(category) && category) {
      setCategory('');
    }
  }, [type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!amount || parseFloat(amount) <= 0) {
      setError('請輸入有效的金額');
      return;
    }

    const finalCategory = category === '__custom__' ? customCategory : category;

    setLoading(true);
    try {
      await onSubmit({
        family_id: familyId,
        type,
        name: type === 'investment' ? name.trim() : '',
        ticker: type === 'investment' ? ticker.trim().toUpperCase() : '',
        shares: type === 'investment' && shares !== '' ? parseFloat(shares) : null,
        amount: parseFloat(amount),
        category: finalCategory,
        description,
        date,
        recurring,
        recurring_freq: recurring ? recurringFreq : ''
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{initialData ? '編輯' : '新增'}{typeConfig[type].label}記錄</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">類型</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {Object.entries(typeConfig).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    className="btn btn-sm"
                    style={{
                      background: type === key ? cfg.color : 'var(--color-bg)',
                      color: type === key ? '#fff' : 'var(--color-text-secondary)',
                      border: type === key ? 'none' : '1.5px solid var(--color-border)'
                    }}
                    onClick={() => setType(key)}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {type === 'investment' && (
              <>
                <div className="form-group">
                  <label className="form-label">名稱</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="例如：台積電、0050、定期定額基金"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">股票代號（選填）</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="台股 2330、美股 AAPL、鉅亨基金 A16003"
                      value={ticker}
                      onChange={e => setTicker(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">股數（選填）</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="例如 100"
                      step="0.0001"
                      min="0"
                      value={shares}
                      onChange={e => setShares(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">金額</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">日期</label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">類別</label>
              <select
                className="form-select"
                value={category}
                onChange={e => setCategory(e.target.value)}
                required
              >
                <option value="">選擇類別</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="__custom__">自訂類別...</option>
              </select>
            </div>

            {category === '__custom__' && (
              <div className="form-group">
                <label className="form-label">自訂類別名稱</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="請輸入自訂類別"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">備註</label>
              <textarea
                className="form-textarea"
                placeholder="新增備註（選填）"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            {(type === 'income' || type === 'expense') && (
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={recurring}
                    onChange={e => setRecurring(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 500, fontSize: 14 }}>設為固定{type === 'income' ? '收入' : '支出'}</span>
                </label>
                {recurring && (
                  <div style={{ marginTop: 8, marginLeft: 26 }}>
                    <select
                      className="form-select"
                      value={recurringFreq}
                      onChange={e => setRecurringFreq(e.target.value)}
                      style={{ fontSize: 14 }}
                    >
                      {freqOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '儲存中...' : '儲存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
