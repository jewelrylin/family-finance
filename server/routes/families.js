const express = require('express');
const bcrypt = require('bcryptjs');
const { getClient } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// 更新使用者欄位並確認真的有寫入到 row，避免 RLS / FK 等錯誤被靜默吞掉
async function updateUser(supabase, userId, updates) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('user_not_updated');
  return data;
}

// 取得用戶的家庭資訊
router.get('/mine', auth, async (req, res) => {
  try {
    const supabase = getClient();
    const { data: user } = await supabase
      .from('users')
      .select('family_id')
      .eq('id', req.user.id)
      .maybeSingle();

    if (!user?.family_id) {
      return res.json({ family: null });
    }

    const { data: family } = await supabase
      .from('families')
      .select('*')
      .eq('id', user.family_id)
      .maybeSingle();

    res.json({ family });
  } catch (err) {
    console.error('Get my family error:', err);
    res.status(500).json({ error: '無法獲取家庭資訊' });
  }
});

// 建立家庭
router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '請輸入家庭名稱' });
    }

    const supabase = getClient();

    const { data: currentUser } = await supabase
      .from('users')
      .select('family_id')
      .eq('id', req.user.id)
      .maybeSingle();

    if (currentUser?.family_id) {
      return res.status(400).json({ error: '你已經在一個家庭中' });
    }

    const inviteCode = 'FF' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data: family, error } = await supabase
      .from('families')
      .insert({ name: name.trim(), invite_code: inviteCode })
      .select()
      .single();

    if (error) {
      console.error('Create family DB error:', error);
      return res.status(500).json({ error: '建立家庭失敗，請確認資料庫權限設定' });
    }

    try {
      await updateUser(supabase, req.user.id, { family_id: family.id, role: 'admin' });
    } catch (e) {
      console.error('Create family: user update failed:', e?.message || e);
      return res.status(500).json({ error: '建立家庭後無法綁定使用者，請確認 Supabase users 表權限', detail: e?.message });
    }

    res.status(201).json({ family: { ...family, role: 'admin' } });
  } catch (err) {
    console.error('Create family error:', err);
    res.status(500).json({ error: '建立家庭失敗' });
  }
});

// 透過邀請碼加入家庭
router.post('/join', auth, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) {
      return res.status(400).json({ error: '請輸入邀請碼' });
    }

    const supabase = getClient();

    const { data: family, error: queryError } = await supabase
      .from('families')
      .select('*')
      .eq('invite_code', inviteCode.trim().toUpperCase())
      .maybeSingle();

    if (queryError) {
      console.error('Join family query error:', queryError);
      return res.status(500).json({ error: '查詢家庭時發生錯誤，請稍後再試' });
    }

    if (!family) {
      return res.status(404).json({ error: '找不到此邀請碼對應的家庭' });
    }

    const { data: currentUser } = await supabase
      .from('users')
      .select('family_id')
      .eq('id', req.user.id)
      .maybeSingle();

    if (currentUser?.family_id) {
      return res.status(400).json({ error: '你已經在一個家庭中' });
    }

    try {
      await updateUser(supabase, req.user.id, { family_id: family.id, role: 'user' });
    } catch (e) {
      console.error('Join family: user update failed:', e?.message || e);
      return res.status(500).json({ error: '加入家庭失敗，使用者資料無法更新', detail: e?.message });
    }

    res.json({ family: { ...family, role: 'user' } });
  } catch (err) {
    console.error('Join family error:', err);
    res.status(500).json({ error: '加入家庭失敗' });
  }
});

// 獲取家庭成員列表
router.get('/members', auth, async (req, res) => {
  try {
    const supabase = getClient();

    const { data: currentUser } = await supabase
      .from('users')
      .select('family_id, role')
      .eq('id', req.user.id)
      .maybeSingle();

    if (!currentUser?.family_id) {
      return res.json({ members: [], isAdmin: false });
    }

    const { data: members, error } = await supabase
      .from('users')
      .select('id, email, display_name, role, created_at')
      .eq('family_id', currentUser.family_id);

    if (error) throw error;

    res.json({
      members: members.map(m => ({
        id: m.id,
        email: m.email,
        name: m.display_name,
        role: m.role,
        created_at: m.created_at
      })),
      isAdmin: currentUser.role === 'admin',
      familyId: currentUser.family_id
    });
  } catch (err) {
    console.error('Get members error:', err);
    res.status(500).json({ error: '無法獲取成員列表' });
  }
});

// 取得操作者並確認為當前家庭管理員
async function requireFamilyAdmin(supabase, userId) {
  const { data: me } = await supabase
    .from('users')
    .select('family_id, role')
    .eq('id', userId)
    .maybeSingle();
  if (!me?.family_id || me.role !== 'admin') return null;
  return me;
}

// 管理員新增成員（建立帳號 + 自動加入該家庭）
router.post('/members', auth, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: '請填寫信箱、密碼和姓名' });
    }

    const supabase = getClient();
    const admin = await requireFamilyAdmin(supabase, req.user.id);
    if (!admin) {
      return res.status(403).json({ error: '只有管理員可以新增成員' });
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (existing) {
      return res.status(400).json({ error: '此信箱已被註冊' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: hashed,
        display_name: name,
        family_id: admin.family_id,
        role: 'user'
      })
      .select('id, email, display_name, role, created_at')
      .single();

    if (error) {
      console.error('Add member DB error:', error);
      return res.status(500).json({ error: '新增成員失敗', detail: error.message });
    }

    res.status(201).json({
      member: {
        id: user.id,
        email: user.email,
        name: user.display_name,
        role: user.role,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error('Add member error:', err);
    res.status(500).json({ error: '新增成員失敗' });
  }
});

// 管理員刪除成員（完全刪除帳號 + 連動刪除其交易）
router.delete('/members/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const supabase = getClient();

    const admin = await requireFamilyAdmin(supabase, req.user.id);
    if (!admin) {
      return res.status(403).json({ error: '只有管理員可以刪除成員' });
    }

    if (String(userId) === String(req.user.id)) {
      return res.status(400).json({ error: '管理員不能刪除自己' });
    }

    // 確認目標確實在管理員的家庭裡
    const { data: target } = await supabase
      .from('users')
      .select('id, family_id')
      .eq('id', userId)
      .maybeSingle();
    if (!target || String(target.family_id) !== String(admin.family_id)) {
      return res.status(404).json({ error: '找不到此成員或不在你的家庭' });
    }

    // 先清交易（FK 沒設 cascade 時也保險）
    const { error: txErr } = await supabase.from('transactions').delete().eq('user_id', userId);
    if (txErr) throw txErr;

    const { error: delErr } = await supabase.from('users').delete().eq('id', userId);
    if (delErr) throw delErr;

    res.json({ message: '成員已刪除' });
  } catch (err) {
    console.error('Delete member error:', err);
    res.status(500).json({ error: '刪除成員失敗', detail: err?.message });
  }
});

module.exports = router;
