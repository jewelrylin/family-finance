const { createClient } = require('@supabase/supabase-js');
const path = require('path');

try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (e) {
  // dotenv not available
}

let client = null;

function getClient() {
  if (!client) {
    const url = (process.env.SUPABASE_URL || '').trim();
    // 優先使用 service_role key（可繞過 RLS），否則使用 anon key
    // 清除所有空白字元（換行、空格等），防止 Render 環境變數包含多餘字元
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').replace(/\s+/g, '');

    if (!url || !key) {
      throw new Error('SUPABASE_URL 或 SUPABASE_KEY 未設定');
    }

    client = createClient(url, key, {
      auth: { persistSession: false }
    });
  }
  return client;
}

module.exports = { getClient };
