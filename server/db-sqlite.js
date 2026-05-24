const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'finance.db');
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const conn = new Database(dbPath);
conn.pragma('journal_mode = WAL');
conn.pragma('foreign_keys = ON');

conn.exec(`
  CREATE TABLE IF NOT EXISTS families (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT DEFAULT '',
    role TEXT DEFAULT 'user' CHECK(role IN ('user','admin')),
    family_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES families(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    family_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('income','expense','investment')),
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    note TEXT DEFAULT '',
    asset_name TEXT DEFAULT '',
    quantity REAL DEFAULT 0,
    unit_price REAL DEFAULT 0,
    fee REAL DEFAULT 0,
    tx_type TEXT DEFAULT 'buy' CHECK(tx_type IN ('buy','sell','dividend')),
    current_price REAL DEFAULT 0,
    date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (family_id) REFERENCES families(id)
  );
`);

const s = {
  createFamily: conn.prepare('INSERT INTO families (name, invite_code) VALUES (?, ?)'),
  getFamilyByInvite: conn.prepare('SELECT * FROM families WHERE invite_code = ?'),
  getFamilyById: conn.prepare('SELECT * FROM families WHERE id = ?'),
  createUser: conn.prepare('INSERT INTO users (email, password_hash, display_name, role, family_id) VALUES (?, ?, ?, ?, ?)'),
  getUserByEmail: conn.prepare('SELECT * FROM users WHERE email = ?'),
  getUserById: conn.prepare('SELECT * FROM users WHERE id = ?'),
  getAllUsers: conn.prepare('SELECT id, email, display_name, role, family_id, created_at FROM users ORDER BY created_at DESC'),
  updateUserPassword: conn.prepare('UPDATE users SET password_hash = ? WHERE id = ?'),
  updateUserFamily: conn.prepare('UPDATE users SET family_id = ? WHERE id = ?'),
  getUsersByFamily: conn.prepare('SELECT id, email, display_name FROM users WHERE family_id = ?'),
  createTransaction: conn.prepare('INSERT INTO transactions (user_id, family_id, type, category, amount, note, asset_name, quantity, unit_price, fee, tx_type, current_price, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
  getTransactionsByFamily: conn.prepare('SELECT t.*, u.display_name FROM transactions t JOIN users u ON t.user_id = u.id WHERE t.family_id = ? ORDER BY t.date DESC, t.created_at DESC'),
  getTransactionsByFamilyAndType: conn.prepare('SELECT t.*, u.display_name FROM transactions t JOIN users u ON t.user_id = u.id WHERE t.family_id = ? AND t.type = ? ORDER BY t.date DESC, t.created_at DESC'),
  getTransactionsByUserAndType: conn.prepare('SELECT t.*, u.display_name FROM transactions t JOIN users u ON t.user_id = u.id WHERE t.user_id = ? AND t.type = ? ORDER BY t.date DESC, t.created_at DESC'),
  updateTransaction: conn.prepare('UPDATE transactions SET category = ?, amount = ?, note = ?, asset_name = ?, quantity = ?, unit_price = ?, fee = ?, tx_type = ?, current_price = ?, date = ? WHERE id = ? AND family_id = ?'),
  deleteTransaction: conn.prepare('DELETE FROM transactions WHERE id = ? AND family_id = ?'),
};

module.exports = {
  createFamily: (name, code) => { const r = s.createFamily.run(name, code); return { id: r.lastInsertRowid, name, invite_code: code }; },
  getFamilyByInvite: (code) => s.getFamilyByInvite.get(code),
  getFamilyById: (id) => s.getFamilyById.get(id),
  createUser: (email, hash, displayName, role, familyId) => { const r = s.createUser.run(email, hash, displayName, role, familyId); return { id: r.lastInsertRowid }; },
  getUserByEmail: (email) => s.getUserByEmail.get(email),
  getUserById: (id) => s.getUserById.get(id),
  getAllUsers: () => s.getAllUsers.all(),
  updateUserPassword: (hash, id) => s.updateUserPassword.run(hash, id),
  updateUserFamily: (familyId, userId) => s.updateUserFamily.run(familyId, userId),
  getUsersByFamily: (familyId) => s.getUsersByFamily.all(familyId),
  createTransaction: (userId, familyId, type, category, amount, note, assetName, quantity, unitPrice, fee, txType, currentPrice, date) => { const r = s.createTransaction.run(userId, familyId, type, category, amount, note, assetName||'', quantity||0, unitPrice||0, fee||0, txType||'buy', currentPrice||0, date); return { id: r.lastInsertRowid }; },
  getTransactionsByFamily: (familyId) => s.getTransactionsByFamily.all(familyId),
  getTransactionsByFamilyAndType: (familyId, type) => s.getTransactionsByFamilyAndType.all(familyId, type),
  getTransactionsByUserAndType: (userId, type) => s.getTransactionsByUserAndType.all(userId, type),
  updateTransaction: (category, amount, note, assetName, quantity, unitPrice, fee, txType, currentPrice, date, id, familyId) => s.updateTransaction.run(category, amount, note, assetName||'', quantity||0, unitPrice||0, fee||0, txType||'buy', currentPrice||0, date, id, familyId),
  deleteTransaction: (id, familyId) => s.deleteTransaction.run(id, familyId),
};
