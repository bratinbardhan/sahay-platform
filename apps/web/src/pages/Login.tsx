import { useState } from 'react';
import type { AuthResponse, UserRole } from '@sahay/types';

import { apiLogin } from '@/lib/auth';

interface LoginProps {
  onSuccess: (auth: AuthResponse) => void;
  onNavigate: (route: 'signup') => void;
}

const ROLE_OPTIONS: ReadonlyArray<{ value: UserRole; label: string; hint: string }> = [
  { value: 'PATIENT', label: 'Patient', hint: 'Therapeutic games & calm therapy' },
  { value: 'CARETAKER', label: 'Caretaker', hint: 'Monitor & manage care plans' },
];

export function Login({ onSuccess, onNavigate }: LoginProps) {
  const [role, setRole] = useState<UserRole>('CARETAKER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const roleLabel = ROLE_OPTIONS.find((option) => option.value === role)?.label ?? 'Caretaker';

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
      const auth = await apiLogin({ email: emailTrimmed, password, role });
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
        <p className="auth-subtitle">One account · sign in as a Patient or Caretaker</p>

        <div className="role-switch" role="tablist" aria-label="Account role">
          {ROLE_OPTIONS.map((option) => {
            const active = option.value === role;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setRole(option.value)}
                className={`role-pill ${active ? 'role-pill-active' : ''}`}
              >
                <span className="role-pill-title">{option.label}</span>
                <span className="role-pill-hint">{option.hint}</span>
              </button>
            );
          })}
        </div>

        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label className="auth-label" htmlFor="login-email">
            Email
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
            {busy ? 'Signing in…' : `Login as ${roleLabel}`}
          </button>
        </form>

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