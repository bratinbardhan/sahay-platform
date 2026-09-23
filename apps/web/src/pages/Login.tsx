import { useState } from 'react';
import type { AuthResponse } from '@sahay/types';

import { apiLogin } from '@/lib/auth';

interface LoginProps {
  onSuccess: (auth: AuthResponse) => void;
  onNavigate: (route: 'signup') => void;
}

export function Login({ onSuccess, onNavigate }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async () => {
    if (busy) {
      return;
    }
    setError(null);
    const emailTrimmed = email.trim();
    if (!emailTrimmed || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      // The Web portal is exclusive to caretakers — role is hardcoded.

      const auth = await apiLogin({ email: emailTrimmed, password, role: 'CARETAKER' });
      onSuccess(auth);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to log in. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10 w-full">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 relative z-10 animate-fade-in-up">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-700 to-cyan-600 mb-2 tracking-tight">
            Welcome to Sahāy
          </h1>
          <p className="text-slate-500 font-medium">Log in to access your clinical dashboard</p>
        </div>

        <form
          className="auth-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label className="auth-label" htmlFor="login-email">
            Email / Username
          </label>
          <input
            id="login-email"
            className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 focus:bg-white transition-all duration-300"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <label className="auth-label" htmlFor="login-password">
            Password
          </label>
          <div className="relative w-full">
            <input
              id="login-password"
              className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 focus:bg-white transition-all duration-300 pr-10"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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

          {error ? <p className="auth-error" role="alert">{error}</p> : null}

          <button type="submit" className="w-full bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:-translate-y-0.5 transition-all duration-300 active:translate-y-0 flex items-center justify-center gap-2" disabled={busy}>
            {busy ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : 'Login as Caretaker'}
          </button>
        </form>

        {/* Clinical High-Contrast Demo Access Card */}
        <div className="mt-6 rounded-2xl bg-slate-900/90 text-white p-4 shadow-lg shadow-slate-900/10 border border-slate-800">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-xs font-semibold tracking-wider uppercase text-slate-300">
              Quick Demo Access
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-slate-800/80 rounded-xl p-2 border border-slate-700/60">
              <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-sans font-medium mb-0.5">Username</span>
              <span className="text-emerald-400 font-bold text-sm tracking-wide">ram</span>
            </div>
            <div className="bg-slate-800/80 rounded-xl p-2 border border-slate-700/60">
              <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-sans font-medium mb-0.5">Password</span>
              <span className="text-emerald-400 font-bold text-sm tracking-wide">12345678</span>
            </div>
          </div>
        </div>

        <p className="auth-switch">
          New here?{' '}
          <button type="button" className="auth-link" onClick={() => onNavigate('signup')}>
            Create an account
          </button>
        </p>
      </div>
    </div>
  );
}