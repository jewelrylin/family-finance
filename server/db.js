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
    const url = process.env.SUPABASE_URL;
    // 優先使用 service_role key（可繞過 RLS），否則使用 anon key
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

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
