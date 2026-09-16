import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAppStore, homeFor } from './lib/store';

import AppShell from './components/layout/AppShell';

import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

import DonorOverview from './pages/donor/DonorOverview';
import RecipientOverview from './pages/recipient/RecipientOverview';
import FindDonors from './pages/recipient/FindDonors';
import ScreeningPage from './pages/shared/ScreeningPage';
import MatchesPage from './pages/shared/MatchesPage';
import ReviewQueue from './pages/doctor/ReviewQueue';
import AdminOverview from './pages/admin/AdminOverview';

function Protected({ roles, children }) {
  const { user } = useAppStore();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}

/** Clears store when the API layer broadcasts a 401 */
function AuthListener() {
  const { logout } = useAppStore();
  const navigate = useNavigate();
  useEffect(() => {
    const onLogout = () => { logout(); navigate('/login'); };
    window.addEventListener('auth-logout', onLogout);
    return () => window.removeEventListener('auth-logout', onLogout);
  }, [logout, navigate]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthListener />
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#1B1917',
            color: '#FAF9F6',
            borderRadius: '8px',
            fontSize: '13.5px',
            fontFamily: "'Inter', system-ui, sans-serif",
            border: '1px solid #44403C',
          },
          success: { iconTheme: { primary: '#067647', secondary: '#fff' } },
          error: { iconTheme: { primary: '#D35A4B', secondary: '#fff' } },
        }}
      />

      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Authenticated shell */}
        <Route element={<Protected><AppShell /></Protected>}>
          <Route path="/donor" element={<Protected roles={['donor']}><DonorOverview /></Protected>} />
          <Route path="/donor/screening" element={<Protected roles={['donor']}><ScreeningPage role="donor" /></Protected>} />
          <Route path="/donor/matches" element={<Protected roles={['donor']}><MatchesPage role="donor" /></Protected>} />

          <Route path="/recipient" element={<Protected roles={['recipient']}><RecipientOverview /></Protected>} />
          <Route path="/recipient/find" element={<Protected roles={['recipient']}><FindDonors /></Protected>} />
          <Route path="/recipient/screening" element={<Protected roles={['recipient']}><ScreeningPage role="recipient" /></Protected>} />
          <Route path="/recipient/matches" element={<Protected roles={['recipient']}><MatchesPage role="recipient" /></Protected>} />

          <Route path="/doctor" element={<Protected roles={['doctor']}><ReviewQueue /></Protected>} />
          <Route path="/admin" element={<Protected roles={['admin']}><AdminOverview /></Protected>} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
