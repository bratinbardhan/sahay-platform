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
    <div className="auth-page" role="region" aria-label="Login">
      <div className="auth-card">
        <h1 className="auth-title">Sahāy Caregiver Portal</h1>
        <p className="auth-subtitle">Caregiver access only · manage therapy, analytics eth reminders</p>

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
            className="auth-input"
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
          <input
            id="login-password"
            className="auth-input"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {error ? <p className="auth-error" role="alert">{error}</p> : null}

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Login as Caretaker'}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-2">
          Demo Caretaker: <b>ram</b> / <b>12345678</b>
        </p>

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