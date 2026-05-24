const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, generateInviteCode } = require('../db');
const { authenticate, adminOnly, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName, inviteCode } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email 和密碼為必填' });
    }

    const existing = await db.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: '此 Email 已被註冊' });
    }

    const hash = bcrypt.hashSync(password, 10);
    let familyId = null;

    if (inviteCode) {
      const family = await db.getFamilyByInvite(inviteCode);
      if (!family) return res.status(400).json({ error: '邀請碼無效' });
      familyId = family.id;
    }

    const user = await db.createUser(email, hash, displayName || email.split('@')[0], 'user', familyId);
    const token = jwt.sign({ id: user.id, email, role: 'user', family_id: familyId, display_name: displayName || email.split('@')[0] }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { id: user.id, email, display_name: displayName || email.split('@')[0], role: 'user', family_id: familyId }
    });
  } catch (err) {
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email 和密碼為必填' });
    }

    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Email 或密碼錯誤' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Email 或密碼錯誤' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, family_id: user.family_id, display_name: user.display_name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, display_name: user.display_name, role: user.role, family_id: user.family_id }
    });
  } catch (err) {
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  const user = await db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: '使用者不存在' });
  res.json({ id: user.id, email: user.email, display_name: user.display_name, role: user.role, family_id: user.family_id });
});

router.get('/users', authenticate, adminOnly, async (req, res) => {
  const users = await db.getAllUsers();
  res.json(users);
});

router.put('/reset-password/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: '密碼至少需要4個字元' });
    }
    const hash = bcrypt.hashSync(newPassword, 10);
    await db.updateUserPassword(hash, id);
    res.json({ message: '密碼已重設' });
  } catch (err) {
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

module.exports = router;
