const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');

let app;

function initializeApp() {
  if (!app) {
    app = express();
    app.use(cors());
    app.use(express.json());

    try {
      const authRoutes = require('../../routes/auth');
      const transactionRoutes = require('../../routes/transactions');
      const familyRoutes = require('../../routes/families');
      const priceRoutes = require('../../routes/prices');

      app.use('/auth', authRoutes);
      app.use('/transactions', transactionRoutes);
      app.use('/families', familyRoutes);
      app.use('/prices', priceRoutes);
    } catch (err) {
      console.error('Failed to load routes:', err);
    }

    app.use((err, req, res, next) => {
      console.error('Error:', err);
      res.status(500).json({ error: '伺服器錯誤' });
    });
  }
  return app;
}

const handler = serverless(initializeApp());

exports.handler = handler;
