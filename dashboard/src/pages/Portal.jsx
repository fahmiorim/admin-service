import { useState } from 'react';
import { Eye, EyeOff, Loader2, Key, CheckCircle, XCircle, Clock, Activity, Zap, Calendar, Copy } from 'lucide-react';
import { api } from '../lib/api.js';

const PLAN_COLORS = {
  FREE: 'bg-gray-100 text-gray-700 border-gray-200',
  BASIC: 'bg-blue-100 text-blue-700 border-blue-200',
  PRO: 'bg-purple-100 text-purple-700 border-purple-200',
  ENTERPRISE: 'bg-yellow-100 text-yellow-800 border-yellow-300'
};

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-900">{value ?? '—'}</p>
    </div>
  );
}

export default function Portal() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await api.getPortalStats(apiKey.trim());
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'API key tidak valid');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <Key className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Dracin API Gateway</p>
            <p className="text-xs text-gray-400">Client Portal — Cek status API key kamu</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* API Key input */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Masukkan API Key</h2>
          <form onSubmit={handleCheck} className="flex gap-3">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="dk_xxxxxxxxxxxxxxxx"
                className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading || !apiKey.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Checking...' : 'Cek Status'}
            </button>
          </form>
          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
          )}
        </div>

        {/* Results */}
        {data && (
          <div className="space-y-5">
            {/* Status header */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{data.name}</h2>
                  <p className="text-sm text-gray-500">{data.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {data.expired ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        <Clock className="w-3 h-3" /> Expired
                      </span>
                    ) : data.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        <XCircle className="w-3 h-3" /> Inactive
                      </span>
                    )}
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${PLAN_COLORS[data.plan] || PLAN_COLORS.FREE}`}>
                      {data.planName || data.plan}
                    </span>
                  </div>
                </div>
                {data.daysLeft !== null && !data.expired && (
                  <div className="text-right">
                    <p className="text-3xl font-bold text-gray-900">{data.daysLeft}</p>
                    <p className="text-sm text-gray-400">hari tersisa</p>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Activity} label="Total Requests" value={data.totalRequests?.toLocaleString()} color="bg-purple-50 text-purple-600" />
              <StatCard icon={Zap} label="Rate Limit" value={`${data.rateLimit?.toLocaleString()}/15m`} color="bg-blue-50 text-blue-600" />
              <StatCard icon={Clock} label="Last Used" value={data.lastUsed ? new Date(data.lastUsed).toLocaleDateString('id-ID') : 'Belum pernah'} color="bg-gray-50 text-gray-500" />
              <StatCard icon={Calendar} label="Expires" value={data.expiresAt ? new Date(data.expiresAt).toLocaleDateString('id-ID') : '—'} color={data.expired ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'} />
            </div>

            {/* Allowed endpoints */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Allowed Endpoints</h3>
              <div className="flex flex-wrap gap-2">
                {(data.allowedEndpoints || ['*']).map(ep => (
                  <span key={ep} className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg font-mono">
                    {ep === '*' ? '✦ Semua endpoint' : ep}
                  </span>
                ))}
              </div>
            </div>

            {/* Usage instructions */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Cara Penggunaan</h3>
              <p className="text-sm text-gray-500 mb-3">Tambahkan header berikut di setiap request:</p>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <code className="text-xs flex-1 text-gray-700 font-mono">x-api-key: {apiKey}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(apiKey)}
                  className="text-gray-400 hover:text-brand-600"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
