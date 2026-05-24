const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');

const authRoutes = require('../../routes/auth');
const transactionRoutes = require('../../routes/transactions');
const familyRoutes = require('../../routes/families');
const priceRoutes = require('../../routes/prices');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/families', familyRoutes);
app.use('/api/prices', priceRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: '伺服器錯誤' });
});

exports.handler = serverless(app, {
  request: function(request, event, context) {
    const prefix = '/.netlify/functions/api';
    if (request.url.startsWith(prefix)) {
      request.url = request.url.substring(prefix.length);
    }
  }
});
