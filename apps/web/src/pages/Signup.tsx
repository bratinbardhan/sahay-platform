import { useState } from 'react';
import type { AuthResponse, UserRole } from '@sahay/types';

import { apiSignup } from '@/lib/auth';

interface SignupProps {
  onSuccess: (auth: AuthResponse) => void;
  onNavigate: (route: 'login') => void;
}

const ROLE_OPTIONS: ReadonlyArray<{ value: UserRole; label: string; hint: string }> = [
  { value: 'PATIENT', label: 'Patient', hint: 'Therapeutic games & calm therapy' },
  { value: 'CARETAKER', label: 'Caretaker', hint: 'Monitor & manage care plans' },
];

export function Signup({ onSuccess, onNavigate }: SignupProps) {
  const [role, setRole] = useState<UserRole>('CARETAKER');
  const [fullName, setFullName] = useState('');
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
      const auth = await apiSignup({
        email: emailTrimmed,
        password,
        full_name: nameTrimmed,
        role,
      });
      onSuccess(auth);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your account. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page" role="region" aria-label="Sign up">
      <div className="auth-card">
        <h1 className="auth-title">Create your Sahāy account</h1>
        <p className="auth-subtitle">Unified accounts · patients &amp; caretakers together</p>

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
            Email
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

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Creating account…' : `Create ${roleLabel} account`}
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