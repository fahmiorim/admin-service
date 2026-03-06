import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Search, Filter } from 'lucide-react';
import { api } from '../lib/api.js';

function StatusBadge({ code }) {
  const color = code < 300
    ? 'bg-green-100 text-green-700'
    : code < 400
    ? 'bg-blue-100 text-blue-700'
    : code < 500
    ? 'bg-orange-100 text-orange-700'
    : 'bg-red-100 text-red-700';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono font-medium ${color}`}>
      {code}
    </span>
  );
}

const METHOD_COLOR = {
  GET: 'text-blue-600',
  POST: 'text-green-600',
  PUT: 'text-yellow-600',
  DELETE: 'text-red-600',
  PATCH: 'text-purple-600'
};

const DAYS_OPTIONS = [
  { value: 1, label: '1 Hari' },
  { value: 7, label: '7 Hari' },
  { value: 14, label: '14 Hari' },
  { value: 30, label: '30 Hari' }
];

export default function ActivityLog() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clients, setClients] = useState([]);
  const [clientFilter, setClientFilter] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsRes, clientsRes] = await Promise.all([
        api.getLogs({ days, limit: 200, ...(clientFilter && { clientId: clientFilter }) }),
        api.listClients()
      ]);
      setLogs(logsRes.data.data || []);
      setClients(clientsRes.data.data || []);
    } catch (err) {
      if (err.response?.status === 401) { localStorage.removeItem('adminKey'); navigate('/login'); }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [days, clientFilter]);

  const filtered = logs.filter(log => {
    const matchSearch = !search ||
      log.endpoint?.toLowerCase().includes(search.toLowerCase()) ||
      log.clientName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter ||
      (statusFilter === '2xx' && log.status_code >= 200 && log.status_code < 300) ||
      (statusFilter === '4xx' && log.status_code >= 400 && log.status_code < 500) ||
      (statusFilter === '5xx' && log.status_code >= 500);
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">Riwayat semua request API</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50"
        >
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
            placeholder="Cari endpoint atau client..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <select
          value={clientFilter}
          onChange={e => setClientFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Semua Client</option>
          {clients.map(c => (
            <option key={c.clientId} value={c.clientId}>{c.name}</option>
          ))}
        </select>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {[{ v: '', l: 'All' }, { v: '2xx', l: '2xx' }, { v: '4xx', l: '4xx' }, { v: '5xx', l: '5xx' }].map(({ v, l }) => (
            <button
              key={v}
              onClick={() => setStatusFilter(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {DAYS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                days === opt.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Waktu</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Client</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Method</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Endpoint</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400 text-sm">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    <Filter className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Belum ada log. Data akan muncul setelah ada API request masuk dari client.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((log, i) => (
                  <tr key={log.id || i} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('id-ID', {
                        day: '2-digit', month: 'short',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm font-medium text-gray-700">{log.clientName}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-bold ${METHOD_COLOR[log.method] || 'text-gray-500'}`}>
                        {log.method || 'GET'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-gray-600">{log.endpoint}</span>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge code={log.status_code} />
                    </td>
                  </tr>
                ))
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
