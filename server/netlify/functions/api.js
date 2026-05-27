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

app.use('/auth', authRoutes);
app.use('/transactions', transactionRoutes);
app.use('/families', familyRoutes);
app.use('/prices', priceRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: '伺服器錯誤' });
});

const handler = serverless(app);

exports.handler = async (event, context) => {
  return handler(event, context);
};
