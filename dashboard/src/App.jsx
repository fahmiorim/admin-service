import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Layout from './components/Layout.jsx';
import Overview from './pages/Overview.jsx';
import ApiKeys from './pages/ApiKeys.jsx';
import ClientDetail from './pages/ClientDetail.jsx';
import Analytics from './pages/Analytics.jsx';
import ActivityLog from './pages/ActivityLog.jsx';
import Health from './pages/Health.jsx';
import AuditLog from './pages/AuditLog.jsx';
import Portal from './pages/Portal.jsx';
import Contents from './pages/Contents.jsx';

function PrivateRoute({ children }) {
  const key = localStorage.getItem('adminKey');
  return key ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="api-keys" element={<ApiKeys />} />
          <Route path="api-keys/:clientId" element={<ClientDetail />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="logs" element={<ActivityLog />} />
          <Route path="health" element={<Health />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="contents" element={<Contents />} />
        </Route>
        <Route path="/portal" element={<Portal />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
