const express = require('express');
const cors = require('cors');
const path = require('path');

try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (e) {
  // dotenv not available, use system env vars
}

const authRoutes = require('./routes/auth');
const familyRoutes = require('./routes/families');
const transactionRoutes = require('./routes/transactions');
const analysisRoutes = require('./routes/analysis');
const pricesRoutes = require('./routes/prices');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/families', familyRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/prices', pricesRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    supabase: process.env.SUPABASE_URL ? 'set' : 'missing',
    serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing'
  });
});

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: '伺服器錯誤' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Supabase: ${process.env.SUPABASE_URL ? 'configured' : 'NOT SET'}`);
  console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? 'configured' : 'NOT SET'}`);
});
