const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const familyRoutes = require('./routes/families');
const priceRoutes = require('./routes/prices');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/families', familyRoutes);
app.use('/api/prices', priceRoutes);

const clientBuild = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuild));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuild, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: '伺服器錯誤' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (!process.env.SUPABASE_URL) {
    console.log('Using SQLite (local dev)');
  } else {
    console.log('Using Supabase (production)');
  }
});
