import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Wifi, Clock } from 'lucide-react';
import { api } from '../lib/api.js';

const STATUS_CONFIG = {
  up: { label: 'Up', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-500' },
  degraded: { label: 'Degraded', icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', dot: 'bg-yellow-500' },
  down: { label: 'Down', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' }
};

function PlatformCard({ name, status, latency, error, loading }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.down;
  const Icon = cfg.icon;
  return (
    <div className={`bg-white rounded-xl border ${loading ? 'border-gray-200' : cfg.border} p-6 transition-colors`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${loading ? 'bg-gray-300 animate-pulse' : cfg.dot}`} />
          <h3 className="font-semibold text-gray-900">{name}</h3>
        </div>
        {!loading && (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
            <Icon className="w-3.5 h-3.5" />
            {cfg.label}
          </span>
        )}
        {loading && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Checking...
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>{loading ? '...' : latency != null ? `${latency}ms` : '—'}</span>
        </div>
      </div>
      {error && !loading && (
        <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1.5 font-mono truncate">{error}</p>
      )}
    </div>
  );
}

export default function Health() {
  const navigate = useNavigate();
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const res = await api.getPlatformHealth();
      setPlatforms(res.data.data || []);
      setLastChecked(new Date());
    } catch (err) {
      if (err.response?.status === 401) { localStorage.removeItem('adminKey'); navigate('/login'); }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  const allUp = platforms.every(p => p.status === 'up');
  const anyDown = platforms.some(p => p.status === 'down');

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Platform Health</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Status tiap platform — auto-refresh setiap 60 detik
            {lastChecked && ` · Last checked: ${lastChecked.toLocaleTimeString('id-ID')}`}
          </p>
        </div>
        <button
          onClick={checkHealth}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Overall status banner */}
      {!loading && platforms.length > 0 && (
        <div className={`flex items-center gap-3 px-5 py-4 rounded-xl border mb-6 ${
          anyDown ? 'bg-red-50 border-red-200' : allUp ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
        }`}>
          {anyDown ? <XCircle className="w-5 h-5 text-red-500" /> : allUp ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertCircle className="w-5 h-5 text-yellow-500" />}
          <div>
            <p className={`font-semibold text-sm ${anyDown ? 'text-red-800' : allUp ? 'text-green-800' : 'text-yellow-800'}`}>
              {anyDown ? 'Beberapa platform mengalami gangguan' : allUp ? 'Semua platform beroperasi normal' : 'Beberapa platform mengalami gangguan minor'}
            </p>
            <p className={`text-xs mt-0.5 ${anyDown ? 'text-red-600' : allUp ? 'text-green-600' : 'text-yellow-600'}`}>
              {platforms.filter(p => p.status === 'up').length} dari {platforms.length} platform up
            </p>
          </div>
        </div>
      )}

      {/* Platform cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading && !platforms.length
          ? ['Dramabox', 'ReelShort', 'Melolo', 'Dramabite'].map(name => (
            <PlatformCard key={name} name={name} loading={true} />
          ))
          : platforms.map(p => (
            <PlatformCard key={p.name} {...p} loading={loading} />
          ))
        }
      </div>

      {/* Latency summary */}
      {!loading && platforms.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Response Time</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {platforms.map(p => {
              const maxLatency = Math.max(...platforms.map(x => x.latency || 0));
              const pct = maxLatency > 0 ? ((p.latency || 0) / maxLatency) * 100 : 0;
              const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.down;
              return (
                <div key={p.name} className="flex items-center gap-4 px-6 py-3.5">
                  <span className="w-24 text-sm font-medium text-gray-700">{p.name}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${p.status === 'up' ? 'bg-green-500' : p.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-sm text-gray-500">{p.latency != null ? `${p.latency}ms` : '—'}</span>
                  <span className={`w-20 text-right text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
