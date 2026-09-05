import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import { DB_NAME } from '@/config/constants';
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from '@/db/schema';

const ENCRYPTION_KEY_ALIAS = 'sahay_sqlcipher_key';

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Web fallback storage for the SQLCipher encryption key.
 * Browsers lack native keystore/keychain access, so on web we use
 * localStorage (development-grade) — the database itself is not
 * encrypted on web since SQLCipher is unavailable there regardless.
 */
const WebKeyStore = {
  getItem(alias: string): string | null {
    try {
      return window.localStorage.getItem(alias);
    } catch {
      return null;
    }
  },
  setItem(alias: string, value: string): void {
    try {
      window.localStorage.setItem(alias, value);
    } catch {
      // localStorage may be unavailable in private mode; fail silently
    }
  },
};

async function getOrCreateEncryptionKey(): Promise<string> {
  if (Platform.OS === 'web') {
    const existing = WebKeyStore.getItem(ENCRYPTION_KEY_ALIAS);
    if (existing) {
      return existing;
    }

    const randomBytes = await Crypto.getRandomBytesAsync(32);
    const key = Array.from(randomBytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    WebKeyStore.setItem(ENCRYPTION_KEY_ALIAS, key);
    return key;
  }

  // Native (iOS / Android) — use hardware-backed SecureStore
  const existing = await SecureStore.getItemAsync(ENCRYPTION_KEY_ALIAS);
  if (existing) {
    return existing;
  }

  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const key = Array.from(randomBytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  await SecureStore.setItemAsync(ENCRYPTION_KEY_ALIAS, key, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

  return key;
}

/** Escape single quotes for safe use in PRAGMA key string literal. */
function escapePragmaKey(key: string): string {
  return key.replace(/'/g, "''");
}

export class DatabaseService {
  static async getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (dbInstance) {
      return dbInstance;
    }

    const encryptionKey = await getOrCreateEncryptionKey();

    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
    await dbInstance.execAsync(`PRAGMA key = '${escapePragmaKey(encryptionKey)}';`);
    await dbInstance.execAsync(CREATE_TABLES_SQL);

    const migration = await dbInstance.getFirstAsync<{ version: number }>(
      'SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1'
    );

    if (!migration) {
      await dbInstance.runAsync(
        'INSERT INTO schema_migrations (version) VALUES (?)',
        SCHEMA_VERSION
      );
    } else if (migration.version < SCHEMA_VERSION) {
      // CREATE_TABLES_SQL is idempotent (IF NOT EXISTS) so upgrading installs
      // pick up new v2 tables automatically; just bump the stored version.
      await dbInstance.runAsync(
        'UPDATE schema_migrations SET version = ? WHERE version = ?',
        SCHEMA_VERSION,
        migration.version
      );
    }

    return dbInstance;
  }

  static async close(): Promise<void> {
    if (dbInstance) {
      await dbInstance.closeAsync();
      dbInstance = null;
    }
  }
}

export default DatabaseService;
