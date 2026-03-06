import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Key, LogOut, Zap, BarChart2, Activity, Heart, Shield, ExternalLink, BookOpen, Database } from 'lucide-react';

const navItems = [
  { to: '/overview', icon: LayoutDashboard, label: 'Overview' },
  { to: '/api-keys', icon: Key, label: 'API Keys' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/logs', icon: Activity, label: 'Activity Log' },
  { to: '/health', icon: Heart, label: 'Platform Health' },
  { to: '/audit', icon: Shield, label: 'Audit Log' },
  { to: '/contents', icon: Database, label: 'Content Cache' }
];

function DocsLink() {
  const [docsUrl, setDocsUrl] = useState(null);

  useEffect(() => {
    import('../lib/api.js').then(({ api }) => {
      api.getConfig()
        .then(res => setDocsUrl(res.data?.data?.docsUrl || null))
        .catch(() => {});
    });
  }, []);

  if (!docsUrl) return null;

  return (
    <a
      href={docsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
    >
      <BookOpen className="w-4 h-4" />
      API Docs (Internal)
    </a>
  );
}

export default function Layout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('adminKey');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Dracin Gateway</p>
              <p className="text-xs text-gray-400">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100 space-y-1">
          <DocsLink />
          <a
            href="/portal"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Client Portal
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
