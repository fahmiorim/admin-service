import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api } from '../lib/api.js';

const PLANS = [
  { key: 'FREE', name: 'Free', rateLimit: 100, color: 'bg-gray-100 text-gray-700' },
  { key: 'BASIC', name: 'Basic', rateLimit: 1000, color: 'bg-blue-100 text-blue-700' },
  { key: 'PRO', name: 'Pro', rateLimit: 10000, color: 'bg-purple-100 text-purple-700' },
  { key: 'ENTERPRISE', name: 'Enterprise', rateLimit: 100000, color: 'bg-yellow-100 text-yellow-800' }
];

function detectPlan(rateLimit) {
  if (rateLimit >= 100000) return 'ENTERPRISE';
  if (rateLimit >= 10000) return 'PRO';
  if (rateLimit >= 1000) return 'BASIC';
  return 'FREE';
}

export default function EditClientModal({ client, onClose, onUpdated }) {
  const [selectedPlan, setSelectedPlan] = useState(detectPlan(client.rateLimit || 100));
  const [form, setForm] = useState({
    name: client.name || '',
    email: client.email || '',
    rateLimit: client.rateLimit || 100,
    isActive: client.isActive ?? true,
    expiresAt: client.expiresAt ? new Date(client.expiresAt).toISOString().split('T')[0] : '',
    allowedEndpoints: (client.allowedEndpoints || ['*']).join(', ')
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan.key);
    setForm(p => ({ ...p, rateLimit: plan.rateLimit }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        rateLimit: Number(form.rateLimit),
        isActive: form.isActive,
        allowedEndpoints: form.allowedEndpoints.split(',').map(s => s.trim()).filter(Boolean),
        ...(form.expiresAt && { expiresAt: form.expiresAt })
      };
      const res = await api.updateClient(client.clientId, payload);
      onUpdated(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Edit Client</h2>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Allowed Endpoints
              <span className="text-xs text-gray-400 font-normal ml-1">(pisahkan dengan koma)</span>
            </label>
            <input
              type="text"
              value={form.allowedEndpoints}
              onChange={e => setForm(p => ({ ...p, allowedEndpoints: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, isActive: !p.isActive }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.isActive ? 'bg-brand-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.isActive ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
            <span className="text-sm text-gray-700">
              {form.isActive ? 'Active' : 'Inactive'}
            </span>
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
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
