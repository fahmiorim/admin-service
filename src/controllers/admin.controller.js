import crypto from 'crypto';
import axios from 'axios';
import logger from '../utils/logger.js';
import { createSuccessResponse, createErrorResponse } from '../utils/responseHelper.js';
import adminSupabase from '../database/supabase.js';
import { PLANS, getPlanByRateLimit } from '../config/plans.js';
import { runSync, getSyncStatus } from '../services/syncService.js';
import { config } from '../config/index.js';

const generateApiKey = () => 'dk_' + crypto.randomBytes(32).toString('hex');

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const adminLogin = async (req, res, next) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) return res.status(400).json(createErrorResponse('API key is required'));
    if (apiKey !== config.adminApiKey) return res.status(401).json(createErrorResponse('Invalid admin API key'));
    res.json(createSuccessResponse({ apiKey, role: 'admin' }, 'Login successful'));
  } catch (error) { next(error); }
};

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export const getAdminStats = async (req, res, next) => {
  try {
    const { data: clients } = await adminSupabase.listClients({ limit: 1000 });
    const now = new Date();
    const total    = clients.length;
    const active   = clients.filter(c => c.is_active && (!c.expires_at || new Date(c.expires_at) > now)).length;
    const expired  = clients.filter(c => c.expires_at && new Date(c.expires_at) <= now).length;
    const inactive = clients.filter(c => !c.is_active).length;
    const totalRequests = clients.reduce((sum, c) => sum + (c.total_requests || 0), 0);
    const recentClients = [...clients]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map(c => ({ clientId: c.client_id, name: c.name, email: c.email, isActive: c.is_active, totalRequests: c.total_requests || 0, createdAt: c.created_at }));

    res.json(createSuccessResponse({ total, active, expired, inactive, totalRequests, recentClients }, 'Stats retrieved'));
  } catch (error) { next(error); }
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export const getAdminAnalytics = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const logs = await adminSupabase.getAnalytics({ days });

    // Build daily buckets
    const buckets = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { date: key, requests: 0, success: 0, error: 0 };
    }

    let total = 0;
    let successCount = 0;
    const endpointMap = {};

    for (const log of logs) {
      const key = (log.created_at || '').slice(0, 10);
      if (buckets[key]) {
        buckets[key].requests++;
        if ((log.status_code || 200) < 400) { buckets[key].success++; successCount++; }
        else buckets[key].error++;
      }
      total++;
      const ep = log.endpoint || 'unknown';
      endpointMap[ep] = (endpointMap[ep] || 0) + 1;
    }

    const daily = Object.values(buckets);
    const successRate = total > 0 ? Math.round((successCount / total) * 100) : 100;
    const byEndpoint = Object.entries(endpointMap)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json(createSuccessResponse({ total, successRate, daily, byEndpoint }, 'Analytics retrieved'));
  } catch (error) { next(error); }
};

export const getAdminLogs = async (req, res, next) => {
  try {
    const { limit = 100, clientId, offset = 0 } = req.query;
    const { data: logs } = await adminSupabase.getUsageLogs({ clientId, limit: parseInt(limit), offset: parseInt(offset) });
    const { data: clients } = await adminSupabase.listClients({ limit: 1000 });
    const clientMap = Object.fromEntries(clients.map(c => [c.client_id, c.name]));
    res.json(createSuccessResponse(logs.map(l => ({ ...l, clientName: clientMap[l.client_id] || l.client_id })), 'Logs retrieved'));
  } catch (error) { next(error); }
};

// ─── Plans ────────────────────────────────────────────────────────────────────

export const getPlans = (req, res) => {
  res.json(createSuccessResponse(Object.entries(PLANS).map(([key, val]) => ({ key, ...val })), 'Plans retrieved'));
};

// ─── Platform Health ──────────────────────────────────────────────────────────

export const getPlatformHealth = async (req, res, next) => {
  try {
    const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3000';
    const adminKey   = config.adminApiKey;
    const platforms  = [
      { name: 'Dramabox',  endpoint: '/dramabox/latest?pageNo=1&pageSize=1' },
      { name: 'ReelShort', endpoint: '/reelshort/newrelease' },
      { name: 'Melolo',    endpoint: '/melolo/recommendation' },
      { name: 'Dramabite', endpoint: '/dramabite/homepage' }
    ];
    const results = await Promise.allSettled(platforms.map(async (p) => {
      const start = Date.now();
      try {
        await axios.get(`${gatewayUrl}${p.endpoint}`, { headers: { 'x-api-key': adminKey }, timeout: 10000 });
        return { name: p.name, status: 'up', latency: Date.now() - start };
      } catch (err) {
        return { name: p.name, status: err.response ? 'degraded' : 'down', latency: Date.now() - start, error: err.message };
      }
    }));
    res.json(createSuccessResponse(results.map(r => r.value || r.reason), 'Platform health retrieved'));
  } catch (error) { next(error); }
};

// ─── Client Management ────────────────────────────────────────────────────────

export const listApiClients = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, search } = req.query;
    const { data, count } = await adminSupabase.listClients({ limit: parseInt(limit), offset: parseInt(offset), search });
    const masked = data.map(c => ({
      clientId: c.client_id,
      name: c.name,
      email: c.email,
      apiKey: c.api_key?.substring(0, 8) + '...',
      rateLimit: c.rate_limit,
      allowedEndpoints: c.allowed_endpoints,
      isActive: c.is_active,
      expiresAt: c.expires_at,
      createdAt: c.created_at,
      lastUsed: c.last_used,
      totalRequests: c.total_requests,
      plan: getPlanByRateLimit(c.rate_limit || 100)
    }));
    res.json(createSuccessResponse(masked, 'Clients retrieved', { count, limit: parseInt(limit), offset: parseInt(offset) }));
  } catch (error) { next(error); }
};

export const createApiClient = async (req, res, next) => {
  try {
    const { name, email, rateLimit = 100, allowedEndpoints = ['*'], expiresAt } = req.body;
    if (!name || !email) return res.status(400).json(createErrorResponse('Name and email are required'));

    const apiKey   = generateApiKey();
    const clientId = `client_${Date.now()}`;
    const saved    = await adminSupabase.createClient({
      client_id: clientId, api_key: apiKey, name, email,
      rate_limit: rateLimit, allowed_endpoints: allowedEndpoints, is_active: true, role: 'client',
      expires_at: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    });

    logger.info('Client created', { clientId, name });
    res.status(201).json(createSuccessResponse({
      clientId: saved.client_id, name: saved.name, email: saved.email, apiKey: saved.api_key,
      rateLimit: saved.rate_limit, allowedEndpoints: saved.allowed_endpoints, expiresAt: saved.expires_at
    }, 'API client created'));
  } catch (error) { next(error); }
};

export const updateApiClient = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { name, email, rateLimit, allowedEndpoints, isActive, expiresAt } = req.body;
    const updates = {};
    if (name             !== undefined) updates.name              = name;
    if (email            !== undefined) updates.email             = email;
    if (rateLimit        !== undefined) updates.rate_limit        = rateLimit;
    if (allowedEndpoints !== undefined) updates.allowed_endpoints = allowedEndpoints;
    if (isActive         !== undefined) updates.is_active         = isActive;
    if (expiresAt        !== undefined) updates.expires_at        = new Date(expiresAt);

    const updated = await adminSupabase.updateClient(clientId, updates);
    res.json(createSuccessResponse({
      clientId: updated.client_id, name: updated.name, email: updated.email,
      rateLimit: updated.rate_limit, isActive: updated.is_active, expiresAt: updated.expires_at
    }, 'Client updated'));
  } catch (error) { next(error); }
};

export const deleteApiClient = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    await adminSupabase.deleteClient(clientId);
    logger.info('Client deleted', { clientId });
    res.json(createSuccessResponse(null, 'Client deleted'));
  } catch (error) { next(error); }
};

export const regenerateApiKey = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const newApiKey = generateApiKey();
    const updated   = await adminSupabase.updateClient(clientId, { api_key: newApiKey });
    res.json(createSuccessResponse({ clientId: updated.client_id, apiKey: newApiKey }, 'API key regenerated — save this key'));
  } catch (error) { next(error); }
};

export const getClientStats = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const client = await adminSupabase.getClientById(clientId);
    if (!client) return res.status(404).json(createErrorResponse('Client not found'));
    res.json(createSuccessResponse({
      clientId: client.client_id, name: client.name, email: client.email,
      totalRequests: client.total_requests || 0, lastUsed: client.last_used,
      rateLimit: client.rate_limit, isActive: client.is_active,
      expiresAt: client.expires_at, createdAt: client.created_at,
      plan: getPlanByRateLimit(client.rate_limit || 100)
    }, 'Client stats retrieved'));
  } catch (error) { next(error); }
};

export const getExpiringClients = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const threshold = new Date(Date.now() + days * 86400000);
    const now = new Date();
    const { data: clients } = await adminSupabase.listClients({ limit: 1000 });
    const expiring = clients
      .filter(c => c.expires_at && new Date(c.expires_at) > now && new Date(c.expires_at) <= threshold && c.is_active)
      .map(c => ({ clientId: c.client_id, name: c.name, email: c.email, expiresAt: c.expires_at, daysLeft: Math.ceil((new Date(c.expires_at) - now) / 86400000) }))
      .sort((a, b) => a.daysLeft - b.daysLeft);
    res.json(createSuccessResponse(expiring, 'Expiring clients retrieved'));
  } catch (error) { next(error); }
};

// ─── Portal ───────────────────────────────────────────────────────────────────

export const getClientPortalStats = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    if (!apiKey) return res.status(400).json(createErrorResponse('API key required'));
    const client = await adminSupabase.findClientByApiKey(apiKey);
    if (!client) return res.status(401).json(createErrorResponse('Invalid API key'));
    const now     = new Date();
    const expired = client.expires_at && new Date(client.expires_at) <= now;
    const plan    = getPlanByRateLimit(client.rate_limit || 100);
    res.json(createSuccessResponse({
      name: client.name, email: client.email, plan, planName: PLANS[plan]?.name,
      rateLimit: client.rate_limit, isActive: client.is_active, expiresAt: client.expires_at, expired,
      daysLeft: client.expires_at ? Math.max(0, Math.ceil((new Date(client.expires_at) - now) / 86400000)) : null,
      totalRequests: client.total_requests || 0, createdAt: client.created_at, allowedEndpoints: client.allowed_endpoints || ['*']
    }, 'Portal stats retrieved'));
  } catch (error) { next(error); }
};

// ─── Sync ─────────────────────────────────────────────────────────────────────

export const triggerSync = async (req, res, next) => {
  try {
    const { platforms } = req.body;
    const target = Array.isArray(platforms) && platforms.length > 0 ? platforms : ['dramabox', 'reelshort', 'melolo', 'dramabite'];
    if (getSyncStatus().isSyncing) return res.status(409).json(createErrorResponse('Sync already in progress'));
    runSync(target).catch(err => logger.error('Sync error:', err.message));
    res.json(createSuccessResponse({ platforms: target, status: 'started' }, `Sync started for: ${target.join(', ')}`));
  } catch (error) { next(error); }
};

export const getSyncStatusController = async (req, res, next) => {
  try {
    const status = getSyncStatus();
    const logs   = await adminSupabase.getSyncLogs(20);
    const stats  = await adminSupabase.getContentsStats();
    res.json(createSuccessResponse({ ...status, stats, recentLogs: logs }, 'Sync status retrieved'));
  } catch (error) { next(error); }
};

export const getContents = async (req, res, next) => {
  try {
    const { q, platform, limit = '20', offset = '0' } = req.query;
    const { data, count } = await adminSupabase.searchContents({ query: q, platform, limit: Math.min(parseInt(limit), 100), offset: parseInt(offset) });
    res.json(createSuccessResponse(data, 'Contents retrieved', { count, limit: parseInt(limit), offset: parseInt(offset) }));
  } catch (error) { next(error); }
};

export const clearContents = async (req, res, next) => {
  try {
    const { platform } = req.query;
    const VALID = ['dramabox', 'reelshort', 'melolo', 'dramabite'];
    if (platform && !VALID.includes(platform)) {
      return res.status(400).json({ success: false, message: `Platform tidak valid. Gunakan: ${VALID.join(', ')}` });
    }
    const deleted = await adminSupabase.deleteAllContents(platform || null);
    res.json(createSuccessResponse(
      { deleted, platform: platform || 'all' },
      platform ? `${deleted} konten ${platform} dihapus` : `${deleted} konten dihapus`
    ));
  } catch (error) { next(error); }
};

// ─── Config ───────────────────────────────────────────────────────────────────

const INTERNAL_DOCS_PATH = '/ref-drc-x7k2m9q4bz';

export const getAdminConfig = (req, res) => {
  const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3000';
  const docsUrl = `${gatewayUrl}${INTERNAL_DOCS_PATH}?api_key=${config.adminApiKey}`;
  res.json(createSuccessResponse({ internalDocsPath: INTERNAL_DOCS_PATH, docsUrl }, 'Config retrieved'));
};
