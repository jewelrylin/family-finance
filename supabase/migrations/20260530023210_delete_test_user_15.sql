-- 一次性：刪除測試帳號 t1779890850279@t.com (id=15)
-- 該帳號的 transactions 會一起被刪除（依賴的 FK 為 ON DELETE CASCADE）
-- family_id=9 為該帳號專用測試家庭，沒有其他成員，一併移除
DELETE FROM transactions WHERE user_id = 15;
DELETE FROM users WHERE id = 15;
DELETE FROM families WHERE id = 9 AND NOT EXISTS (SELECT 1 FROM users WHERE family_id = 9);
