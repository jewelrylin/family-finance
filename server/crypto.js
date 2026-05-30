// AES-256-GCM 欄位級加密。
//
// 目的：寫進 Supabase 的敏感文字（交易名稱、股票代號、類別、備註）
// 都以密文形式儲存，後端從 env 取金鑰才能解密。
// 即使 DB 整包外洩、Supabase 後台被人登入，看到的也只有亂碼。
//
// 編碼格式：
//   enc:v1:<base64(iv(12B) || authTag(16B) || ciphertext)>
//
// 設計選擇：
// - 若 DATA_ENCRYPTION_KEY 沒設定，encrypt() 直接回明文，decrypt() 也識別
//   明文（沒前綴）→ 直接回傳。這樣首次部署 / 漏設環境變數時系統不會壞。
// - 舊明文資料可以跟新密文並存（decrypt 看前綴判斷）；新寫入一定加密。
// - 同一明文每次加密產出不同密文（IV 隨機），所以查詢 / 分組請務必先
//   decrypt 後在 JS 端做。
const crypto = require('crypto');

const RAW_KEY = (process.env.DATA_ENCRYPTION_KEY || '').replace(/[^a-fA-F0-9]/g, '');
const KEY = RAW_KEY.length === 64 ? Buffer.from(RAW_KEY, 'hex') : null;
const PREFIX = 'enc:v1:';

if (!KEY && process.env.NODE_ENV === 'production') {
  console.warn('[crypto] DATA_ENCRYPTION_KEY 未設定或長度錯誤；資料將以明文寫入！');
}

function isCiphertext(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

function encrypt(plaintext) {
  if (plaintext == null) return plaintext;
  const s = String(plaintext);
  if (s === '' || isCiphertext(s) || !KEY) return s;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([cipher.update(s, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString('base64');
}

function decrypt(value) {
  if (value == null) return value;
  const s = String(value);
  if (!isCiphertext(s)) return s; // 舊明文資料原樣回傳
  if (!KEY) return ''; // 沒金鑰：避免回傳亂碼，給空字串
  try {
    const buf = Buffer.from(s.slice(PREFIX.length), 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ct = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  } catch (e) {
    console.error('[crypto] decrypt failed:', e.message);
    return '';
  }
}

// 對 transaction row 中需要加密的文字欄位批次處理
const ENCRYPTED_FIELDS = ['name', 'ticker', 'category', 'note'];

function encryptTransactionFields(obj) {
  if (!obj) return obj;
  const out = { ...obj };
  for (const f of ENCRYPTED_FIELDS) {
    if (f in out) out[f] = encrypt(out[f]);
  }
  return out;
}

function decryptTransactionFields(obj) {
  if (!obj) return obj;
  const out = { ...obj };
  for (const f of ENCRYPTED_FIELDS) {
    if (f in out) out[f] = decrypt(out[f]);
  }
  return out;
}

module.exports = {
  encrypt,
  decrypt,
  encryptTransactionFields,
  decryptTransactionFields,
  isCiphertext,
  isKeyConfigured: () => Boolean(KEY)
};
