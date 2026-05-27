const express = require('express');
const { getClient } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/family/:familyId', auth, async (req, res) => {
  try {
    const { familyId } = req.params;

    const { data: membership } = await getClient()
      .from('family_members')
      .select('role')
      .eq('family_id', familyId)
      .eq('user_id', req.user.id)
      .single();

    if (!membership) {
      return res.status(403).json({ error: '你不是此家庭的成員' });
    }

    // 個人交易明細摘要
    const { data: myTransactions } = await getClient()
      .from('transactions')
      .select('type, amount')
      .eq('family_id', familyId)
      .eq('user_id', req.user.id);

    const mySummary = { income: 0, expense: 0, investment: 0, savings: 0, total: 0 };
    (myTransactions || []).forEach(t => {
      const amt = parseFloat(t.amount);
      mySummary[t.type] = (mySummary[t.type] || 0) + amt;
    });
    mySummary.total = mySummary.income - mySummary.expense + mySummary.investment + mySummary.savings;

    // 家庭總計摘要（只能看總額）
    const { data: allTransactions } = await getClient()
      .from('transactions')
      .select('type, amount, user_id')
      .eq('family_id', familyId);

    const familySummary = { income: 0, expense: 0, investment: 0, savings: 0, total: 0 };
    (allTransactions || []).forEach(t => {
      const amt = parseFloat(t.amount);
      familySummary[t.type] = (familySummary[t.type] || 0) + amt;
    });
    familySummary.total = familySummary.income - familySummary.expense + familySummary.investment + familySummary.savings;

    // 每位成員的貢獻總計（匿名化，只看總額）
    const memberContributions = {};
    (allTransactions || []).forEach(t => {
      const uid = t.user_id;
      if (!memberContributions[uid]) {
        memberContributions[uid] = { income: 0, expense: 0, investment: 0, savings: 0 };
      }
      memberContributions[uid][t.type] = (memberContributions[uid][t.type] || 0) + parseFloat(t.amount);
    });

    // 獲取成員名稱
    const memberIds = Object.keys(memberContributions);
    const { data: users } = await getClient()
      .from('users')
      .select('id, name')
      .in('id', memberIds);

    const userMap = {};
    (users || []).forEach(u => { userMap[u.id] = u.name; });

    const members = Object.entries(memberContributions).map(([uid, contrib]) => ({
      user_id: uid,
      name: userMap[uid] || '未知',
      ...contrib,
      total: contrib.income - contrib.expense + contrib.investment + contrib.savings
    }));

    res.json({
      mySummary,
      familySummary,
      members
    });
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: '無法獲取分析數據' });
  }
});

module.exports = router;
