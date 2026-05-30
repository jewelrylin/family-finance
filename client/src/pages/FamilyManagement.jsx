import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function FamilyManagement() {
  const { user } = useAuth();
  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddExisting, setShowAddExisting] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [newMember, setNewMember] = useState({ email: '', password: '', name: '' });
  const [existingEmail, setExistingEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [familyData, membersData] = await Promise.all([
        api.getMyFamily(),
        api.getMembers()
      ]);
      setFamily(familyData.family);
      setMembers(membersData.members || []);
      setIsAdmin(membersData.isAdmin);
    } catch (err) {
      console.error('Load data error:', err);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.createFamily({ name: newFamilyName });
      setShowCreate(false);
      setNewFamilyName('');
      setFamily(data.family);
      setIsAdmin(true);
      await loadData();
      setSuccess(`家庭建立成功！邀請碼：${data.family.invite_code}`);
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
      const data = await api.joinFamily(inviteCode);
      setShowJoin(false);
      setInviteCode('');
      setFamily(data.family);
      await loadData();
      setSuccess('成功加入家庭！');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId, name) => {
    if (!confirm(`確定要刪除「${name}」嗎？\n此操作會連同其所有交易紀錄一併刪除，且無法復原。`)) return;
    try {
      await api.removeMember(userId);
      await loadData();
      setSuccess('成員已刪除');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddExisting = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.addExistingMember(existingEmail.trim());
      setShowAddExisting(false);
      setExistingEmail('');
      await loadData();
      setSuccess(`已將「${data.member.name}」加入家庭`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.addMember(newMember);
      setShowAddMember(false);
      setNewMember({ email: '', password: '', name: '' });
      await loadData();
      setSuccess('成員已新增');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 24, gap: 8 }}>
        {!family && (
          <>
            <button className="btn btn-secondary" onClick={() => setShowJoin(true)}>加入家庭</button>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>建立家庭</button>
          </>
        )}
      </div>

      {!family ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <h3>您尚未加入任何家庭</h3>
              <p>建立一個新家庭或透過邀請碼加入現有家庭</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>建立家庭</button>
                <button className="btn btn-secondary" onClick={() => setShowJoin(true)}>加入家庭</button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><h3>家庭資訊</h3></div>
            <div className="card-body">
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>家庭名稱</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{family.name}</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>邀請碼</div>
                <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                  {family.invite_code}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                  將此邀請碼分享給家庭成員，他們即可加入
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>我的角色</div>
                <span className={`badge badge-${isAdmin ? 'admin' : 'member'}`}>
                  {isAdmin ? '管理員' : '成員'}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>建立時間</div>
                <div style={{ fontSize: 14 }}>{new Date(family.created_at).toLocaleDateString('zh-TW')}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3>家庭成員 ({members.length})</h3>
              {isAdmin && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowAddExisting(true)}>
                    加入既有帳號
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowAddMember(true)}>
                    新增成員
                  </button>
                </div>
              )}
            </div>
            <div className="card-body no-padding">
              <ul className="member-list">
                {members.map(m => (
                  <li key={m.id} className="member-item">
                    <div className="member-info">
                      <div className="member-avatar">{m.name?.charAt(0)?.toUpperCase() || '?'}</div>
                      <div>
                        <div className="member-name">
                          {m.name}
                          {m.id === user?.id && <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 6 }}>(你)</span>}
                        </div>
                        <div className="member-email">{m.email}</div>
                      </div>
                    </div>
                    <div className="member-actions">
                      <span className={`badge badge-${m.role === 'admin' ? 'admin' : 'member'}`}>
                        {m.role === 'admin' ? '管理員' : '成員'}
                      </span>
                      {isAdmin && m.id !== user?.id && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(m.id, m.name)}>刪除</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

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
                  <input type="text" className="form-input" placeholder="例如：我們的家"
                    value={newFamilyName} onChange={e => setNewFamilyName(e.target.value)} required />
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

      {showAddExisting && (
        <div className="modal-overlay" onClick={() => setShowAddExisting(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>加入既有帳號</h3>
              <button className="modal-close" onClick={() => setShowAddExisting(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddExisting}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">使用者信箱</label>
                  <input type="email" className="form-input" placeholder="輸入已註冊帳號的信箱"
                    value={existingEmail} onChange={e => setExistingEmail(e.target.value)} required autoFocus />
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                    對方須已註冊過 FamilyFin 且尚未加入任何家庭
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddExisting(false)}>取消</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? '加入中...' : '加入家庭'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddMember && (
        <div className="modal-overlay" onClick={() => setShowAddMember(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>新增成員</h3>
              <button className="modal-close" onClick={() => setShowAddMember(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddMember}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">姓名</label>
                  <input type="text" className="form-input" placeholder="例如：小明"
                    value={newMember.name} onChange={e => setNewMember(s => ({ ...s, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">信箱</label>
                  <input type="email" className="form-input" placeholder="example@mail.com"
                    value={newMember.email} onChange={e => setNewMember(s => ({ ...s, email: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">密碼</label>
                  <input type="text" className="form-input" placeholder="至少 6 字"
                    value={newMember.password} onChange={e => setNewMember(s => ({ ...s, password: e.target.value }))}
                    minLength={6} required />
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                    請告訴成員：可用此信箱和密碼登入後自行修改
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddMember(false)}>取消</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? '新增中...' : '新增'}
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
                  <label className="form-label">邀請碼</label>
                  <input type="text" className="form-input" placeholder="請輸入邀請碼（向管理員索取）"
                    value={inviteCode} onChange={e => setInviteCode(e.target.value)} required />
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
