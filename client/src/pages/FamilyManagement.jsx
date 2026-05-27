import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function FamilyManagement() {
  const { user } = useAuth();
  const [families, setFamilies] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState('');
  const [members, setMembers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [joinFamilyId, setJoinFamilyId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const loadFamilies = useCallback(async () => {
    try {
      const data = await api.getFamilies();
      setFamilies(data.families);
      if (data.families.length > 0 && (!selectedFamily || !data.families.find(f => f.id === selectedFamily))) {
        setSelectedFamily(data.families[0].id);
      }
    } catch (err) {
      console.error('Load families error:', err);
    }
  }, [selectedFamily]);

  const loadMembers = useCallback(async () => {
    if (!selectedFamily) return;
    try {
      const data = await api.getMembers(selectedFamily);
      setMembers(data.members);
    } catch (err) {
      console.error('Load members error:', err);
    }
  }, [selectedFamily]);

  useEffect(() => { loadFamilies(); }, [loadFamilies]);
  useEffect(() => { loadMembers(); }, [loadMembers]);

  const isAdmin = families.find(f => f.id === selectedFamily)?.role === 'admin';
  const currentFamily = families.find(f => f.id === selectedFamily);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.createFamily({ name: newFamilyName });
      setShowCreate(false);
      setNewFamilyName('');
      setSelectedFamily(data.family.id);
      await loadFamilies();
      setSuccess('家庭建立成功！');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.joinFamily(joinFamilyId);
      setShowJoin(false);
      setJoinFamilyId('');
      await loadFamilies();
      setSuccess('成功加入家庭！');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('確定要移除此成員嗎？')) return;
    try {
      await api.removeMember(selectedFamily, userId);
      await loadMembers();
      setSuccess('成員已移除');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>家庭管理</h1>
        <p>管理您的家庭群組與成員</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div className="family-selector" style={{ marginBottom: 0 }}>
          <select value={selectedFamily} onChange={e => setSelectedFamily(e.target.value)}>
            {families.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowJoin(true)}>
            加入家庭
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            建立家庭
          </button>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3>家庭資訊</h3>
          </div>
          <div className="card-body">
            {currentFamily ? (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>家庭名稱</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{currentFamily.name}</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>我的角色</div>
                  <span className={`badge badge-${isAdmin ? 'admin' : 'member'}`}>
                    {isAdmin ? '管理員' : '成員'}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>建立時間</div>
                  <div style={{ fontSize: 14 }}>{new Date(currentFamily.created_at).toLocaleDateString('zh-TW')}</div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>尚未加入任何家庭</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>家庭成員 ({members.length})</h3>
          </div>
          <div className="card-body no-padding">
            {members.length === 0 ? (
              <div className="empty-state"><p>尚無成員</p></div>
            ) : (
              <ul className="member-list">
                {members.map(m => (
                  <li key={m.id} className="member-item">
                    <div className="member-info">
                      <div className="member-avatar">
                        {m.user?.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="member-name">
                          {m.user?.name || '未知'}
                          {m.user?.id === user?.id && (
                            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 6 }}>(你)</span>
                          )}
                        </div>
                        <div className="member-email">{m.user?.email}</div>
                      </div>
                    </div>
                    <div className="member-actions">
                      <span className={`badge badge-${m.role === 'admin' ? 'admin' : 'member'}`}>
                        {m.role === 'admin' ? '管理員' : '成員'}
                      </span>
                      {isAdmin && m.user?.id !== user?.id && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(m.user.id)}>
                          移除
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>建立新家庭</h3>
              <button className="modal-close" onClick={() => setShowCreate(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">家庭名稱</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="例如：我們的家"
                    value={newFamilyName}
                    onChange={e => setNewFamilyName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>取消</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? '建立中...' : '建立'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showJoin && (
        <div className="modal-overlay" onClick={() => setShowJoin(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>加入家庭</h3>
              <button className="modal-close" onClick={() => setShowJoin(false)}>&times;</button>
            </div>
            <form onSubmit={handleJoin}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">家庭 ID</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="請輸入家庭 ID（向管理員索取）"
                    value={joinFamilyId}
                    onChange={e => setJoinFamilyId(e.target.value)}
                    required
                  />
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>
                    家庭 ID 可以在「家庭資訊」中找到，請向該家庭的管理員索取
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowJoin(false)}>取消</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? '加入中...' : '加入'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
