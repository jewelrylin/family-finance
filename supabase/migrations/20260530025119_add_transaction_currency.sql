ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TWD';

UPDATE transactions SET currency = 'TWD' WHERE currency IS NULL OR currency = '';
