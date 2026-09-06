import type { User } from '@sahay/types';

const SESSION_KEY = 'sahay.auth.session';

export interface StoredSession {
  accessToken: string;
  user: User;
}

/** Load the persisted session from localStorage (returns null when absent/corrupt). */
export function loadSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (!parsed.accessToken || !parsed.user?.role || !parsed.user?.tier) {
      return null;
    }
    return parsed as StoredSession;
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession): void {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // localStorage may be unavailable in private mode; fail silently
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // no-op
  }
}