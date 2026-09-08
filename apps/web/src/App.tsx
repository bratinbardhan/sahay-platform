import { useEffect, useState, type ReactNode } from 'react';
import type { AuthResponse, User } from '@sahay/types';
import {
  Activity,
  Camera,
  Images,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  X,
} from 'lucide-react';

import { apiFetchMe, AuthApiError } from '@/lib/auth';
import { clearSession, loadSession, saveSession, type StoredSession } from '@/lib/session';
import { Dashboard } from '@/pages/Dashboard';
import { AnalyticsChart } from '@/pages/AnalyticsChart';
import { MediaManager } from '@/pages/MediaManager';
import { GeofenceMap } from '@/pages/GeofenceMap';
import { ReminiscenceManager } from '@/pages/ReminiscenceManager';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';
import { AdminDashboard } from '@/pages/AdminDashboard';

type Page = 'dashboard' | 'analytics' | 'media' | 'geofence' | 'reminiscence';

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

/** Items rendered in the responsive sidebar / mobile drawer. */
const NAV_ITEMS: { page: Page; label: string; icon: ReactNode }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { page: 'analytics', label: 'Analytics', icon: <Activity size={18} /> },
  { page: 'reminiscence', label: 'Memory Album', icon: <Images size={18} /> },
  { page: 'media', label: 'Media Manager', icon: <Camera size={18} /> },
  { page: 'geofence', label: 'Geofence Map', icon: <MapPin size={18} /> },
];

/**
 * Wraps the authenticated app surface with a responsive sidebar.
 * Desktop: a static 20rem rail. Mobile: hidden, revealed by a hamburger button
 * that slides in a drawer with a darkened backdrop.
 */
function AppShell({
  page,
  navigate,
  user,
  onLogout,
  children,
}: {
  page: Page;
  navigate: (page: string) => void;
  user: User;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the mobile drawer on Escape (WCAG 2.1.2).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Mobile backdrop — only renders while the drawer is open. */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      {/* Sidebar rail (desktop: static; mobile: off-canvas drawer). */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200/80 shadow-sm transform transition-transform duration-200 ease-out -translate-x-full lg:translate-x-0 lg:static ${
          drawerOpen ? 'translate-x-0' : ''
        }`}
        aria-label="Primary navigation"
      >
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close navigation menu"
          className="absolute top-4 right-3 p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors lg:hidden"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col gap-1 px-4 pt-16 pb-6">
          <div className="flex items-center gap-2 mb-10">
            <span className="font-semibold text-lg text-slate-900 tracking-tight">Sahāy</span>
          </div>

          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = item.page === page;
              return (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => {
                    navigate(item.page);
                    closeDrawer();
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    active
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={onLogout}
            className="mt-6 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content — occupies the rail column on desktop. */}
      <div className="flex-1 min-w-0 lg:pl-72">
        {/* Mobile top header with the hamburger menu button. */}
        <header className="sticky top-0 z-30 flex lg:hidden items-center justify-between gap-2 bg-white border-b border-slate-200/80 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              aria-haspopup="dialog"
              aria-expanded={drawerOpen}
              className="p-2.5 rounded-lg text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors"
            >
              <Menu size={24} />
            </button>
            <span className="font-semibold text-slate-900">Sahāy</span>
          </div>
          <span className="text-xs text-slate-500">{user.full_name}</span>
        </header>

        {children}
      </div>
    </div>
  );
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
      <div className="flex min-h-screen bg-slate-100 items-center justify-center">
        <p className="text-slate-600 text-lg">Waking up Sahāy…</p>
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
    return <AdminDashboard user={user} token={session.accessToken} onLogout={logout} />;
  }

    const navigate = (next: string) => {
    setPage(next as Page);
  };

  let content: ReactNode;
  switch (page) {
    case 'analytics':
      content = <AnalyticsChart onNavigate={navigate} token={session.accessToken} />;
      break;
    case 'media':
      content = <MediaManager onNavigate={navigate} />;
      break;
    case 'geofence':
      content = <GeofenceMap onNavigate={navigate} />;
      break;
    case 'reminiscence':
      content = <ReminiscenceManager onNavigate={navigate} token={session.accessToken} />;
      break;
    default:
      content = (
        <Dashboard user={user} token={session.accessToken} onNavigate={navigate} onLogout={logout} />
      );
  }

  return (
    <AppShell page={page} navigate={navigate} user={user} onLogout={logout}>
      {content}
    </AppShell>
  );
}

export default App;
