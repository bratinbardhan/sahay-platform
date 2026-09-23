import { useState } from 'react';
import type { AuthResponse } from '@sahay/types';

import { apiLogin, apiSignup } from '@/lib/auth';

interface LoginProps {
  onSuccess: (auth: AuthResponse) => void;
  onNavigate?: (route: 'signup' | 'login') => void;
}

export function Login({ onSuccess }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);

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
          <SignUpForm onSuccess={onSuccess} onToggle={() => setIsSignUp(false)} />
        ) : (
          <LoginForm onSuccess={onSuccess} onToggle={() => setIsSignUp(true)} />
        )}
      </div>
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

        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Login as Caretaker'}
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
        <button type="button" className="auth-link" onClick={onToggle}>
          Create an account
        </button>
      </p>
    </div>
  );
}

function SignUpForm({ onSuccess, onToggle }: { onSuccess: (auth: AuthResponse) => void, onToggle: () => void }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setError(null);
    const emailTrimmed = email.trim();
    const nameTrimmed = fullName.trim();
    if (!nameTrimmed || !emailTrimmed || !password) {
      setError('Please fill in your full name, email and password.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    setBusy(true);
    try {
      const auth = await apiSignup({ email: emailTrimmed, password, full_name: nameTrimmed, role: 'CARETAKER' });
      onSuccess(auth);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your account. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 transition-all duration-500 hover:shadow-teal-900/5">
      <h1 className="auth-title">Create your Sahāy account</h1>
      <p className="auth-subtitle">Caregiver access only · monitor &amp; manage care plans</p>

      <form className="auth-form" noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
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

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? 'Creating account…' : 'Create Caretaker account'}
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