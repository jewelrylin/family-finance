-- 在 Supabase SQL Editor 執行此腳本建立資料表

CREATE TABLE IF NOT EXISTS families (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT DEFAULT '',
  role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
  family_id BIGINT REFERENCES families(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  family_id BIGINT NOT NULL REFERENCES families(id),
  type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'investment', 'deposit')),
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  note TEXT DEFAULT '',
  asset_name TEXT DEFAULT '',
  quantity REAL DEFAULT 0,
  unit_price REAL DEFAULT 0,
  fee REAL DEFAULT 0,
  tx_type TEXT DEFAULT 'buy' CHECK(tx_type IN ('buy', 'sell', 'dividend')),
  current_price REAL DEFAULT 0,
  bank TEXT DEFAULT '',
  recurring BOOLEAN DEFAULT FALSE,
  recurring_freq TEXT DEFAULT '',
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_family ON users(family_id);
CREATE INDEX IF NOT EXISTS idx_transactions_family ON transactions(family_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

-- 建立預設管理員（密碼: admin123）
-- 注意：需先在應用程式啟動時由 seedAdmin() 建立，或手動插入
-- INSERT INTO users (email, password_hash, display_name, role)
-- VALUES ('admin@familyfinance.com', '$2a$10$...hash...', '管理員', 'admin');
