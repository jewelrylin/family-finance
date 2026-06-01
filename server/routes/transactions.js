const express = require('express');
const { getClient } = require('../db');
const auth = require('../middleware/auth');
const { encryptTransactionFields, decryptTransactionFields } = require('../crypto');

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

    // 把 deposit 映射回 savings 給前端、敏感欄位解密
    const transactions = (data || []).map(row => {
      const t = decryptTransactionFields(row);
      return {
        ...t,
        type: t.type === 'deposit' ? 'savings' : t.type,
        description: t.note || '',
        note: undefined
      };
    });

    res.json({ transactions });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ error: '無法獲取交易記錄' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { family_id, type, amount, category, description, date, recurring, recurring_freq, name, ticker, shares, currency, action } = req.body;
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

    const insertRow = encryptTransactionFields({
      user_id: req.user.id,
      family_id,
      type: dbType,
      name: name || '',
      amount: parseFloat(amount),
      category: category || '',
      note: description || '',
      date: date || new Date().toISOString().split('T')[0],
      recurring: !!recurring,
      recurring_freq: recurring ? (recurring_freq || 'monthly') : '',
      ticker: dbType === 'investment' ? (ticker || '').trim().toUpperCase() : '',
      shares: dbType === 'investment' && shares !== '' && shares != null ? parseFloat(shares) : null,
      currency: dbType === 'investment' ? (currency || 'TWD').toUpperCase() : 'TWD',
      action: dbType === 'investment' ? (action === 'sell' ? 'sell' : 'buy') : 'buy'
    });

    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert(insertRow)
      .select()
      .single();

    if (error) {
      if (error.message.includes('row-level security')) {
        return res.status(500).json({ error: '資料庫權限不足，請在 Supabase 關閉 transactions 表的 RLS' });
      }
      throw error;
    }

    const decTx = decryptTransactionFields(transaction);
    res.status(201).json({
      transaction: {
        ...decTx,
        type: decTx.type === 'deposit' ? 'savings' : decTx.type,
        description: decTx.note || ''
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
    const { amount, category, description, date, type, recurring, recurring_freq, name, ticker, shares, currency, action } = req.body;

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
    if (ticker !== undefined) updates.ticker = (ticker || '').trim().toUpperCase();
    if (shares !== undefined) updates.shares = shares === '' || shares == null ? null : parseFloat(shares);
    if (currency !== undefined) updates.currency = (currency || 'TWD').toUpperCase();
    if (action !== undefined) updates.action = action === 'sell' ? 'sell' : 'buy';

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: '沒有要更新的欄位' });
    }

    const encryptedUpdates = encryptTransactionFields(updates);

    const { data: updated, error } = await supabase
      .from('transactions')
      .update(encryptedUpdates)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    const decUpdated = decryptTransactionFields(updated);
    res.json({
      transaction: {
        ...decUpdated,
        type: decUpdated.type === 'deposit' ? 'savings' : decUpdated.type,
        description: decUpdated.note || ''
      }
    });
  } catch (err) {
    console.error('Update transaction error:', err);
    res.status(500).json({ error: '更新交易失敗' });
  }
});

// 銀行互轉：在同一交易日建立一對配對列（來源 expense + 目的 income），
// 共用 transfer_group_id 以便顯示 / 同步刪除。category 一律標為「轉帳」，
// 讓家庭分析能把這類內部移轉排除掉。
router.post('/transfer', auth, async (req, res) => {
  try {
    const { family_id, from_bank, to_bank, amount, date, description } = req.body;
    if (!family_id || !from_bank || !to_bank || !amount) {
      return res.status(400).json({ error: '請填寫家庭、來源、目的與金額' });
    }
    if (from_bank === to_bank) {
      return res.status(400).json({ error: '來源與目的銀行不能相同' });
    }
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) {
      return res.status(400).json({ error: '金額需大於 0' });
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

    const groupId = require('crypto').randomUUID();
    const txDate = date || new Date().toISOString().split('T')[0];
    const noteOut = description ? `轉至 ${to_bank}：${description}` : `轉至 ${to_bank}`;
    const noteIn = description ? `從 ${from_bank} 轉入：${description}` : `從 ${from_bank} 轉入`;

    const rows = [
      encryptTransactionFields({
        user_id: req.user.id, family_id,
        type: 'expense', name: from_bank, amount: value,
        category: '轉帳', note: noteOut, date: txDate,
        recurring: false, recurring_freq: '',
        ticker: '', shares: null, currency: 'TWD', action: 'buy',
        transfer_group_id: groupId
      }),
      encryptTransactionFields({
        user_id: req.user.id, family_id,
        type: 'income', name: to_bank, amount: value,
        category: '轉帳', note: noteIn, date: txDate,
        recurring: false, recurring_freq: '',
        ticker: '', shares: null, currency: 'TWD', action: 'buy',
        transfer_group_id: groupId
      })
    ];

    const { data, error } = await supabase
      .from('transactions')
      .insert(rows)
      .select();
    if (error) {
      console.error('Transfer insert error:', error);
      return res.status(500).json({ error: '建立轉帳失敗', detail: error.message });
    }

    const transactions = (data || []).map(row => {
      const t = decryptTransactionFields(row);
      return {
        ...t,
        type: t.type === 'deposit' ? 'savings' : t.type,
        description: t.note || ''
      };
    });

    res.status(201).json({ transactions, transfer_group_id: groupId });
  } catch (err) {
    console.error('Transfer error:', err);
    res.status(500).json({ error: '建立轉帳失敗' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const supabase = getClient();

    const { data: transaction } = await supabase
      .from('transactions')
      .select('id, transfer_group_id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!transaction) {
      return res.status(404).json({ error: '交易記錄不存在' });
    }

    // 轉帳配對連動刪除：刪一邊就把另一邊也刪掉
    if (transaction.transfer_group_id) {
      await supabase
        .from('transactions')
        .delete()
        .eq('transfer_group_id', transaction.transfer_group_id);
    } else {
      await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
    }

    res.json({ message: '交易已刪除' });
  } catch (err) {
    console.error('Delete transaction error:', err);
    res.status(500).json({ error: '刪除交易失敗' });
  }
});

module.exports = router;
