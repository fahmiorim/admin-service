import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api } from '../lib/api.js';

const PLANS = [
  { key: 'FREE', name: 'Free', rateLimit: 100, color: 'bg-gray-100 text-gray-700' },
  { key: 'BASIC', name: 'Basic', rateLimit: 1000, color: 'bg-blue-100 text-blue-700' },
  { key: 'PRO', name: 'Pro', rateLimit: 10000, color: 'bg-purple-100 text-purple-700' },
  { key: 'ENTERPRISE', name: 'Enterprise', rateLimit: 100000, color: 'bg-yellow-100 text-yellow-800' }
];

export default function CreateClientModal({ onClose, onCreated }) {
  const [selectedPlan, setSelectedPlan] = useState('FREE');
  const [form, setForm] = useState({
    name: '',
    email: '',
    rateLimit: 100,
    expiresAt: '',
    allowedEndpoints: '*'
  });

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan.key);
    setForm(p => ({ ...p, rateLimit: plan.rateLimit }));
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        rateLimit: Number(form.rateLimit),
        allowedEndpoints: form.allowedEndpoints.split(',').map(s => s.trim()).filter(Boolean),
        ...(form.expiresAt && { expiresAt: form.expiresAt })
      };
      const res = await api.createClient(payload);
      onCreated(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Buat Client Baru</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Plan</label>
            <div className="grid grid-cols-2 gap-2">
              {PLANS.map(plan => (
                <button
                  key={plan.key}
                  type="button"
                  onClick={() => handlePlanSelect(plan)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg border-2 transition-all ${
                    selectedPlan === plan.key ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-left">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${plan.color}`}>{plan.name}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{plan.rateLimit.toLocaleString()}/15m</p>
                  </div>
                  {selectedPlan === plan.key && <div className="w-2 h-2 rounded-full bg-brand-500" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="PT. Streaming Indonesia"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="contact@company.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rate Limit / 15m</label>
              <input
                type="number"
                min="1"
                max="100000"
                value={form.rateLimit}
                onChange={e => setForm(p => ({ ...p, rateLimit: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Allowed Endpoints
              <span className="text-xs text-gray-400 font-normal ml-1">(pisahkan dengan koma, * = semua)</span>
            </label>
            <input
              type="text"
              value={form.allowedEndpoints}
              onChange={e => setForm(p => ({ ...p, allowedEndpoints: e.target.value }))}
              placeholder="*, /api/dramabox, /api/reelshort"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-lg disabled:bg-gray-300 transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Membuat...' : 'Buat Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
