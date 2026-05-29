const express = require('express');
const { getClient } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

const VALID_TYPES = ['income', 'expense', 'investment', 'deposit'];
const TYPE_MAP = { savings: 'deposit' };

function normalizeType(type) {
  return TYPE_MAP[type] || type;
}

router.get('/', auth, async (req, res) => {
  try {
    const supabase = getClient();
    const { family_id, type } = req.query;

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (family_id) query = query.eq('family_id', family_id);
    if (type) query = query.eq('type', normalizeType(type));

    const { data, error } = await query;
    if (error) throw error;

    // 把 deposit 映射回 savings 給前端
    const transactions = (data || []).map(t => ({
      ...t,
      type: t.type === 'deposit' ? 'savings' : t.type,
      description: t.note || '',
      note: undefined
    }));

    res.json({ transactions });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ error: '無法獲取交易記錄' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { family_id, type, amount, category, description, date, recurring, recurring_freq, name } = req.body;
    const dbType = normalizeType(type);

    if (!family_id || !type || !amount) {
      return res.status(400).json({ error: '請填寫必填欄位' });
    }

    if (!VALID_TYPES.includes(dbType)) {
      return res.status(400).json({ error: '無效的交易類型' });
    }

    const supabase = getClient();

    const { data: user } = await supabase
      .from('users')
      .select('family_id')
      .eq('id', req.user.id)
      .maybeSingle();

    if (!user || String(user.family_id) !== String(family_id)) {
      return res.status(403).json({ error: '你不是此家庭的成員' });
    }

    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        user_id: req.user.id,
        family_id,
        type: dbType,
        name: name || '',
        amount: parseFloat(amount),
        category: category || '',
        note: description || '',
        date: date || new Date().toISOString().split('T')[0],
        recurring: !!recurring,
        recurring_freq: recurring ? (recurring_freq || 'monthly') : ''
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes('row-level security')) {
        return res.status(500).json({ error: '資料庫權限不足，請在 Supabase 關閉 transactions 表的 RLS' });
      }
      throw error;
    }

    res.status(201).json({
      transaction: {
        ...transaction,
        type: transaction.type === 'deposit' ? 'savings' : transaction.type,
        description: transaction.note || ''
      }
    });
  } catch (err) {
    console.error('Create transaction error:', err);
    res.status(500).json({ error: '新增交易失敗' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, category, description, date, type, recurring, recurring_freq, name } = req.body;

    const supabase = getClient();

    const { data: transaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!transaction) {
      return res.status(404).json({ error: '交易記錄不存在' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (amount !== undefined) updates.amount = parseFloat(amount);
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.note = description;
    if (date !== undefined) updates.date = date;
    if (type !== undefined) updates.type = normalizeType(type);
    if (recurring !== undefined) {
      updates.recurring = !!recurring;
      updates.recurring_freq = recurring ? (recurring_freq || 'monthly') : '';
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: '沒有要更新的欄位' });
    }

    const { data: updated, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      transaction: {
        ...updated,
        type: updated.type === 'deposit' ? 'savings' : updated.type,
        description: updated.note || ''
      }
    });
  } catch (err) {
    console.error('Update transaction error:', err);
    res.status(500).json({ error: '更新交易失敗' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const supabase = getClient();

    const { data: transaction } = await supabase
      .from('transactions')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!transaction) {
      return res.status(404).json({ error: '交易記錄不存在' });
    }

    await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    res.json({ message: '交易已刪除' });
  } catch (err) {
    console.error('Delete transaction error:', err);
    res.status(500).json({ error: '刪除交易失敗' });
  }
});

module.exports = router;
