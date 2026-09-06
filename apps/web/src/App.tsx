import { useEffect, useState } from 'react';
import type { AuthResponse } from '@sahay/types';

import { apiFetchMe, AuthApiError } from '@/lib/auth';
import { clearSession, loadSession, saveSession, type StoredSession } from '@/lib/session';
import { Dashboard } from '@/pages/Dashboard';
import { AnalyticsChart } from '@/pages/AnalyticsChart';
import { MediaManager } from '@/pages/MediaManager';
import { GeofenceMap } from '@/pages/GeofenceMap';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';
import { AdminDashboard } from '@/pages/AdminDashboard';

type Page = 'dashboard' | 'analytics' | 'media' | 'geofence';

/**
 * Lightweight pathname router (no dependency): `/login`, `/signup`, `/admin`
 * and `/dashboard`. Internal pages (analytics, media, geofence) remain
 * state-driven inside the dashboard surface, exactly as before.
 */
type Route = 'login' | 'signup' | 'admin' | 'app';

const ROUTE_PATHS: Record<Route, string> = {
  login: '/login',
  signup: '/signup',
  admin: '/admin',
  app: '/dashboard',
};

function routeFromPath(): Route {
  const path = window.location.pathname;
  if (path === '/login') {
    return 'login';
  }
  if (path === '/signup') {
    return 'signup';
  }
  if (path === '/admin') {
    return 'admin';
  }
  return 'app';
}

function roleHome(role: string): Route {
  return role === 'ADMIN' ? 'admin' : 'app';
}

function App() {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [route, setRoute] = useState<Route>(routeFromPath());
  const [page, setPage] = useState<Page>('dashboard');

  // Restore the persisted session on cold start and re-validate it in the background.
  useEffect(() => {
    const stored = loadSession();
    if (stored) {
      setSession(stored);
      void apiFetchMe(stored.accessToken)
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
          // Offline / server unreachable — keep the cached session.
        });
    }
    setSessionReady(true);
  }, []);

  // Navigate via the History API so back/forward still work.
  const navigateTo = (next: Route) => {
    setRoute(next);
    try {
      window.history.pushState({}, '', ROUTE_PATHS[next]);
    } catch {
      // file:// or sandboxed origins may throw — the in-memory route still applies
    }
  };

  const logout = () => {
    clearSession();
    setSession(null);
    navigateTo('login');
  };

  const onAuthSuccess = (auth: AuthResponse) => {
    const nextSession: StoredSession = {
      accessToken: auth.access_token,
      user: auth.user,
    };
    setSession(nextSession);
    saveSession(nextSession);
    navigateTo(roleHome(auth.user.role));
  };

  // Role + session guards (applied post-render so state can settle).
  useEffect(() => {
    if (!sessionReady) {
      return;
    }
    if (!session) {
      if (route === 'admin' || route === 'app') {
        navigateTo('login');
      }
      return;
    }
    if (route === 'admin' && session.user.role !== 'ADMIN') {
      // Non-admin visitors to /admin are bounced to the dashboard.
      navigateTo('app');
      return;
    }
    if (route === 'login' || route === 'signup') {
      navigateTo(roleHome(session.user.role));
    }
  }, [sessionReady, session, route]);

  // History back/forward support.
  useEffect(() => {
    const onPopState = () => setRoute(routeFromPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen bg-[#F8F6F0] items-center justify-center">
        <p className="text-[#2C3E50] text-lg">Waking up Sahāy…</p>
      </div>
    );
  }

  if (!session) {
    if (route === 'signup') {
      return <Signup onSuccess={onAuthSuccess} onNavigate={(r) => navigateTo(r)} />;
    }
    return <Login onSuccess={onAuthSuccess} onNavigate={(r) => navigateTo(r)} />;
  }

  const user = session.user;

  if (route === 'admin') {
    return <AdminDashboard user={user} onLogout={logout} />;
  }

  const navigate = (next: string) => {
    setPage(next as Page);
  };

  switch (page) {
    case 'analytics':
      return <AnalyticsChart onNavigate={navigate} />;
    case 'media':
      return <MediaManager onNavigate={navigate} />;
    case 'geofence':
      return <GeofenceMap onNavigate={navigate} />;
    default:
      return <Dashboard user={user} onNavigate={navigate} onLogout={logout} />;
  }
}

export default App;
