import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, RotateCcw, Pencil, Trash2, CheckCircle, Loader2, Activity, Calendar, Clock, Zap } from 'lucide-react';
import { api } from '../lib/api.js';
import EditClientModal from '../components/EditClientModal.jsx';

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right max-w-xs truncate">{value || '—'}</span>
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-600 border border-gray-200 rounded px-2 py-1 transition-colors"
    >
      {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Copy Key'}
    </button>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function ClientDetail() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [newKey, setNewKey] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getClientStats(clientId);
      setStats(res.data.data);
    } catch (err) {
      if (err.response?.status === 401) { localStorage.removeItem('adminKey'); navigate('/login'); }
      else if (err.response?.status === 404) navigate('/api-keys');
      else setError('Failed to load client stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, [clientId]);

  const handleRegenerate = async () => {
    if (!window.confirm('Regenerate API key? The old key will stop working immediately.')) return;
    setActionLoading('regen');
    try {
      const res = await api.regenerateKey(clientId);
      setNewKey(res.data.data.apiKey);
    } catch { setError('Failed to regenerate key'); }
    finally { setActionLoading(''); }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete client "${stats?.name}"? This cannot be undone.`)) return;
    setActionLoading('delete');
    try {
      await api.deleteClient(clientId);
      navigate('/api-keys');
    } catch { setError('Failed to delete client'); setActionLoading(''); }
  };

  const expired = stats?.expiresAt && new Date(stats.expiresAt) <= new Date();

  return (
    <div className="p-8">
      <button
        onClick={() => navigate('/api-keys')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to API Keys
      </button>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{stats.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{stats.email}</p>
              <div className="mt-2">
                {expired ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Expired</span>
                ) : stats.isActive ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Inactive</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEdit(true)}
                className="flex items-center gap-2 text-sm border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 text-gray-600 transition-colors"
              >
                <Pencil className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={handleRegenerate}
                disabled={!!actionLoading}
                className="flex items-center gap-2 text-sm border border-yellow-200 rounded-lg px-3 py-2 hover:bg-yellow-50 text-yellow-700 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'regen' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Regenerate Key
              </button>
              <button
                onClick={handleDelete}
                disabled={!!actionLoading}
                className="flex items-center gap-2 text-sm border border-red-200 rounded-lg px-3 py-2 hover:bg-red-50 text-red-600 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>

          {/* New key banner */}
          {newKey && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-green-800 mb-2">API Key Baru — Simpan sekarang!</p>
              <div className="flex items-center gap-3">
                <code className="flex-1 text-xs bg-white px-3 py-2 rounded border border-green-200 font-mono break-all">{newKey}</code>
                <CopyButton text={newKey} />
              </div>
              <button onClick={() => setNewKey(null)} className="mt-2 text-xs text-green-600 hover:underline">Dismiss</button>
            </div>
          )}

          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Activity} label="Total Requests" value={stats.totalRequests?.toLocaleString()} color="bg-purple-50 text-purple-600" />
            <StatCard icon={Zap} label="Rate Limit" value={`${stats.rateLimit?.toLocaleString()}/15m`} color="bg-blue-50 text-blue-600" />
            <StatCard icon={Clock} label="Last Used" value={stats.lastUsed ? new Date(stats.lastUsed).toLocaleDateString('id-ID') : 'Never'} color="bg-gray-50 text-gray-500" />
            <StatCard icon={Calendar} label="Expires" value={stats.expiresAt ? new Date(stats.expiresAt).toLocaleDateString('id-ID') : 'Never'} color={expired ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Client info */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Informasi Client</h2>
              <InfoRow label="Client ID" value={stats.clientId} />
              <InfoRow label="Name" value={stats.name} />
              <InfoRow label="Email" value={stats.email} />
              <InfoRow label="Role" value={stats.role || 'client'} />
              <InfoRow label="Created" value={stats.createdAt ? new Date(stats.createdAt).toLocaleString('id-ID') : '—'} />
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-gray-500">Allowed Endpoints</span>
                <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                  {(stats.allowedEndpoints || ['*']).map(ep => (
                    <span key={ep} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-mono">{ep}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent usage */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Recent Usage (24h)</h2>
              {stats.recentUsage?.length === 0 || !stats.recentUsage ? (
                <p className="text-sm text-gray-400 py-4 text-center">Belum ada aktivitas dalam 24 jam terakhir</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                  {stats.recentUsage.map((log, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                      <span className="font-mono text-gray-500 truncate max-w-[160px]">{log.endpoint}</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          log.status_code < 300 ? 'bg-green-100 text-green-700' :
                          log.status_code < 400 ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        }`}>{log.status_code}</span>
                        <span className="text-gray-400">{new Date(log.created_at).toLocaleTimeString('id-ID')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {showEdit && stats && (
        <EditClientModal
          client={stats}
          onClose={() => setShowEdit(false)}
          onUpdated={(updated) => { setStats(prev => ({ ...prev, ...updated })); setShowEdit(false); }}
        />
      )}
    </div>
  );
}
