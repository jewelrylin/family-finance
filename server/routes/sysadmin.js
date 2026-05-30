// 系統級管理路由。
// 不是「家庭管理員」（family admin），而是「全站管理員」——可以列出所有
// 註冊使用者、重設任何人密碼、刪除任何帳號。
//
// 驗證方式：呼叫者要先 POST /api/sysadmin/auth 帶 master secret（env
// SYSTEM_ADMIN_SECRET）。成功會拿到一個只用於 sysadmin 路徑的短期 JWT。
// 後續每個請求帶該 JWT 才能呼叫管理 API。
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getClient } = require('../db');

const router = express.Router();
const SECRET = (process.env.SYSTEM_ADMIN_SECRET || '').trim();
const JWT_SECRET = process.env.JWT_SECRET || 'family-finance-secret-key-2026';
const TOKEN_TTL = '2h';
const TOKEN_TYPE = 'sysadmin';

function sysadminAuth(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return res.status(401).json({ error: '未提供管理員令牌' });
  try {
    const decoded = jwt.verify(h.slice(7), JWT_SECRET);
    if (decoded.type !== TOKEN_TYPE) return res.status(401).json({ error: '令牌類型錯誤' });
    req.sysadmin = decoded;
    next();
  } catch {
    res.status(401).json({ error: '管理員令牌無效或已過期' });
  }
}

router.post('/auth', async (req, res) => {
  const { secret } = req.body || {};
  if (!SECRET) {
    return res.status(503).json({ error: '伺服器尚未設定 SYSTEM_ADMIN_SECRET' });
  }
  if (!secret || String(secret) !== SECRET) {
    return res.status(401).json({ error: '密碼錯誤' });
  }
  const token = jwt.sign({ type: TOKEN_TYPE }, JWT_SECRET, { expiresIn: TOKEN_TTL });
  res.json({ token, expiresIn: TOKEN_TTL });
});

router.get('/users', sysadminAuth, async (req, res) => {
  try {
    const supabase = getClient();
    const { data, error, count } = await supabase
      .from('users')
      .select('id, email, display_name, role, family_id, created_at', { count: 'exact' })
      .order('id', { ascending: true });
    if (error) throw error;

    // 順便補抓對應家庭名稱
    const familyIds = [...new Set((data || []).map(u => u.family_id).filter(Boolean))];
    let families = {};
    if (familyIds.length) {
      const { data: famData } = await supabase
        .from('families')
        .select('id, name')
        .in('id', familyIds);
      for (const f of famData || []) families[f.id] = f.name;
    }

    const users = (data || []).map(u => ({
      id: u.id,
      email: u.email,
      name: u.display_name,
      role: u.role,
      family_id: u.family_id,
      family_name: u.family_id ? (families[u.family_id] || `#${u.family_id}`) : null,
      created_at: u.created_at
    }));

    res.json({ total: count ?? users.length, users });
  } catch (err) {
    console.error('Sysadmin list users error:', err);
    res.status(500).json({ error: '無法取得使用者列表' });
  }
});

router.post('/users/:id/reset-password', sysadminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: '新密碼至少 6 字' });
    }
    const supabase = getClient();
    const hashed = await bcrypt.hash(String(newPassword), 10);
    const { data, error } = await supabase
      .from('users')
      .update({ password_hash: hashed })
      .eq('id', id)
      .select('id, email')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: '找不到使用者' });
    res.json({ message: '密碼已重設', user: data });
  } catch (err) {
    console.error('Sysadmin reset password error:', err);
    res.status(500).json({ error: '重設密碼失敗', detail: err?.message });
  }
});

router.delete('/users/:id', sysadminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getClient();

    const { data: target } = await supabase
      .from('users')
      .select('id, family_id')
      .eq('id', id)
      .maybeSingle();
    if (!target) return res.status(404).json({ error: '找不到使用者' });

    // 先刪交易避免 FK 阻擋
    const { error: txErr } = await supabase.from('transactions').delete().eq('user_id', id);
    if (txErr) throw txErr;

    const { error: delErr } = await supabase.from('users').delete().eq('id', id);
    if (delErr) throw delErr;

    // 順手清理已無成員的家庭
    if (target.family_id) {
      const { data: remain } = await supabase
        .from('users')
        .select('id')
        .eq('family_id', target.family_id)
        .limit(1);
      if (!remain || remain.length === 0) {
        await supabase.from('families').delete().eq('id', target.family_id);
      }
    }

    res.json({ message: '使用者已刪除' });
  } catch (err) {
    console.error('Sysadmin delete user error:', err);
    res.status(500).json({ error: '刪除失敗', detail: err?.message });
  }
});

module.exports = router;
