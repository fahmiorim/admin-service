import { config } from '../config/index.js';
import logger from '../utils/logger.js';
import adminSupabase from '../database/supabase.js';

export const adminAuth = async (req, res, next) => {
  const key = req.headers['x-api-key'] || req.query.api_key;

  if (!key) {
    return res.status(401).json({ success: false, message: 'Admin API key required' });
  }

  if (key === config.adminApiKey) {
    req.admin = { clientId: 'admin_client', name: 'Administrator', role: 'admin' };
    return next();
  }

  // Also check DB for admin role
  const client = await adminSupabase.findClientByApiKey(key);
  if (client && client.role === 'admin') {
    req.admin = { clientId: client.client_id, name: client.name, role: 'admin' };
    logger.info('Admin authenticated', { clientId: client.client_id, requestId: req.id });
    return next();
  }

  return res.status(401).json({ success: false, message: 'Invalid or non-admin API key' });
};

export const requestId = (req, res, next) => {
  req.id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  next();
};
