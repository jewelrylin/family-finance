const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');

const authRoutes = require('../../routes/auth');
const transactionRoutes = require('../../routes/transactions');
const familyRoutes = require('../../routes/families');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/.netlify/functions/api/auth', authRoutes);
app.use('/.netlify/functions/api/transactions', transactionRoutes);
app.use('/.netlify/functions/api/families', familyRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: '伺服器錯誤' });
});

exports.handler = serverless(app);
