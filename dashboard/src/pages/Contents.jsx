import { useEffect, useState, useCallback } from 'react';
import { Database, RefreshCw, Search, Film, CheckCircle, XCircle, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';

const PLATFORMS = ['dramabox', 'reelshort', 'melolo', 'dramabite'];

const PLATFORM_COLORS = {
  dramabox:  'bg-blue-100 text-blue-700',
  reelshort: 'bg-purple-100 text-purple-700',
  melolo:    'bg-green-100 text-green-700',
  dramabite: 'bg-orange-100 text-orange-700'
};

function StatCard({ label, value, icon: Icon, color }) {
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

function SyncLogBadge({ status }) {
  if (status === 'success') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3"/>Success</span>;
  if (status === 'failed')  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1 w-fit"><XCircle className="w-3 h-3"/>Failed</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 flex items-center gap-1 w-fit"><Clock className="w-3 h-3"/>Running</span>;
}

export default function Contents() {
  const [syncStatus, setSyncStatus] = useState(null);
  const [contents, setContents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('');
  const [page, setPage] = useState(0);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [clearing, setClearing] = useState(false);
  const [clearTarget, setClearTarget] = useState(null); // null=all, or platform string
  const [showConfirm, setShowConfirm] = useState(false);
  const LIMIT = 20;

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.getSyncStatus();
      setSyncStatus(res.data.data);
    } catch {}
  }, []);

  const fetchContents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getContents({
        q: search || undefined,
        platform: platform || undefined,
        limit: LIMIT,
        offset: page * LIMIT
      });
      setContents(res.data.data || []);
      setTotal(res.data.count || 0);
    } catch {
      setContents([]);
    } finally {
      setLoading(false);
    }
  }, [search, platform, page]);

  useEffect(() => { fetchStatus(); fetchContents(); }, [fetchStatus, fetchContents]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const platforms = selectedPlatforms.length > 0 ? selectedPlatforms : undefined;
      await api.triggerSync(platforms);
      setSyncMsg('Sync dimulai! Cek status di bawah.');
      setTimeout(() => { fetchStatus(); fetchContents(); }, 3000);
    } catch (e) {
      setSyncMsg(e?.response?.data?.message || 'Sync gagal dimulai');
    } finally {
      setSyncing(false);
    }
  };

  const togglePlatform = (p) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const confirmClear = (platform = null) => {
    setClearTarget(platform);
    setShowConfirm(true);
  };

  const handleClearContents = async () => {
    setClearing(true);
    setShowConfirm(false);
    setSyncMsg('');
    try {
      const res = await api.clearContents(clearTarget || undefined);
      const { deleted, platform: p } = res.data.data;
      setSyncMsg(`${deleted} konten ${p === 'all' ? 'semua platform' : p} berhasil dihapus.`);
      fetchContents();
      fetchStatus();
    } catch (e) {
      setSyncMsg(e?.response?.data?.message || 'Gagal menghapus konten');
    } finally {
      setClearing(false);
      setClearTarget(null);
    }
  };

  const stats = syncStatus?.stats || {};
  const totalCached = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 space-y-6">

      {/* Confirm Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600"/>
              </div>
              <h3 className="font-semibold text-gray-900">Hapus Cache</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              {clearTarget
                ? `Hapus semua konten <strong>${clearTarget}</strong> dari database?`
                : 'Hapus <strong>semua konten</strong> dari semua platform?'}
              <br/><span className="text-red-500 font-medium">Tindakan ini tidak dapat dibatalkan.</span>
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                Batal
              </button>
              <button onClick={handleClearContents}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Cache</h1>
          <p className="text-sm text-gray-500 mt-1">Metadata dari semua platform yang tersimpan di database</p>
        </div>
        <div className="flex items-center gap-2">
          {syncStatus?.isSyncing && (
            <span className="text-sm text-yellow-600 flex items-center gap-1">
              <RefreshCw className="w-4 h-4 animate-spin"/> Sync berjalan...
            </span>
          )}
          <button
            onClick={() => confirmClear(null)}
            disabled={clearing || syncing}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className={`w-4 h-4 ${clearing ? 'animate-spin' : ''}`}/>
            {clearing ? 'Menghapus...' : 'Kosongkan Cache'}
          </button>
          <button
            onClick={handleSync}
            disabled={syncing || syncStatus?.isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`}/>
            {syncing ? 'Memulai...' : 'Sync Sekarang'}
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${syncMsg.includes('gagal') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          <AlertCircle className="w-4 h-4 flex-shrink-0"/>
          {syncMsg}
        </div>
      )}

      {/* Stats per platform */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Cached" value={totalCached.toLocaleString()} icon={Database} color="bg-indigo-100 text-indigo-600"/>
        {PLATFORMS.map(p => (
          <StatCard key={p} label={p.charAt(0).toUpperCase()+p.slice(1)} value={(stats[p] || 0).toLocaleString()} icon={Film} color={PLATFORM_COLORS[p]}/>
        ))}
      </div>

      {/* Sync & Clear per Platform */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Sync per platform</p>
          <p className="text-xs text-gray-400 mb-3">Pilih platform lalu klik Sync Sekarang. Kosongkan pilihan = sync semua.</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(p => (
              <button
                key={p}
                onClick={() => togglePlatform(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  selectedPlatforms.includes(p)
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Kosongkan cache per platform</p>
          <p className="text-xs text-gray-400 mb-3">Hapus semua konten dari platform tertentu saja.</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(p => (
              <button
                key={p}
                onClick={() => confirmClear(p)}
                disabled={clearing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5"/>{p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sync Logs */}
      {syncStatus?.recentLogs?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Sync Log Terbaru</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Platform','Status','Items','Durasi','Waktu'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {syncStatus.recentLogs.slice(0, 10).map(log => {
                  const duration = log.finished_at
                    ? `${((new Date(log.finished_at) - new Date(log.started_at)) / 1000).toFixed(1)}s`
                    : '—';
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLATFORM_COLORS[log.platform] || 'bg-gray-100 text-gray-600'}`}>
                          {log.platform || 'all'}
                        </span>
                      </td>
                      <td className="px-4 py-3"><SyncLogBadge status={log.status}/></td>
                      <td className="px-4 py-3 text-gray-700">{log.items_synced ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{duration}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(log.started_at).toLocaleString('id-ID')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contents Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center gap-3">
          <h2 className="font-semibold text-gray-900 flex-1">Konten Tersimpan <span className="text-gray-400 font-normal">({total.toLocaleString()})</span></h2>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                placeholder="Cari judul..."
                className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={platform}
              onChange={e => { setPlatform(e.target.value); setPage(0); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Platform</option>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Memuat...</div>
        ) : contents.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {total === 0 ? 'Belum ada data. Klik "Sync Sekarang" untuk memulai.' : 'Tidak ada hasil.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Cover','Judul','Platform','Episode','Genre','Sync Terakhir'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {contents.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {item.cover_url ? (
                          <img src={item.cover_url} alt="" className="w-10 h-14 object-cover rounded" onError={e => { e.target.style.display = 'none'; }}/>
                        ) : (
                          <div className="w-10 h-14 bg-gray-100 rounded flex items-center justify-center">
                            <Film className="w-4 h-4 text-gray-300"/>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-medium text-gray-900 truncate">{item.title || '—'}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{item.description?.slice(0, 60)}{item.description?.length > 60 ? '...' : ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLATFORM_COLORS[item.platform] || 'bg-gray-100 text-gray-600'}`}>
                          {item.platform}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{item.episode_count || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(item.genres || []).slice(0, 2).map((g, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{g}</span>
                          ))}
                          {item.genres?.length > 2 && <span className="text-xs text-gray-400">+{item.genres.length - 2}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(item.last_synced_at).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
              <span>Menampilkan {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} dari {total.toLocaleString()}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * LIMIT >= total}
                  className="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
