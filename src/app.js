import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config/index.js';
import logger from './utils/logger.js';
import { requestId } from './middleware/auth.js';
import adminRoutes from './routes/admin.js';

const app = express();

app.use(helmet());
app.use(cors(config.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestId);

// Request logging
app.use((req, res, next) => {
  logger.info('Request received', { ip: req.ip, method: req.method, url: req.url, requestId: req.id });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, service: 'dracin-admin-service', status: 'running', timestamp: new Date().toISOString() });
});

// Admin API routes
app.use('/api/admin', adminRoutes);

// Root
app.get('/', (req, res) => {
  res.json({ name: 'Dracin Admin Service', version: '1.0.0', status: 'running' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err.message);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

export default app;
