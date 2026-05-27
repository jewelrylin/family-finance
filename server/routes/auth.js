const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getClient } = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'family-finance-secret-key-2026';

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: '請填寫所有必填欄位' });
    }

    const supabase = getClient();
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: '此信箱已被註冊' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from('users')
      .insert({ email, password_hash: hashedPassword, display_name: name })
      .select('id, email, display_name, created_at')
      .single();

    if (error) throw error;

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ user: { id: user.id, email: user.email, name: user.display_name }, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: '註冊失敗，請稍後再試' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: '請填寫信箱和密碼' });
    }

    const supabase = getClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ error: '信箱或密碼錯誤' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: '信箱或密碼錯誤' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: { id: user.id, email: user.email, name: user.display_name, role: user.role, family_id: user.family_id },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '登入失敗，請稍後再試' });
  }
});

router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const supabase = getClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, display_name, role, family_id, created_at')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error || !user) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    res.json({ user: { id: user.id, email: user.email, name: user.display_name, role: user.role, family_id: user.family_id } });
  } catch (err) {
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

module.exports = router;
