import { useState, useEffect } from 'react'
import { api } from '../api'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

export default function VoiceInput({ categories, onSuccess }) {
  const [listening, setListening] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [recognition, setRecognition] = useState(null)

  useEffect(() => {
    if (SpeechRecognition) {
      const sr = new SpeechRecognition()
      sr.lang = 'zh-TW'
      sr.continuous = false
      sr.interimResults = false

      sr.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        parseVoiceInput(transcript)
      }

      sr.onerror = (event) => {
        setListening(false)
        setError('語音辨識錯誤：' + event.error)
      }

      sr.onend = () => {
        setListening(false)
      }

      setRecognition(sr)
    }
  }, [categories])

  const allCategories = [
    ...(categories.income || []).map(c => ({ type: 'income', name: c })),
    ...(categories.expense || []).map(c => ({ type: 'expense', name: c })),
    ...(categories.investment || []).map(c => ({ type: 'investment', name: c })),
  ]

  const parseVoiceInput = (text) => {
    setError('')

    const typeKeywords = {
      income: ['收入', '賺了', '收到', '薪資', '入帳'],
      expense: ['支出', '花了', '消費', '買了', '付了', '繳'],
      investment: ['投資', '買入', '賣出', '申購', '贖回'],
    }

    let detectedType = null
    for (const [type, keywords] of Object.entries(typeKeywords)) {
      if (keywords.some(k => text.includes(k))) {
        detectedType = type
        break
      }
    }

    const amountMatch = text.match(/(\d+[,]?\d*)(?:\.\d+)?/)
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : null

    let detectedCategory = null
    for (const cat of allCategories) {
      if (text.includes(cat.name)) {
        detectedCategory = cat
        break
      }
    }

    if (!detectedType) {
      setError('無法辨識類型（收入/支出/投資），請重新輸入')
      return
    }
    if (!detectedCategory) {
      setError('無法辨識分類，請重新輸入')
      return
    }
    if (!amount) {
      setError('無法辨識金額，請重新輸入')
      return
    }

    setResult({
      type: detectedType,
      category: detectedCategory.name,
      amount,
      note: text,
      date: new Date().toISOString().split('T')[0],
    })
  }

  const startListening = () => {
    setError('')
    setResult(null)
    if (recognition) {
      try {
        recognition.start()
        setListening(true)
      } catch {
        setListening(false)
      }
    } else {
      setError('您的瀏覽器不支援語音辨識功能，請使用 Chrome')
    }
  }

  const stopListening = () => {
    if (recognition) {
      recognition.stop()
    }
    setListening(false)
  }

  const handleSubmit = async () => {
    if (!result) return
    try {
      await api.transactions.create(result)
      setResult(null)
      onSuccess()
    } catch (err) {
      setError(err.message)
    }
  }

  const typeLabels = { income: '收入', expense: '支出', investment: '投資' }

  return (
    <div className="card mb-3">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: result ? 16 : 0 }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 20 }}>🎤</span>
          <span style={{ fontWeight: 700 }}>語音輸入</span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>說出您的記帳內容，例如「今天午餐花了150元」</span>
        </div>
        <button
          className={`btn ${listening ? 'btn-danger' : 'btn-secondary'} btn-sm`}
          onClick={listening ? stopListening : startListening}
        >
          {listening ? '⏹ 停止聆聽' : '🎤 開始語音'}
        </button>
      </div>

      {error && <div className="error-msg mt-2">{error}</div>}

      {result && (
        <div className="voice-result">
          <div className="grid-3">
            <div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>類型</span>
              <div style={{ fontWeight: 700 }}>
                <span className={`badge badge-${result.type}`}>{typeLabels[result.type]}</span>
              </div>
            </div>
            <div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>分類</span>
              <div style={{ fontWeight: 700 }}>{result.category}</div>
            </div>
            <div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>金額</span>
              <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--primary)' }}>
                ${result.amount.toLocaleString()}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
            {result.note}
          </div>
          <button className="btn btn-primary btn-sm mt-2" onClick={handleSubmit}>
            確認新增
          </button>
        </div>
      )}
    </div>
  )
}
