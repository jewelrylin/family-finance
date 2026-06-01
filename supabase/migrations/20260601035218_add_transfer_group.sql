ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS transfer_group_id UUID;

CREATE INDEX IF NOT EXISTS idx_transactions_transfer_group
  ON transactions(transfer_group_id) WHERE transfer_group_id IS NOT NULL;
