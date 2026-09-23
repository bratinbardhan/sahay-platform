import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Brain, Activity, ImagePlus, BookHeart, MapPinned, HeartHandshake, LogOut, LayoutGrid } from 'lucide-react';
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
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [showCareCircleModal, setShowCareCircleModal] = useState(false);
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
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      {session && session.user.role !== 'ADMIN' && location.pathname !== '/login' && location.pathname !== '/signup' ? (
        <aside
          className={`print:hidden bg-[#FAF8F5] border-r border-[#EADBCC] flex flex-col items-center py-6 gap-6 h-screen transition-all duration-300 ${isSidebarExpanded ? 'w-48' : 'w-16'} z-40`}
          onMouseEnter={() => setIsSidebarExpanded(true)}
          onMouseLeave={() => setIsSidebarExpanded(false)}
        >
          <button onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors z-50">
            {isSidebarExpanded ? (
              <X className="w-6 h-6 transition-transform duration-300 rotate-0 hover:rotate-90" />
            ) : (
              <Menu className="w-6 h-6 transition-transform duration-300" />
            )}
          </button>

          <div className="w-10 h-10 bg-[#1E293B] rounded-xl flex flex-shrink-0 items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 flex flex-col space-y-4 w-full px-2 mt-4">
            <button
              title="Dashboard"
              className={`w-full h-10 text-slate-500 hover:text-[#1E293B] hover:bg-[#F5E6D3]/60 rounded-xl transition-all flex items-center shrink-0 overflow-hidden ${isSidebarExpanded ? 'gap-3 px-4' : 'justify-center'}`}
              onClick={() => navigate('/')}
            >
              <LayoutGrid className="w-5 h-5 shrink-0" />
              {isSidebarExpanded && <span className="font-medium text-sm whitespace-nowrap">Dashboard</span>}
            </button>
            <button
              title="Analytics"
              className={`w-full h-10 text-slate-500 hover:text-[#1E293B] hover:bg-[#F5E6D3]/60 rounded-xl transition-all flex items-center shrink-0 overflow-hidden ${isSidebarExpanded ? 'gap-3 px-4' : 'justify-center'}`}
              onClick={() => navigate('/analytics')}
            >
              <Activity className="w-5 h-5 shrink-0" />
              {isSidebarExpanded && <span className="font-medium text-sm whitespace-nowrap">Analytics</span>}
            </button>
            <button
              title="Media Manager"
              className={`w-full h-10 text-slate-500 hover:text-[#1E293B] hover:bg-[#F5E6D3]/60 rounded-xl transition-all flex items-center shrink-0 overflow-hidden ${isSidebarExpanded ? 'gap-3 px-4' : 'justify-center'}`}
              onClick={() => navigate('/media')}
            >
              <ImagePlus className="w-5 h-5 shrink-0" />
              {isSidebarExpanded && <span className="font-medium text-sm whitespace-nowrap">Media Manager</span>}
            </button>
            <button
              title="Memory Album"
              className={`w-full h-10 text-slate-500 hover:text-[#1E293B] hover:bg-[#F5E6D3]/60 rounded-xl transition-all flex items-center shrink-0 overflow-hidden ${isSidebarExpanded ? 'gap-3 px-4' : 'justify-center'}`}
              onClick={() => navigate('/reminiscence')}
            >
              <BookHeart className="w-5 h-5 shrink-0" />
              {isSidebarExpanded && <span className="font-medium text-sm whitespace-nowrap">Memory Album</span>}
            </button>
            <button
              title="Geofence Map"
              className={`w-full h-10 text-slate-500 hover:text-[#1E293B] hover:bg-[#F5E6D3]/60 rounded-xl transition-all flex items-center shrink-0 overflow-hidden ${isSidebarExpanded ? 'gap-3 px-4' : 'justify-center'}`}
              onClick={() => navigate('/geofence')}
            >
              <MapPinned className="w-5 h-5 shrink-0" />
              {isSidebarExpanded && <span className="font-medium text-sm whitespace-nowrap">Geofence Map</span>}
            </button>
            <button
              title="Care Circle"
              onClick={() => setShowCareCircleModal(true)}
              className={`w-full h-10 text-slate-500 hover:text-[#1E293B] hover:bg-[#F5E6D3]/60 rounded-xl transition-all flex items-center shrink-0 overflow-hidden ${isSidebarExpanded ? 'gap-3 px-4' : 'justify-center'}`}
            >
              <HeartHandshake className="w-5 h-5 shrink-0" />
              {isSidebarExpanded && <span className="font-medium text-sm whitespace-nowrap">Care Circle</span>}
            </button>
          </div>

          <div className="flex-1" />
          <div className="w-full px-3 pb-4">
            <button
              onClick={() => setIsLogoutModalOpen(true)}
              className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors ${!isSidebarExpanded ? 'justify-center' : 'px-3'
                }`}
              title="Log Out"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {isSidebarExpanded && <span className="text-sm font-semibold">Log Out</span>}
            </button>
          </div>
        </aside>
      ) : null}

      <div className="flex-1 overflow-y-auto relative">
        <Routes>
          <Route path="/login" element={session ? <Navigate to="/" /> : <Login onSuccess={onAuthSuccess} onNavigate={(r) => navigate('/' + r)} />} />
          <Route path="/signup" element={session ? <Navigate to="/" /> : <Signup onSuccess={onAuthSuccess} onNavigate={(r) => navigate('/' + r)} />} />

          {/* Protected Routes */}
          {session ? (
            <>
              <Route path="/admin" element={session.user.role === 'ADMIN' ? <AdminDashboard user={session.user} token={session.accessToken} onLogout={logout} /> : <Navigate to="/" />} />
              <Route path="/" element={<Dashboard user={session.user} token={session.accessToken} onNavigate={(p) => navigate(p === 'dashboard' ? '/' : '/' + p)} />} />
              <Route path="/analytics" element={<AnalyticsChart token={session.accessToken} onNavigate={(p) => navigate(p === 'dashboard' ? '/' : '/' + p)} />} />
              <Route path="/media" element={<MediaManager onNavigate={(p) => navigate(p === 'dashboard' ? '/' : '/' + p)} />} />
              <Route path="/geofence" element={<GeofenceMap onNavigate={(p) => navigate(p === 'dashboard' ? '/' : '/' + p)} />} />
              <Route path="/reminiscence" element={<ReminiscenceManager token={session.accessToken} onNavigate={(p) => navigate(p === 'dashboard' ? '/' : '/' + p)} />} />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/login" />} />
          )}
        </Routes>
      </div>

      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-slate-800 font-semibold text-lg text-center mb-6">Are you sure you want to logout?</h3>
            <div className="flex justify-between gap-4">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { setIsLogoutModalOpen(false); logout(); }}
                className="flex-1 py-2 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors">
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {showCareCircleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl flex flex-col items-center">
            <h3 className="font-bold text-slate-800 text-center text-lg mb-2">Feature coming soon</h3>
            <p className="text-slate-500 text-sm text-center mb-6">The Care Circle module is currently under development.</p>
            <button
              type="button"
              onClick={() => setShowCareCircleModal(false)}
              className="w-full py-2 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
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
