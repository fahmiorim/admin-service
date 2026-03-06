import axios from 'axios';

const BASE = '/api/admin';

const getHeaders = () => ({
  'x-api-key': localStorage.getItem('adminKey') || ''
});

export const api = {
  login: (apiKey) =>
    axios.post(`${BASE}/login`, { apiKey }),

  getStats: () =>
    axios.get(`${BASE}/stats`, { headers: getHeaders() }),

  listClients: () =>
    axios.get(`${BASE}/clients`, { headers: getHeaders() }),

  createClient: (data) =>
    axios.post(`${BASE}/clients`, data, { headers: getHeaders() }),

  updateClient: (clientId, data) =>
    axios.put(`${BASE}/clients/${clientId}`, data, { headers: getHeaders() }),

  deleteClient: (clientId) =>
    axios.delete(`${BASE}/clients/${clientId}`, { headers: getHeaders() }),

  regenerateKey: (clientId) =>
    axios.post(`${BASE}/clients/${clientId}/regenerate`, {}, { headers: getHeaders() }),

  getClientStats: (clientId) =>
    axios.get(`${BASE}/clients/${clientId}/stats`, { headers: getHeaders() }),

  getAnalytics: (days = 7) =>
    axios.get(`${BASE}/analytics?days=${days}`, { headers: getHeaders() }),

  getLogs: (params = {}) =>
    axios.get(`${BASE}/logs`, { headers: getHeaders(), params }),

  getExpiringClients: (days = 30) =>
    axios.get(`${BASE}/expiring?days=${days}`, { headers: getHeaders() }),

  getPlans: () =>
    axios.get(`${BASE}/plans`, { headers: getHeaders() }),

  getPlatformHealth: () =>
    axios.get(`${BASE}/health`, { headers: getHeaders() }),

  clearCache: () =>
    axios.post(`${BASE}/cache/clear`, {}, { headers: getHeaders() }),

  getRateLimits: () =>
    axios.get(`${BASE}/rate-limits`, { headers: getHeaders() }),

  getAuditLogs: (params = {}) =>
    axios.get(`${BASE}/audit`, { headers: getHeaders(), params }),

  getPortalStats: (apiKey) =>
    axios.get(`${BASE}/portal`, { headers: { 'x-api-key': apiKey } }),

  // Content sync
  triggerSync: (platforms) =>
    axios.post(`${BASE}/sync`, { platforms }, { headers: getHeaders() }),

  getSyncStatus: () =>
    axios.get(`${BASE}/sync/status`, { headers: getHeaders() }),

  getContents: (params = {}) =>
    axios.get(`${BASE}/contents`, { headers: getHeaders(), params }),

  clearContents: (platform) =>
    axios.delete(`${BASE}/contents${platform ? `?platform=${platform}` : ''}`, { headers: getHeaders() }),

  getConfig: () =>
    axios.get(`${BASE}/config`, { headers: getHeaders() })
};
