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
    <div className="auth-page" role="region" aria-label="Sign up">
      <div className="auth-card">
        <h1 className="auth-title">Create your Sahāy account</h1>
        <p className="auth-subtitle">Caregiver access only · monitor &amp; manage care plans</p>

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

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Creating account…' : 'Create Caretaker account'}
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