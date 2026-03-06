import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CheckCircle, XCircle, BarChart3, RefreshCw, ArrowRight, AlertTriangle, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value ?? '—'}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ isActive, expiresAt }) {
  const expired = expiresAt && new Date(expiresAt) <= new Date();
  if (expired) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Expired</span>;
  if (isActive) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Inactive</span>;
}

export default function Overview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cacheClearing, setCacheClearing] = useState(false);
  const [cacheMsg, setCacheMsg] = useState('');

  const handleClearCache = async () => {
    setCacheClearing(true);
    setCacheMsg('');
    try {
      await api.clearCache();
      setCacheMsg('Cache cleared!');
      setTimeout(() => setCacheMsg(''), 3000);
    } catch {}
    finally { setCacheClearing(false); }
  };

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, expiringRes] = await Promise.all([
        api.getStats(),
        api.getExpiringClients(30)
      ]);
      setStats(statsRes.data.data);
      setExpiring(expiringRes.data.data || []);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('adminKey');
        navigate('/login');
      } else {
        setError('Failed to load stats');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">Dashboard ringkasan API Gateway</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClearCache}
            disabled={cacheClearing}
            className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50"
          >
            <Trash2 className={`w-4 h-4 ${cacheClearing ? 'animate-pulse text-red-500' : ''}`} />
            {cacheMsg || 'Clear Cache'}
          </button>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>
      )}

      {/* Expiry Warning */}
      {expiring.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-800 mb-2">
                {expiring.length} client akan expire dalam 30 hari
              </p>
              <div className="flex flex-wrap gap-2">
                {expiring.map(c => (
                  <button
                    key={c.clientId}
                    onClick={() => navigate(`/api-keys/${c.clientId}`)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-orange-200 rounded-lg text-xs text-orange-700 hover:bg-orange-50 transition-colors"
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-orange-400">— {c.daysLeft}h lagi</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Total Clients" value={loading ? '...' : stats?.total} color="bg-blue-50 text-blue-600" />
        <StatCard icon={CheckCircle} label="Active" value={loading ? '...' : stats?.active} color="bg-green-50 text-green-600" />
        <StatCard icon={XCircle} label="Expired / Inactive" value={loading ? '...' : ((stats?.expired ?? 0) + (stats?.inactive ?? 0))} color="bg-orange-50 text-orange-600" />
        <StatCard icon={BarChart3} label="Total Requests" value={loading ? '...' : stats?.totalRequests?.toLocaleString()} color="bg-purple-50 text-purple-600" />
      </div>

      {/* Recent Clients */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Clients</h2>
          <button
            onClick={() => navigate('/api-keys')}
            className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {loading ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">Loading...</div>
          ) : stats?.recentClients?.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">No clients yet</div>
          ) : (
            stats?.recentClients?.map((c) => (
              <div key={c.clientId} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.email}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">{(c.totalRequests || 0).toLocaleString()} reqs</span>
                  <StatusBadge isActive={c.isActive} expiresAt={c.expiresAt} />
                  <button
                    onClick={() => navigate(`/api-keys/${c.clientId}`)}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Detail
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
