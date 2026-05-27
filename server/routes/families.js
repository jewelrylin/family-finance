const express = require('express');
const { getClient } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { data: memberships, error } = await getClient()
      .from('family_members')
      .select('family_id, role, families(id, name, created_at)')
      .eq('user_id', req.user.id);

    if (error) throw error;

    const families = memberships.map(m => ({
      id: m.families.id,
      name: m.families.name,
      role: m.role,
      created_at: m.families.created_at
    }));

    res.json({ families });
  } catch (err) {
    console.error('Get families error:', err);
    res.status(500).json({ error: '無法獲取家庭列表' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '請輸入家庭名稱' });
    }

    const { data: family, error } = await getClient()
      .from('families')
      .insert({ name: name.trim(), created_by: req.user.id })
      .select()
      .single();

    if (error) throw error;

    await getClient()
      .from('family_members')
      .insert({ family_id: family.id, user_id: req.user.id, role: 'admin' });

    res.status(201).json({ family: { ...family, role: 'admin' } });
  } catch (err) {
    console.error('Create family error:', err);
    res.status(500).json({ error: '建立家庭失敗' });
  }
});

router.post('/:id/join', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: family } = await getClient()
      .from('families')
      .select('id')
      .eq('id', id)
      .single();

    if (!family) {
      return res.status(404).json({ error: '家庭不存在' });
    }

    const { data: existing } = await getClient()
      .from('family_members')
      .select('id')
      .eq('family_id', id)
      .eq('user_id', req.user.id)
      .single();

    if (existing) {
      return res.status(400).json({ error: '你已經是此家庭的成員' });
    }

    await getClient()
      .from('family_members')
      .insert({ family_id: id, user_id: req.user.id, role: 'member' });

    res.json({ message: '成功加入家庭' });
  } catch (err) {
    console.error('Join family error:', err);
    res.status(500).json({ error: '加入家庭失敗' });
  }
});

router.get('/:id/members', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: membership } = await getClient()
      .from('family_members')
      .select('role')
      .eq('family_id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!membership) {
      return res.status(403).json({ error: '你不是此家庭的成員' });
    }

    const { data: members, error } = await getClient()
      .from('family_members')
      .select('id, role, joined_at, users:user_id(id, email, name)')
      .eq('family_id', id);

    if (error) throw error;

    const result = members.map(m => ({
      id: m.id,
      role: m.role,
      joined_at: m.joined_at,
      user: m.users
    }));

    res.json({ members: result });
  } catch (err) {
    console.error('Get members error:', err);
    res.status(500).json({ error: '無法獲取成員列表' });
  }
});

router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const { id, userId } = req.params;

    const { data: membership } = await getClient()
      .from('family_members')
      .select('role')
      .eq('family_id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: '只有管理員可以移除成員' });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ error: '管理員不能移除自己，請先轉讓管理員權限' });
    }

    await getClient()
      .from('family_members')
      .delete()
      .eq('family_id', id)
      .eq('user_id', userId);

    res.json({ message: '成員已移除' });
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ error: '移除成員失敗' });
  }
});

module.exports = router;
