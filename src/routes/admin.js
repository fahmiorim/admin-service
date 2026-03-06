import { Router } from 'express';
import { adminAuth } from '../middleware/auth.js';
import {
  adminLogin,
  getAdminStats,
  getAdminAnalytics,
  getAdminLogs,
  getPlans,
  getPlatformHealth,
  listApiClients,
  createApiClient,
  updateApiClient,
  deleteApiClient,
  regenerateApiKey,
  getClientStats,
  getExpiringClients,
  getClientPortalStats,
  triggerSync,
  getSyncStatusController,
  getContents,
  clearContents,
  getAdminConfig
} from '../controllers/admin.controller.js';

const router = Router();

// Public (no auth)
router.post('/login', adminLogin);
router.get('/portal', getClientPortalStats);

// All routes below require admin auth
router.use(adminAuth);

router.get('/stats', getAdminStats);
router.get('/analytics', getAdminAnalytics);
router.get('/logs', getAdminLogs);
router.get('/plans', getPlans);
router.get('/health', getPlatformHealth);
router.get('/expiring', getExpiringClients);
router.get('/config', getAdminConfig);

// Client CRUD
router.get('/clients', listApiClients);
router.post('/clients', createApiClient);
router.put('/clients/:clientId', updateApiClient);
router.delete('/clients/:clientId', deleteApiClient);
router.post('/clients/:clientId/regenerate', regenerateApiKey);
router.get('/clients/:clientId/stats', getClientStats);

// Sync
router.post('/sync', triggerSync);
router.get('/sync/status', getSyncStatusController);
router.get('/contents', getContents);
router.delete('/contents', clearContents);

export default router;
