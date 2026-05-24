const express = require('express');
const jwt = require('jsonwebtoken');
const { db, generateInviteCode } = require('../db');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/create', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: '請輸入家庭名稱' });

    const code = generateInviteCode();
    const family = await db.createFamily(name, code);
    await db.updateUserFamily(family.id, req.user.id);

    const token = jwt.sign(
      { id: req.user.id, email: req.user.email, role: req.user.role, display_name: req.user.display_name, family_id: family.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ family: { id: family.id, name, invite_code: code }, token });
  } catch (err) {
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

router.post('/join', authenticate, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ error: '請輸入邀請碼' });

    const family = await db.getFamilyByInvite(inviteCode);
    if (!family) return res.status(404).json({ error: '邀請碼無效' });

    await db.updateUserFamily(family.id, req.user.id);

    const token = jwt.sign(
      { id: req.user.id, email: req.user.email, role: req.user.role, display_name: req.user.display_name, family_id: family.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ family: { id: family.id, name: family.name, invite_code: family.invite_code }, token });
  } catch (err) {
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

router.get('/my', authenticate, async (req, res) => {
  try {
    const familyId = req.user.family_id;
    if (!familyId) return res.status(404).json({ error: '尚未加入家庭' });

    const family = await db.getFamilyById(familyId);
    if (!family) return res.status(404).json({ error: '家庭不存在' });

    const members = await db.getUsersByFamily(familyId);
    res.json({ id: family.id, name: family.name, invite_code: family.invite_code, members });
  } catch (err) {
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

module.exports = router;
