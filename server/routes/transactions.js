const express = require('express');
const supabase = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { family_id, type, start_date, end_date } = req.query;
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (family_id) query = query.eq('family_id', family_id);
    if (type) query = query.eq('type', type);
    if (start_date) query = query.gte('date', start_date);
    if (end_date) query = query.lte('date', end_date);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ transactions: data });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ error: '無法獲取交易記錄' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { family_id, type, amount, category, description, date } = req.body;

    if (!family_id || !type || !amount) {
      return res.status(400).json({ error: '請填寫必填欄位' });
    }

    if (!['income', 'expense', 'investment', 'savings'].includes(type)) {
      return res.status(400).json({ error: '無效的交易類型' });
    }

    const { data: membership } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_id', family_id)
      .eq('user_id', req.user.id)
      .single();

    if (!membership) {
      return res.status(403).json({ error: '你不是此家庭的成員' });
    }

    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        user_id: req.user.id,
        family_id,
        type,
        amount: parseFloat(amount),
        category: category || '',
        description: description || '',
        date: date || new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ transaction });
  } catch (err) {
    console.error('Create transaction error:', err);
    res.status(500).json({ error: '新增交易失敗' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, category, description, date, type } = req.body;

    const { data: transaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!transaction) {
      return res.status(404).json({ error: '交易記錄不存在' });
    }

    const updates = {};
    if (amount !== undefined) updates.amount = parseFloat(amount);
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description;
    if (date !== undefined) updates.date = date;
    if (type !== undefined) updates.type = type;

    const { data: updated, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ transaction: updated });
  } catch (err) {
    console.error('Update transaction error:', err);
    res.status(500).json({ error: '更新交易失敗' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: transaction } = await supabase
      .from('transactions')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

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
