import { useState, useEffect } from 'react'
import { api } from '../api'

export default function FamilyManager({ familyId, onCreate, onJoin, inline }) {
  const [show, setShow] = useState(false)
  const [mode, setMode] = useState('create')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [familyInfo, setFamilyInfo] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (familyId) {
      api.families.my().then(setFamilyInfo).catch(() => {})
    }
  }, [familyId])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const family = await onCreate(name)
      setFamilyInfo(family)
      setShow(false)
      setName('')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const family = await onJoin(code.toUpperCase())
      setFamilyInfo(family)
      setShow(false)
      setCode('')
    } catch (err) {
      setError(err.message)
    }
  }

  const content = (
    <>
      {familyInfo && (
        <div className="card mb-3">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontWeight: 700 }}>{familyInfo.name}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                邀請碼：<strong style={{ color: 'var(--primary)', letterSpacing: 2 }}>{familyInfo.invite_code}</strong>
                &nbsp;|&nbsp;{familyInfo.members?.length || 0} 位成員
              </p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => setShow(true)}>
              管理
            </button>
          </div>
        </div>
      )}

      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: 16 }}>家庭設定</h2>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button className={`btn ${mode === 'create' ? 'btn-primary' : 'btn-outline'} btn-sm`} onClick={() => setMode('create')}>建立家庭</button>
              <button className={`btn ${mode === 'join' ? 'btn-primary' : 'btn-outline'} btn-sm`} onClick={() => setMode('join')}>加入家庭</button>
            </div>

            {error && <div className="error-msg">{error}</div>}

            {mode === 'create' ? (
              <form onSubmit={handleCreate}>
                <div className="input-group">
                  <label>家庭名稱</label>
                  <input value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  建立家庭
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoin}>
                <div className="input-group">
                  <label>邀請碼</label>
                  <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} required />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  加入家庭
                </button>
              </form>
            )}

            <button className="btn btn-outline btn-sm mt-2" style={{ width: '100%' }} onClick={() => setShow(false)}>
              取消
            </button>
          </div>
        </div>
      )}

      <style>{modalStyles}</style>
    </>
  )

  if (inline) {
    if (familyId && familyInfo) {
      return (
        <div className="card mb-3">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontWeight: 700 }}>{familyInfo.name}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                邀請碼：<strong style={{ color: 'var(--primary)', letterSpacing: 2 }}>{familyInfo.invite_code}</strong>
                &nbsp;|&nbsp;{familyInfo.members?.length || 0} 位成員
              </p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => setShow(true)}>管理</button>
          </div>
          {show && (
            <div className="modal-overlay" onClick={() => setShow(false)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <h2 style={{ marginBottom: 16 }}>家庭設定</h2>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <button className={`btn ${mode === 'create' ? 'btn-primary' : 'btn-outline'} btn-sm`} onClick={() => setMode('create')}>建立家庭</button>
                  <button className={`btn ${mode === 'join' ? 'btn-primary' : 'btn-outline'} btn-sm`} onClick={() => setMode('join')}>加入家庭</button>
                </div>
                {error && <div className="error-msg">{error}</div>}
                {mode === 'create' ? (
                  <form onSubmit={handleCreate}>
                    <div className="input-group">
                      <label>家庭名稱</label>
                      <input value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>建立家庭</button>
                  </form>
                ) : (
                  <form onSubmit={handleJoin}>
                    <div className="input-group">
                      <label>邀請碼</label>
                      <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} required />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>加入家庭</button>
                  </form>
                )}
                <button className="btn btn-outline btn-sm mt-2" style={{ width: '100%' }} onClick={() => setShow(false)}>取消</button>
              </div>
            </div>
          )}
          <style>{modalStyles}</style>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
        {error && <div className="error-msg" style={{ width: '100%' }}>{error}</div>}
        {mode === 'create' ? (
          <form onSubmit={handleCreate} className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
            <input value={name} onChange={e => setName(e.target.value)} style={{ padding: '10px 14px', border: '2px solid var(--border)', borderRadius: 8, fontSize: 15, flex: 1, minWidth: 160 }} required />
            <button type="submit" className="btn btn-primary btn-sm">建立</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setMode('join')}>加入現有家庭</button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} style={{ padding: '10px 14px', border: '2px solid var(--border)', borderRadius: 8, fontSize: 15, flex: 1, minWidth: 160 }} required />
            <button type="submit" className="btn btn-primary btn-sm">加入</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setMode('create')}>建立新家庭</button>
          </form>
        )}
      </div>
    )
  }

  return (
    <>
      <button className="btn btn-secondary btn-sm" onClick={() => setShow(true)}>
        家庭
      </button>
      {content}
    </>
  )
}

const modalStyles = `
  .modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }
  .modal {
    background: white;
    border-radius: 16px;
    padding: 32px;
    width: 100%;
    max-width: 420px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  }
`
