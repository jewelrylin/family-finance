const express = require('express');
const { getClient } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

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

    await supabase
      .from('users')
      .update({ family_id: family.id, role: 'admin' })
      .eq('id', req.user.id);

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

    await supabase
      .from('users')
      .update({ family_id: family.id, role: 'member' })
      .eq('id', req.user.id);

    res.json({ family: { ...family, role: 'member' } });
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

// 管理員移除成員
router.delete('/members/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const supabase = getClient();

    const { data: currentUser } = await supabase
      .from('users')
      .select('family_id, role')
      .eq('id', req.user.id)
      .maybeSingle();

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: '只有管理員可以移除成員' });
    }

    if (String(userId) === String(req.user.id)) {
      return res.status(400).json({ error: '管理員不能移除自己' });
    }

    await supabase
      .from('users')
      .update({ family_id: null, role: 'user' })
      .eq('id', userId)
      .eq('family_id', currentUser.family_id);

    res.json({ message: '成員已移除' });
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ error: '移除成員失敗' });
  }
});

module.exports = router;
