import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { RefreshCw, TrendingUp, CheckCircle, AlertTriangle, BarChart2 } from 'lucide-react';
import { api } from '../lib/api.js';

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

const DAYS_OPTIONS = [
  { value: 7, label: '7 Hari' },
  { value: 14, label: '14 Hari' },
  { value: 30, label: '30 Hari' }
];

export default function Analytics() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.getAnalytics(days);
      setData(res.data.data);
    } catch (err) {
      if (err.response?.status === 401) { localStorage.removeItem('adminKey'); navigate('/login'); }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, [days]);

  const chartData = data?.daily?.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  })) || [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Statistik penggunaan API</p>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={TrendingUp}
          label="Total Requests"
          value={loading ? '...' : data?.total?.toLocaleString()}
          sub={`${days} hari terakhir`}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={CheckCircle}
          label="Success Rate"
          value={loading ? '...' : `${data?.successRate ?? 100}%`}
          sub="Status < 400"
          color="bg-green-50 text-green-600"
        />
        <StatCard
          icon={BarChart2}
          label="Rata-rata / Hari"
          value={loading ? '...' : data ? Math.round((data.total || 0) / days).toLocaleString() : '0'}
          sub="Requests per hari"
          color="bg-purple-50 text-purple-600"
        />
        <StatCard
          icon={AlertTriangle}
          label="Error Requests"
          value={loading ? '...' : data ? (data.daily.reduce((s, d) => s + d.error, 0)).toLocaleString() : '0'}
          sub="Status >= 400"
          color="bg-red-50 text-red-500"
        />
      </div>

      {/* Line chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Request Trend</h2>
        {loading ? (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
        ) : chartData.length === 0 || data?.total === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400">
            <BarChart2 className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">Belum ada data. Data akan muncul setelah ada API request masuk.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#4f6ef7" strokeWidth={2} name="Total" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="success" stroke="#22c55e" strokeWidth={2} name="Success" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="error" stroke="#ef4444" strokeWidth={2} name="Error" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top endpoints + bar chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Top Endpoints</h2>
          {loading ? (
            <div className="text-center text-gray-400 text-sm py-8">Loading...</div>
          ) : !data?.topEndpoints?.length ? (
            <div className="text-center text-gray-400 text-sm py-8">Belum ada data</div>
          ) : (
            <div className="space-y-3">
              {data.topEndpoints.map((ep, i) => {
                const max = data.topEndpoints[0].count;
                return (
                  <div key={ep.endpoint}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-mono text-gray-700 truncate max-w-[220px]">{ep.endpoint}</span>
                      <span className="font-medium text-gray-900">{ep.count.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full"
                        style={{ width: `${(ep.count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Request per Hari</h2>
          {loading || !chartData.length || data?.total === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              {loading ? 'Loading...' : 'Belum ada data'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={192}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="success" stackId="a" fill="#22c55e" name="Success" />
                <Bar dataKey="error" stackId="a" fill="#ef4444" name="Error" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
