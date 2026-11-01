import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';

import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import institutionRoutes from './routes/institutionRoutes.js';
import fdrRoutes from './routes/fdrRoutes.js';
import verificationRoutes from './routes/verificationRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { errorHandler } from './middlewares/errorMiddleware.js';

const app = express();

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Healthcheck API
app.get('/api/health', (req, res) => {
  const isMongoReady = mongoose.connection.readyState === 1;
  res.status(isMongoReady ? 200 : 503).json({
    status: isMongoReady ? 'ONLINE' : 'DEGRADED',
    service: 'AICTE FDR Management Portal API',
    database: {
      status: isMongoReady ? 'CONNECTED' : 'DISCONNECTED',
      storage: isMongoReady ? 'MongoDB' : (process.env.USE_MOCK_STORE === 'true' ? 'MockStore (Testing Mode)' : 'UNAVAILABLE')
    },
    timestamp: new Date().toISOString()
  });
});

// Mandatory Persistent Database Guard:
// Rejects requests with 503 Service Unavailable if MongoDB is not connected,
// unless explicit mock mode (USE_MOCK_STORE=true) is set for automated unit testing.
app.use((req, res, next) => {
  if (req.path.startsWith('/api') && req.path !== '/api/health') {
    if (mongoose.connection.readyState !== 1 && process.env.USE_MOCK_STORE !== 'true') {
      return res.status(503).json({
        success: false,
        message: 'Database unavailable. AICTE FDR Management Portal requires an active persistent MongoDB connection.',
        dataSource: 'None'
      });
    }
  }
  next();
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/fdrs', fdrRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
