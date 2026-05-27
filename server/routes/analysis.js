const express = require('express');
const { getClient } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/family', auth, async (req, res) => {
  try {
    const supabase = getClient();

    const { data: user } = await supabase
      .from('users')
      .select('family_id, id')
      .eq('id', req.user.id)
      .maybeSingle();

    if (!user?.family_id) {
      return res.json({
        mySummary: { income: 0, expense: 0, investment: 0, savings: 0, total: 0 },
        familySummary: { income: 0, expense: 0, investment: 0, savings: 0, total: 0 },
        categoryBreakdown: { income: [], expense: [], investment: [], savings: [] },
        members: []
      });
    }

    const familyId = user.family_id;

    // 個人交易（含 category 欄位用於分類明細）
    const { data: myTransactions } = await supabase
      .from('transactions')
      .select('type, amount, category')
      .eq('family_id', familyId)
      .eq('user_id', req.user.id);

    const mySummary = { income: 0, expense: 0, investment: 0, savings: 0, total: 0 };
    const myCategories = { income: {}, expense: {}, investment: {}, savings: {} };
    (myTransactions || []).forEach(t => {
      const type = t.type === 'deposit' ? 'savings' : t.type;
      mySummary[type] = (mySummary[type] || 0) + parseFloat(t.amount);
      const cat = t.category || '未分類';
      myCategories[type][cat] = (myCategories[type][cat] || 0) + parseFloat(t.amount);
    });
    mySummary.total = mySummary.income - mySummary.expense + mySummary.investment + mySummary.savings;

    // 家庭全部交易（含 category 欄位）
    const { data: allTransactions } = await supabase
      .from('transactions')
      .select('type, amount, category, user_id')
      .eq('family_id', familyId);

    const familySummary = { income: 0, expense: 0, investment: 0, savings: 0, total: 0 };
    const familyCategories = { income: {}, expense: {}, investment: {}, savings: {} };
    (allTransactions || []).forEach(t => {
      const type = t.type === 'deposit' ? 'savings' : t.type;
      familySummary[type] = (familySummary[type] || 0) + parseFloat(t.amount);
      const cat = t.category || '未分類';
      familyCategories[type][cat] = (familyCategories[type][cat] || 0) + parseFloat(t.amount);
    });
    familySummary.total = familySummary.income - familySummary.expense + familySummary.investment + familySummary.savings;

    // 將分類物件轉為排序陣列
    const toSortedArray = (obj) =>
      Object.entries(obj)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const categoryBreakdown = {
      income: toSortedArray(familyCategories.income),
      expense: toSortedArray(familyCategories.expense),
      investment: toSortedArray(familyCategories.investment),
      savings: toSortedArray(familyCategories.savings)
    };

    // 成員貢獻
    const memberContributions = {};
    (allTransactions || []).forEach(t => {
      const uid = t.user_id;
      if (!memberContributions[uid]) {
        memberContributions[uid] = { income: 0, expense: 0, investment: 0, savings: 0 };
      }
      const type = t.type === 'deposit' ? 'savings' : t.type;
      memberContributions[uid][type] = (memberContributions[uid][type] || 0) + parseFloat(t.amount);
    });

    const memberIds = Object.keys(memberContributions);
    const { data: users } = await supabase
      .from('users')
      .select('id, display_name')
      .in('id', memberIds);

    const userMap = {};
    (users || []).forEach(u => { userMap[u.id] = u.display_name; });

    const members = Object.entries(memberContributions).map(([uid, contrib]) => ({
      user_id: parseInt(uid),
      name: userMap[uid] || '未知',
      ...contrib,
      total: contrib.income - contrib.expense + contrib.investment + contrib.savings
    }));

    res.json({ mySummary, familySummary, categoryBreakdown, members });
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: '無法獲取分析數據' });
  }
});

module.exports = router;
