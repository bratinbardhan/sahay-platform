import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User, UserRole } from '@sahay/types';

import { apiFetchMe, apiLogin, apiSignup, AuthApiError } from '@/auth/api';
import { clearSession, loadSession, saveSession } from '@/auth/storage';

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string, role: UserRole) => Promise<User>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole
  ) => Promise<User>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore a persisted session on cold start (offline-safe).
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      try {
        const session = await loadSession();
        if (!session) {
          return;
        }
        try {
          const fresh = await apiFetchMe(session.accessToken);
          if (!cancelled) {
            setUser(fresh);
            setToken(session.accessToken);
          }
        } catch (error) {
          if (error instanceof AuthApiError && error.status === 401) {
            await clearSession();
          } else if (!cancelled) {
            // Offline / server unreachable — trust the cached session for now.
            setUser(session.user);
            setToken(session.accessToken);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistSession = useCallback(async (accessToken: string, nextUser: User) => {
    setToken(accessToken);
    setUser(nextUser);
    await saveSession({ accessToken, user: nextUser });
  }, []);

  const signIn = useCallback(
    async (email: string, password: string, role: UserRole): Promise<User> => {
      const auth = await apiLogin({ email, password, role });
      await persistSession(auth.access_token, auth.user);
      return auth.user;
    },
    [persistSession]
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      role: UserRole
    ): Promise<User> => {
      const auth = await apiSignup({ email, password, full_name: fullName, role });
      await persistSession(auth.access_token, auth.user);
      return auth.user;
    },
    [persistSession]
  );

  const signOut = useCallback(async () => {
    setToken(null);
    setUser(null);
    await clearSession();
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, signIn, signUp, signOut }),
    [user, token, loading, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}