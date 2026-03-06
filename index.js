import app from './src/app.js';
import { config } from './src/config/index.js';
import logger from './src/utils/logger.js';
import { runSync, startCronSync, stopCronSync } from './src/services/syncService.js';

const server = app.listen(config.port, () => {
  logger.info(`Dracin Admin Service running on port ${config.port}`);

  // Startup sync (production only)
  if (config.nodeEnv !== 'development') {
    setTimeout(() => {
      runSync().catch(err => logger.error('Initial sync error:', err.message));
    }, 5000);
  }

  // Cron sync every 6 hours
  startCronSync();
});

const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}, shutting down`);
  stopCronSync();
  server.close(() => {
    logger.info('Admin service stopped');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
