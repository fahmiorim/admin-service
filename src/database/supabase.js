import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

class AdminSupabaseService {
  constructor() {
    this.supabase = createClient(config.database.url, config.database.key);
    this.isConnected = false;
    this.init();
  }

  async init() {
    try {
      const { error } = await this.supabase.from('api_clients').select('count').limit(1);
      if (error) {
        logger.warn('Supabase init warning:', error.message);
      } else {
        this.isConnected = true;
        logger.info('Admin service connected to Supabase');
      }
    } catch (error) {
      logger.error('Failed to connect to Supabase:', error.message);
    }
  }

  isReady() { return this.isConnected; }

  // ─── API Clients ───────────────────────────────────────────────────────────

  async findClientByApiKey(apiKey) {
    try {
      const { data, error } = await this.supabase
        .from('api_clients').select('*').eq('api_key', apiKey).eq('is_active', true).single();
      if (error) return null;
      if (data.expires_at && new Date() > new Date(data.expires_at)) return null;
      return data;
    } catch { return null; }
  }

  async listClients({ limit = 20, offset = 0, search } = {}) {
    try {
      let q = this.supabase.from('api_clients').select('*', { count: 'exact' });
      if (search) q = q.ilike('name', `%${search}%`);
      q = q.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
      const { data, error, count } = await q;
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    } catch (error) {
      logger.error('Error listing clients:', error.message);
      return { data: [], count: 0 };
    }
  }

  async createClient(clientData) {
    try {
      const { data, error } = await this.supabase
        .from('api_clients').insert([clientData]).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating client:', error.message);
      throw error;
    }
  }

  async updateClient(clientId, updates) {
    try {
      const { data, error } = await this.supabase
        .from('api_clients').update(updates).eq('client_id', clientId).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating client:', error.message);
      throw error;
    }
  }

  async deleteClient(clientId) {
    try {
      const { error } = await this.supabase.from('api_clients').delete().eq('client_id', clientId);
      if (error) throw error;
      return true;
    } catch (error) {
      logger.error('Error deleting client:', error.message);
      throw error;
    }
  }

  async getClientById(clientId) {
    try {
      const { data, error } = await this.supabase
        .from('api_clients').select('*').eq('client_id', clientId).single();
      if (error) return null;
      return data;
    } catch { return null; }
  }

  // ─── Contents ─────────────────────────────────────────────────────────────

  async upsertContents(items) {
    if (!items || items.length === 0) return 0;
    try {
      const rows = items.map(item => ({
        platform: item.platform,
        external_id: item.external_id,
        title: item.title,
        description: item.description,
        cover_url: item.cover_url,
        episode_count: item.episode_count || 0,
        genres: item.genres || [],
        metadata: item.metadata || {},
        last_synced_at: new Date().toISOString()
      }));
      const { error } = await this.supabase.from('contents').upsert(rows, { onConflict: 'platform,external_id' });
      if (error) throw error;
      return rows.length;
    } catch (error) {
      logger.error('Error upserting contents:', error.message);
      return 0;
    }
  }

  async searchContents({ query, platform, limit = 20, offset = 0 }) {
    try {
      let q = this.supabase.from('contents').select('*', { count: 'exact' });
      if (platform) q = q.eq('platform', platform);
      if (query) q = q.ilike('title', `%${query}%`);
      q = q.order('last_synced_at', { ascending: false }).range(offset, offset + limit - 1);
      const { data, error, count } = await q;
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    } catch (error) {
      logger.error('Error searching contents:', error.message);
      return { data: [], count: 0 };
    }
  }

  async deleteAllContents(platform = null) {
    try {
      let q = this.supabase.from('contents').delete();
      if (platform) {
        q = q.eq('platform', platform);
      } else {
        q = q.neq('id', '00000000-0000-0000-0000-000000000000');
      }
      const { error, count } = await q.select('id');
      if (error) throw error;
      return count || 0;
    } catch (error) {
      logger.error('Error deleting contents:', error.message);
      return 0;
    }
  }

  async getContentsStats() {
    try {
      const { data, error } = await this.supabase.from('contents').select('platform');
      if (error) throw error;
      const stats = {};
      for (const row of data || []) {
        stats[row.platform] = (stats[row.platform] || 0) + 1;
      }
      return stats;
    } catch (error) {
      logger.error('Error getting contents stats:', error.message);
      return {};
    }
  }

  // ─── Sync Logs ────────────────────────────────────────────────────────────

  async startSyncLog(platform) {
    try {
      const { data, error } = await this.supabase
        .from('sync_logs')
        .insert({ platform, status: 'running', started_at: new Date().toISOString() })
        .select('id').single();
      if (error) throw error;
      return data?.id || null;
    } catch (error) {
      logger.warn('Error starting sync log:', error.message);
      return null;
    }
  }

  async finishSyncLog(logId, status, itemsSynced, errorMessage = null) {
    if (!logId) return;
    try {
      await this.supabase.from('sync_logs').update({
        status, items_synced: itemsSynced,
        error_message: errorMessage, finished_at: new Date().toISOString()
      }).eq('id', logId);
    } catch (error) {
      logger.warn('Error finishing sync log:', error.message);
    }
  }

  async getSyncLogs(limit = 20) {
    try {
      const { data, error } = await this.supabase
        .from('sync_logs').select('*').order('started_at', { ascending: false }).limit(limit);
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting sync logs:', error.message);
      return [];
    }
  }

  // ─── Usage Logs ───────────────────────────────────────────────────────────

  async getUsageLogs({ clientId, limit = 50, offset = 0 } = {}) {
    try {
      let q = this.supabase.from('usage_logs').select('*', { count: 'exact' });
      if (clientId) q = q.eq('client_id', clientId);
      q = q.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
      const { data, error, count } = await q;
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    } catch (error) {
      logger.error('Error getting usage logs:', error.message);
      return { data: [], count: 0 };
    }
  }

  async getAnalytics({ days = 7 } = {}) {
    try {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data, error } = await this.supabase
        .from('usage_logs').select('client_id, endpoint, status_code, created_at').gte('created_at', since);
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting analytics:', error.message);
      return [];
    }
  }
}

const adminSupabase = new AdminSupabaseService();
export default adminSupabase;
