const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const USE_SUPABASE = !!process.env.SUPABASE_URL;

let db;
if (USE_SUPABASE) {
  db = require('./db-supabase');
} else {
  db = require('./db-sqlite');
}

function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

async function seedAdmin() {
  const admin = await db.getUserByEmail('admin@familyfinance.com');
  if (!admin) {
    const hash = bcrypt.hashSync('admin123', 10);
    await db.createUser('admin@familyfinance.com', hash, '管理員', 'admin', null);
    console.log('Default admin: admin@familyfinance.com / admin123');
  }
}

seedAdmin();

module.exports = { db, generateInviteCode };
