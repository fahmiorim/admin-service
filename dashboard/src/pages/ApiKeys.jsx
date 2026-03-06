import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, RefreshCw, Copy, RotateCcw, Pencil, Trash2,
  CheckCircle, XCircle, Clock, Eye, EyeOff, ChevronRight, Loader2, Download
} from 'lucide-react';
import { api } from '../lib/api.js';
import CreateClientModal from '../components/CreateClientModal.jsx';
import EditClientModal from '../components/EditClientModal.jsx';

const PLAN_BADGE = {
  FREE: 'bg-gray-100 text-gray-600',
  BASIC: 'bg-blue-100 text-blue-700',
  PRO: 'bg-purple-100 text-purple-700',
  ENTERPRISE: 'bg-yellow-100 text-yellow-800'
};
function getPlan(rateLimit) {
  if (!rateLimit) return 'FREE';
  if (rateLimit >= 100000) return 'ENTERPRISE';
  if (rateLimit >= 10000) return 'PRO';
  if (rateLimit >= 1000) return 'BASIC';
  return 'FREE';
}

function StatusBadge({ isActive, expiresAt }) {
  const expired = expiresAt && new Date(expiresAt) <= new Date();
  if (expired) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
      <Clock className="w-3 h-3" /> Expired
    </span>
  );
  if (isActive) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <CheckCircle className="w-3 h-3" /> Active
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      <XCircle className="w-3 h-3" /> Inactive
    </span>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1 text-gray-400 hover:text-gray-600" title="Copy">
      {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function ApiKeys() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState('');
  const [newKey, setNewKey] = useState(null);
  const [showKeyMap, setShowKeyMap] = useState({});

  const fetchClients = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.listClients();
      setClients(res.data.data || []);
    } catch (err) {
      if (err.response?.status === 401) { localStorage.removeItem('adminKey'); navigate('/login'); }
      else setError('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const handleDelete = async (clientId, name) => {
    if (!window.confirm(`Delete client "${name}"? This action cannot be undone.`)) return;
    setActionLoading(clientId + '_delete');
    try {
      await api.deleteClient(clientId);
      setClients(prev => prev.filter(c => c.clientId !== clientId));
    } catch { setError('Failed to delete client'); }
    finally { setActionLoading(''); }
  };

  const handleRegenerate = async (clientId) => {
    if (!window.confirm('Regenerate API key? The old key will stop working immediately.')) return;
    setActionLoading(clientId + '_regen');
    try {
      const res = await api.regenerateKey(clientId);
      setNewKey({ clientId, key: res.data.data.apiKey });
    } catch { setError('Failed to regenerate key'); }
    finally { setActionLoading(''); }
  };

  const handleToggleActive = async (client) => {
    setActionLoading(client.clientId + '_toggle');
    try {
      const res = await api.updateClient(client.clientId, { isActive: !client.isActive });
      setClients(prev => prev.map(c => c.clientId === client.clientId ? { ...c, ...res.data.data } : c));
    } catch { setError('Failed to update client'); }
    finally { setActionLoading(''); }
  };

  const handleExportCSV = () => {
    const rows = [['Name', 'Email', 'Plan', 'Rate Limit', 'Status', 'Expires At', 'Total Requests', 'Created At']];
    clients.forEach(c => {
      const expired = c.expiresAt && new Date(c.expiresAt) <= new Date();
      const rateLimit = c.rateLimit || 100;
      const plan = rateLimit >= 100000 ? 'ENTERPRISE' : rateLimit >= 10000 ? 'PRO' : rateLimit >= 1000 ? 'BASIC' : 'FREE';
      rows.push([c.name, c.email, plan, rateLimit, expired ? 'Expired' : c.isActive ? 'Active' : 'Inactive', c.expiresAt || '', c.totalRequests || 0, c.createdAt || '']);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `api-clients-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const now = new Date();
  const filtered = clients.filter(c => {
    const matchSearch = c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
    const expired = c.expiresAt && new Date(c.expiresAt) <= now;
    if (filter === 'active') return matchSearch && c.isActive && !expired;
    if (filter === 'expired') return matchSearch && expired;
    if (filter === 'inactive') return matchSearch && !c.isActive;
    return matchSearch;
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">API Keys</h1>
          <p className="text-sm text-gray-500 mt-0.5">Kelola semua client API</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            disabled={clients.length === 0}
            className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Buat Client Baru
          </button>
        </div>
      </div>

      {/* New key banner */}
      {newKey && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-green-800 mb-1">API Key Baru — Simpan sekarang!</p>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs bg-white px-3 py-1.5 rounded border border-green-200 font-mono">
                  {newKey.key}
                </code>
                <CopyButton text={newKey.key} />
              </div>
            </div>
            <button onClick={() => setNewKey(null)} className="text-green-600 hover:text-green-800 text-xs">Dismiss</button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau email..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {['all', 'active', 'expired', 'inactive'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button onClick={fetchClients} disabled={loading} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Client</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">API Key</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Plan</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Rate Limit</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Expires</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400 text-sm">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400 text-sm">Tidak ada data</td></tr>
              ) : filtered.map(c => {
                const isShowing = showKeyMap[c.clientId];
                return (
                  <tr key={c.clientId} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 font-mono text-xs text-gray-600">
                        <span>{isShowing ? c.apiKey : c.apiKey}</span>
                        <CopyButton text={c.apiKey} />
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${PLAN_BADGE[getPlan(c.rateLimit)]}`}>
                        {getPlan(c.rateLimit)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-gray-700">{c.rateLimit?.toLocaleString()}/15m</span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('id-ID') : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge isActive={c.isActive} expiresAt={c.expiresAt} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/api-keys/${c.clientId}`)}
                          title="Detail"
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditTarget(c)}
                          title="Edit"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRegenerate(c.clientId)}
                          disabled={!!actionLoading}
                          title="Regenerate Key"
                          className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded disabled:opacity-40"
                        >
                          {actionLoading === c.clientId + '_regen'
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <RotateCcw className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(c.clientId, c.name)}
                          disabled={!!actionLoading}
                          title="Delete"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-40"
                        >
                          {actionLoading === c.clientId + '_delete'
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
          {filtered.length} dari {clients.length} client
        </div>
      </div>

      {showCreate && (
        <CreateClientModal
          onClose={() => setShowCreate(false)}
          onCreated={(client) => {
            setClients(prev => [client, ...prev]);
            setNewKey({ clientId: client.clientId, key: client.apiKey });
            setShowCreate(false);
          }}
        />
      )}

      {editTarget && (
        <EditClientModal
          client={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={(updated) => {
            setClients(prev => prev.map(c => c.clientId === updated.clientId ? { ...c, ...updated } : c));
            setEditTarget(null);
          }}
        />
      )}
    </div>
  );
}
