import { useState, useEffect } from 'react';
import type { AuthResponse } from '@sahay/types';

import { apiLogin } from '@/lib/auth';

interface LoginProps {
  onSuccess: (auth: AuthResponse) => void;
  onNavigate?: (route: 'signup' | 'login') => void;
}

export function Login({ onSuccess }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const [showSignupWarning, setShowSignupWarning] = useState(false);

  useEffect(() => {
    // Check if user already dismissed it this session
    const dismissed = sessionStorage.getItem('sahay_desktop_notice_dismissed');

    // Check if the device is a mobile or tablet screen (width less than 1024px)
    const isSmallScreen = window.innerWidth < 1024;

    // Only show the notice if it's a small screen AND hasn't been dismissed
    if (isSmallScreen && !dismissed) {
      setShowNotice(true);
    }
  }, []);

  const dismissNotice = () => {
    sessionStorage.setItem('sahay_desktop_notice_dismissed', 'true');
    setShowNotice(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-slate-50 to-teal-100 p-4 relative overflow-hidden" role="region" aria-label={isSignUp ? "Sign up" : "Login"}>
      {/* PERMANENT BACKGROUND LAYER - Do NOT conditionally render this */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Top-left Teal Orb */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-teal-300/30 blur-3xl animate-float-slow" />
        {/* Bottom-right Cyan Orb */}
        <div className="absolute -bottom-28 -right-20 w-[28rem] h-[28rem] rounded-full bg-cyan-200/40 blur-3xl animate-float-reverse" />
        {/* Center Accent Pulse */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] rounded-full bg-emerald-100/35 blur-[120px] animate-pulse-slow" />
        {/* Subtle grid pattern overlay for technical depth */}
        <div className="absolute inset-0 bg-[radial-gradient(#0d9488_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.12]" />
      </div>

      {/* CONDITIONAL FORM LAYER */}
      <div className="relative z-10 w-full max-w-md">
        {isSignUp ? (
          <SignUpForm onToggle={() => setIsSignUp(false)} onIntercept={() => setShowSignupWarning(true)} />
        ) : (
          <LoginForm onSuccess={onSuccess} onToggle={() => setIsSignUp(true)} />
        )}
      </div>

      {showNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="3" rx="2" />
                  <line x1="8" x2="16" y1="21" y2="21" />
                  <line x1="12" x2="12" y1="17" y2="21" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Platform in Active Development</h3>
                <p className="text-xs text-slate-500 font-medium">Recommended: Desktop View</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Sahāy is currently in its active development phase. For optimal performance, clinical analytics visualization, and responsive workflows, please access the platform in <strong>Desktop Mode</strong> or on a larger screen.
            </p>

            <button
              onClick={dismissNotice}
              className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              Understood, Proceed
            </button>
          </div>
        </div>
      )}

      {/* PASTED MODAL GOES HERE - Completely outside the form card */}
      {showSignupWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 animate-fade-in-up text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-2">Demo Mode Active</h3>

            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              Account creation is currently disabled. Since this is a demo environment, your data has not been saved. You will now be redirected to the default <strong>Ram Sharma (Demo Caretaker)</strong> dashboard.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSignupWarning(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowSignupWarning(false);
                  try {
                    const auth = await apiLogin({ email: 'ram', password: '12345678', role: 'CARETAKER' });
                    onSuccess(auth);
                  } catch (err) {
                    alert('Unable to log into demo account.');
                  }
                }}
                className="flex-1 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
              >
                Proceed to Demo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoginForm({ onSuccess, onToggle }: { onSuccess: (auth: AuthResponse) => void, onToggle: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async () => {
    if (busy) return;
    setError(null);
    const emailTrimmed = email.trim();
    if (!emailTrimmed || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      const auth = await apiLogin({ email: emailTrimmed, password, role: 'CARETAKER' });
      onSuccess(auth);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to log in. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 transition-all duration-500 hover:shadow-teal-900/5">

      <h1 className="auth-title">Sahāy Caregiver Portal</h1>
      <p className="auth-subtitle">Caregiver access only · manage therapy, analytics eth reminders</p>

      <form className="auth-form" noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <label className="auth-label" htmlFor="login-email">Email / Username</label>
        <input
          id="login-email"
          className="auth-input"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="auth-label" htmlFor="login-password">Password</label>
        <div className="relative w-full">
          <input
            id="login-password"
            className="auth-input pr-10"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition-colors p-1"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
            )}
          </button>
        </div>

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-xl shadow-md shadow-teal-600/20 transition-all duration-300 hover:shadow-teal-600/40 hover:-translate-y-0.5 flex items-center justify-center gap-2" disabled={busy}>
          {busy ? 'Signing in…' : 'Login as Caretaker'}
        </button>
      </form>

      {/* Clean Clinical Demo Access Card */}
      <div className="mt-6 rounded-2xl bg-teal-50/50 border border-teal-100 p-4 transition-all shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-2.5 w-2.5 rounded-full bg-teal-500 animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.6)]" />
          <p className="text-xs font-extrabold tracking-wide uppercase text-teal-900">
            Quick Demo Access
          </p>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 bg-white rounded-xl p-2.5 border border-teal-100/50 shadow-sm flex flex-col items-start transition-transform hover:-translate-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Username</span>
            <span className="text-teal-700 font-mono font-bold text-sm">ram</span>
          </div>
          <div className="flex-1 bg-white rounded-xl p-2.5 border border-teal-100/50 shadow-sm flex flex-col items-start transition-transform hover:-translate-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Password</span>
            <span className="text-teal-700 font-mono font-bold text-sm tracking-widest">12345678</span>
          </div>
        </div>
      </div>

      <p className="auth-switch">
        New here?{' '}
        <button type="button" className="auth-link" onClick={onToggle}>
          Create an account
        </button>
      </p>
    </div>
  );
}

function SignUpForm({ onToggle, onIntercept }: { onToggle: () => void, onIntercept: () => void }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Form intercept overrides the original apiSignup logic in demo environments.

  return (
    <div className="w-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 transition-all duration-500 hover:shadow-teal-900/5">

      <h1 className="auth-title">Create your Sahāy account</h1>
      <p className="auth-subtitle">Caregiver access only · monitor &amp; manage care plans</p>

      <form className="auth-form" noValidate onSubmit={(e) => { e.preventDefault(); onIntercept(); }}>
        <label className="auth-label" htmlFor="signup-name">Full name</label>
        <input
          id="signup-name"
          className="auth-input"
          type="text"
          autoComplete="name"
          placeholder="Rahul Saha"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <label className="auth-label" htmlFor="signup-email">Email / Username</label>
        <input
          id="signup-email"
          className="auth-input"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="auth-label" htmlFor="signup-password">
          Password <span className="auth-hint">(min 8 characters)</span>
        </label>
        <input
          id="signup-password"
          className="auth-input"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-xl shadow-md shadow-teal-600/20 transition-all duration-300 hover:shadow-teal-600/40 hover:-translate-y-0.5 flex items-center justify-center gap-2">
          Create Caretaker account
        </button>
      </form>

      <p className="auth-switch">
        Already have an account?{' '}
        <button type="button" className="auth-link" onClick={onToggle}>
          Log in
        </button>
      </p>
    </div>
  );
}