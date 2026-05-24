const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_KEY environment variables are required');
}

const supabase = createClient(supabaseUrl, supabaseKey);

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    password_hash: row.password_hash,
    role: row.role,
    family_id: row.family_id,
    created_at: row.created_at,
  };
}

const db = {
  async createFamily(name, code) {
    const { data, error } = await supabase.from('families').insert({ name, invite_code: code }).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async getFamilyByInvite(code) {
    const { data } = await supabase.from('families').select('*').eq('invite_code', code).single();
    return data || null;
  },

  async getFamilyById(id) {
    const { data } = await supabase.from('families').select('*').eq('id', id).single();
    return data || null;
  },

  async createUser(email, passwordHash, displayName, role, familyId) {
    const { data, error } = await supabase.from('users').insert({
      email,
      password_hash: passwordHash,
      display_name: displayName,
      role,
      family_id: familyId,
    }).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async getUserByEmail(email) {
    const { data } = await supabase.from('users').select('*').eq('email', email).single();
    return mapUser(data);
  },

  async getUserById(id) {
    const { data } = await supabase.from('users').select('*').eq('id', id).single();
    return mapUser(data);
  },

  async getAllUsers() {
    const { data } = await supabase.from('users').select('id, email, display_name, role, family_id, created_at').order('created_at', { ascending: false });
    return data || [];
  },

  async updateUserPassword(hash, id) {
    const { error } = await supabase.from('users').update({ password_hash: hash }).eq('id', id);
    if (error) throw new Error(error.message);
  },

  async updateUserFamily(familyId, userId) {
    const { error } = await supabase.from('users').update({ family_id: familyId }).eq('id', userId);
    if (error) throw new Error(error.message);
  },

  async getUsersByFamily(familyId) {
    const { data } = await supabase.from('users').select('id, email, display_name').eq('family_id', familyId);
    return data || [];
  },

  async createTransaction(userId, familyId, type, category, amount, note, date) {
    const { data, error } = await supabase.from('transactions').insert({
      user_id: userId, family_id: familyId, type, category, amount, note, date,
    }).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async getTransactionsByFamily(familyId) {
    const { data } = await supabase
      .from('transactions')
      .select('*, users(display_name)')
      .eq('family_id', familyId)
      .order('date', { ascending: false });
    return (data || []).map(t => ({ ...t, display_name: t.users?.display_name || '' }));
  },

  async getTransactionsByFamilyAndType(familyId, type) {
    const { data } = await supabase
      .from('transactions')
      .select('*, users(display_name)')
      .eq('family_id', familyId)
      .eq('type', type)
      .order('date', { ascending: false });
    return (data || []).map(t => ({ ...t, display_name: t.users?.display_name || '' }));
  },

  async getTransactionsByUserAndType(userId, type) {
    const { data } = await supabase
      .from('transactions')
      .select('*, users(display_name)')
      .eq('user_id', userId)
      .eq('type', type)
      .order('date', { ascending: false });
    return (data || []).map(t => ({ ...t, display_name: t.users?.display_name || '' }));
  },

  async updateTransaction(category, amount, note, date, id, familyId) {
    const { error } = await supabase.from('transactions').update({ category, amount, note, date }).eq('id', id).eq('family_id', familyId);
    if (error) throw new Error(error.message);
  },

  async deleteTransaction(id, familyId) {
    const { error } = await supabase.from('transactions').delete().eq('id', id).eq('family_id', familyId);
    if (error) throw new Error(error.message);
  },
};

module.exports = db;
