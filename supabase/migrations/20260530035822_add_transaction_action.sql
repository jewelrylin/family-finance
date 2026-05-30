ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS action TEXT DEFAULT 'buy';

UPDATE transactions SET action = 'buy' WHERE action IS NULL OR action = '';
