import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Shield, Search } from 'lucide-react';
import { api } from '../lib/api.js';

const ACTION_CONFIG = {
  create_client: { label: 'Buat Client', color: 'bg-green-100 text-green-700' },
  update_client: { label: 'Update Client', color: 'bg-blue-100 text-blue-700' },
  delete_client: { label: 'Hapus Client', color: 'bg-red-100 text-red-700' },
  regenerate_key: { label: 'Regenerate Key', color: 'bg-yellow-100 text-yellow-700' },
  clear_cache: { label: 'Clear Cache', color: 'bg-purple-100 text-purple-700' }
};

const DAYS_OPTIONS = [
  { value: 7, label: '7 Hari' },
  { value: 14, label: '14 Hari' },
  { value: 30, label: '30 Hari' }
];

export default function AuditLog() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs({ days, limit: 200 });
      setLogs(res.data.data || []);
    } catch (err) {
      if (err.response?.status === 401) { localStorage.removeItem('adminKey'); navigate('/login'); }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [days]);

  const filtered = logs.filter(log => {
    const matchSearch = !search ||
      log.targetName?.toLowerCase().includes(search.toLowerCase()) ||
      log.target_id?.toLowerCase().includes(search.toLowerCase());
    const matchAction = !actionFilter || log.action === actionFilter;
    return matchSearch && matchAction;
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">Riwayat semua aksi admin</p>
        </div>
        <button onClick={fetchLogs} disabled={loading} className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama client..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Semua Aksi</option>
          {Object.entries(ACTION_CONFIG).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {DAYS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${days === opt.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Waktu</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Aksi</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Target</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-10 text-gray-400 text-sm">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-gray-400">
                    <Shield className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Belum ada audit log. Log akan muncul setelah aksi admin dilakukan.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((log, i) => {
                  const actionCfg = ACTION_CONFIG[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-600' };
                  return (
                    <tr key={log.id || i} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('id-ID', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${actionCfg.color}`}>
                          {actionCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-900">{log.targetName || '—'}</p>
                        {log.target_id !== 'system' && (
                          <p className="text-xs text-gray-400 font-mono">{log.target_id}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">{log.admin_id || 'admin'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
          {filtered.length} dari {logs.length} log
        </div>
      </div>
    </div>
  );
}
