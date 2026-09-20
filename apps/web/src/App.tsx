import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import type { AuthResponse } from '@sahay/types';

import { apiFetchMe, AuthApiError } from '@/lib/auth';
import { applyPalette, type SahayPalette } from '@/lib/palette';
import { clearSession, loadSession, saveSession, type StoredSession } from '@/lib/session';
import { Dashboard } from '@/pages/Dashboard';
import { AnalyticsChart } from '@/pages/AnalyticsChart';
import { MediaManager } from '@/pages/MediaManager';
import { GeofenceMap } from '@/pages/GeofenceMap';
import { ReminiscenceManager } from '@/pages/ReminiscenceManager';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';
import { AdminDashboard } from '@/pages/AdminDashboard';


function paletteFor(pathname: string, isSignedIn: boolean): SahayPalette {
  if (!isSignedIn || pathname === '/login' || pathname === '/signup') {
    return 'patient';
  }
  return 'caretaker';
}

function InnerApp() {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    applyPalette(paletteFor(location.pathname, Boolean(session)));
  }, [location.pathname, session]);

  useEffect(() => {
    const stored = loadSession();
    if (stored) {
      setSession(stored);
      apiFetchMe(stored.accessToken)
        .then((user) => {
          const fresh: StoredSession = { accessToken: stored.accessToken, user };
          setSession(fresh);
          saveSession(fresh);
        })
        .catch((error) => {
          if (error instanceof AuthApiError && error.status === 401) {
            setSession(null);
            clearSession();
          }
        });
    }
    setSessionReady(true);
  }, []);

  const logout = () => {
    clearSession();
    setSession(null);
    navigate('/login');
  };

  const onAuthSuccess = (auth: AuthResponse) => {
    const nextSession: StoredSession = {
      accessToken: auth.access_token,
      user: auth.user,
    };
    setSession(nextSession);
    saveSession(nextSession);
    if (auth.user.role === 'ADMIN') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  if (!sessionReady) {
    return (
      <div className="animate-patient-fade-in flex min-h-screen bg-sahay-bg items-center justify-center">
        <p className="text-sahay-ink text-lg">Waking up Sahāy…</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" /> : <Login onSuccess={onAuthSuccess} onNavigate={(r) => navigate('/' + r)} />} />
      <Route path="/signup" element={session ? <Navigate to="/" /> : <Signup onSuccess={onAuthSuccess} onNavigate={(r) => navigate('/' + r)} />} />

      {/* Protected Routes */}
      {session ? (
        <>
          <Route path="/admin" element={session.user.role === 'ADMIN' ? <AdminDashboard user={session.user} token={session.accessToken} onLogout={logout} /> : <Navigate to="/" />} />
          <Route path="/" element={<Dashboard user={session.user} token={session.accessToken} onLogout={logout} onNavigate={(p) => navigate(p === 'dashboard' ? '/' : '/' + p)} />} />
          <Route path="/analytics" element={<AnalyticsChart token={session.accessToken} onNavigate={(p) => navigate(p === 'dashboard' ? '/' : '/' + p)} />} />
          <Route path="/media" element={<MediaManager onNavigate={(p) => navigate(p === 'dashboard' ? '/' : '/' + p)} />} />
          <Route path="/geofence" element={<GeofenceMap onNavigate={(p) => navigate(p === 'dashboard' ? '/' : '/' + p)} />} />
          <Route path="/reminiscence" element={<ReminiscenceManager token={session.accessToken} onNavigate={(p) => navigate(p === 'dashboard' ? '/' : '/' + p)} />} />
        </>
      ) : (
        <Route path="*" element={<Navigate to="/login" />} />
      )}
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <InnerApp />
    </BrowserRouter>
  );
}

export default App;
