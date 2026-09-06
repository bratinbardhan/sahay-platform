import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { User } from '@sahay/types';

const SESSION_KEY = 'sahay.auth.session';

/**
 * Web fallback for the auth session.
 * Browsers lack a hardware-backed keystore, so on web we use localStorage
 * (development-grade) — mirroring the encryption-key fallback in
 * `db/DatabaseService.ts`.
 */
const WebSessionStorage = {
  getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // localStorage may be unavailable in private mode; fail silently
    }
  },
  removeItem(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // no-op on failure
    }
  },
};

export interface StoredSession {
  accessToken: string;
  user: User;
}

/** Hydrate a pending session from secure storage, validating the shape. */
export async function loadSession(): Promise<StoredSession | null> {
  const raw =
    Platform.OS === 'web'
      ? WebSessionStorage.getItem(SESSION_KEY)
      : await SecureStore.getItemAsync(SESSION_KEY);
  return parseSession(raw);
}

/** Persist the session token + profile for offline restarts. */
export async function saveSession(session: StoredSession): Promise<void> {
  const serialized = JSON.stringify(session);
  if (Platform.OS === 'web') {
    WebSessionStorage.setItem(SESSION_KEY, serialized);
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, serialized, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

/** Remove the persisted session on logout (and on rejected tokens). */
export async function clearSession(): Promise<void> {
  if (Platform.OS === 'web') {
    WebSessionStorage.removeItem(SESSION_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

function parseSession(raw: string | null): StoredSession | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (
      !parsed.accessToken ||
      !parsed.user ||
      !parsed.user.id ||
      !parsed.user.role ||
      !parsed.user.tier
    ) {
      return null;
    }
    return parsed as StoredSession;
  } catch {
    return null;
  }
}