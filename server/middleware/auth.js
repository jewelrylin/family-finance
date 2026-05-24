const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'family-finance-secret-key-2026';

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供認證令牌' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: '認證令牌無效或已過期' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '僅限管理員操作' });
  }
  next();
}

module.exports = { authenticate, adminOnly, JWT_SECRET };
