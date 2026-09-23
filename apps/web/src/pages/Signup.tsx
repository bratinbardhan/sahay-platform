import { useState } from 'react';
import type { AuthResponse } from '@sahay/types';

import { apiSignup } from '@/lib/auth';

interface SignupProps {
  onSuccess: (auth: AuthResponse) => void;
  onNavigate: (route: 'login') => void;
}

export function Signup({ onSuccess, onNavigate }: SignupProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) {
      return;
    }
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
      // The Web portal is exclusive to caretakers — role is hardcoded.

      const auth = await apiSignup({
        email: emailTrimmed,
        password,
        full_name: nameTrimmed,
        role: 'CARETAKER',
      });
      onSuccess(auth);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your account. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10 w-full" role="region" aria-label="Sign up">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 relative z-10 animate-fade-in-up">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-700 to-cyan-600 mb-2 tracking-tight">
            Create your Sahāy account
          </h1>
          <p className="text-slate-500 font-medium">Caregiver access only · monitor &amp; manage care plans</p>
        </div>

        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label className="auth-label" htmlFor="signup-name">
            Full name
          </label>
          <input
            id="signup-name"
            className="auth-input"
            type="text"
            autoComplete="name"
            placeholder="Rahul Saha"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />

          <label className="auth-label" htmlFor="signup-email">
            Email / Username
          </label>
          <input
            id="signup-email"
            className="auth-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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
            onChange={(event) => setPassword(event.target.value)}
          />

          {error ? <p className="auth-error" role="alert">{error}</p> : null}

          <button type="submit" className="w-full bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:-translate-y-0.5 transition-all duration-300 active:translate-y-0 flex items-center justify-center gap-2" disabled={busy}>
            {busy ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : 'Create Caretaker account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <button type="button" className="auth-link" onClick={() => onNavigate('login')}>
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}