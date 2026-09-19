import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import { DB_NAME } from '@/config/constants';
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from '@/db/schema';
import { MockDatabase } from '@/db/MockDatabase';

const ENCRYPTION_KEY_ALIAS = 'sahay_sqlcipher_key';

// ---------------------------------------------------------------------------
// Module-level singleton instance
// ---------------------------------------------------------------------------

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Concurrency guard: tracks the in-flight initialization promise so that
 * concurrent callers share a single open() call instead of opening parallel
 * handles to the same OPFS file (which would deadlock on the exclusive
 * SyncAccessHandle lock).
 */
let dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// ---------------------------------------------------------------------------
// Web: globalThis-level store that survives hot-reloads
// ---------------------------------------------------------------------------
// React Fast Refresh re-evaluates this module on save, which resets the
// module-level `dbInstance` / `dbInitPromise` above back to null. The old
// SQLiteDatabase object is then garbage-collected, but the OPFS
// SyncAccessHandle lock it held lives on inside the browser's OPFS layer
// until the handle is explicitly closed — which never happens because we
// lost our reference to it.
//
// Storing the instance on globalThis means the next module evaluation can
// find and reuse the already-open handle instead of trying to create a
// second one (which throws NoModificationAllowedError).

const GLOBAL_DB_KEY = '__sahay_db_instance__';
const GLOBAL_INIT_PROMISE_KEY = '__sahay_db_init_promise__';

interface GlobalDbStore {
  [GLOBAL_DB_KEY]?: SQLite.SQLiteDatabase;
  [GLOBAL_INIT_PROMISE_KEY]?: Promise<SQLite.SQLiteDatabase>;
}

function getGlobalStore(): GlobalDbStore {
  return globalThis as unknown as GlobalDbStore;
}

// ---------------------------------------------------------------------------
// Web fallback storage for the SQLCipher encryption key.
// ---------------------------------------------------------------------------
// Browsers lack native keystore/keychain access, so on web we use
// localStorage (development-grade) — the database itself is not
// encrypted on web since SQLCipher is unavailable there regardless.

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

/**
 * Split a SQL script into individual statements and execute them one by one.
 * expo-sqlite's execAsync throws "out of memory" when given multiple statements
 * in a single call (especially with trailing semicolons or empty statements),
 * so we split by ';' and execute each trimmed statement individually.
 */
async function executeSqlStatements(
  db: SQLite.SQLiteDatabase,
  sql: string
): Promise<void> {
  const statements = sql
    .split(';')
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0);

  for (const statement of statements) {
    await db.execAsync(`${statement};`);
  }
}

// ---------------------------------------------------------------------------
// DatabaseService
// ---------------------------------------------------------------------------

export class DatabaseService {
  static async getDatabase(): Promise<SQLite.SQLiteDatabase> {
    // --- Fast path: module-level singleton is alive ---
    if (dbInstance) {
      return dbInstance;
    }

    const globalStore = getGlobalStore();

    // --- Web: recover instance from globalThis (survives hot reload) ---
    if (Platform.OS === 'web' && globalStore[GLOBAL_DB_KEY]) {
      dbInstance = globalStore[GLOBAL_DB_KEY];
      return dbInstance;
    }

    // --- Concurrency guard: reuse in-flight init promise ---
    if (dbInitPromise) {
      return dbInitPromise;
    }

    // --- Web: also check global init promise (survives hot reload) ---
    if (Platform.OS === 'web' && globalStore[GLOBAL_INIT_PROMISE_KEY]) {
      dbInitPromise = globalStore[GLOBAL_INIT_PROMISE_KEY]!;
      return dbInitPromise;
    }

    // --- Begin initialization ---
    dbInitPromise = this.initializeDatabase();

    // Web: mirror the init promise to globalThis for hot-reload survival
    if (Platform.OS === 'web') {
      globalStore[GLOBAL_INIT_PROMISE_KEY] = dbInitPromise;
    }

    try {
      return await dbInitPromise;
    } finally {
      // Clear the in-flight promise references once settled so a subsequent
      // call can retry if initialization failed.
      dbInitPromise = null;
      if (Platform.OS === 'web') {
        globalStore[GLOBAL_INIT_PROMISE_KEY] = undefined;
      }
    }
  }

  private static async initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
    const encryptionKey = await getOrCreateEncryptionKey();

    try {
      let db: SQLite.SQLiteDatabase;

      if (Platform.OS === 'web') {
        // Web: use the in-memory MockDatabase. expo-sqlite's web driver
        // (wa-sqlite + OPFS SyncAccessHandle) cannot run inside Metro's web
        // preview worker sandbox, so we avoid it entirely.
        db = new MockDatabase() as unknown as SQLite.SQLiteDatabase;
        await executeSqlStatements(db, CREATE_TABLES_SQL);
      } else {
        // Native: SQLCipher is available.
        db = await SQLite.openDatabaseAsync(DB_NAME);
        await db.execAsync(
          `PRAGMA key = '${escapePragmaKey(encryptionKey)}';`
        );
        await executeSqlStatements(db, CREATE_TABLES_SQL);
      }

      // --- Migration bookkeeping ---
      const migration = await db.getFirstAsync<{ version: number }>(
        'SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1'
      );

      if (!migration) {
        await db.runAsync(
          'INSERT INTO schema_migrations (version) VALUES (?)',
          SCHEMA_VERSION
        );
      } else if (migration.version < SCHEMA_VERSION) {
        await db.runAsync(
          'UPDATE schema_migrations SET version = ? WHERE version = ?',
          SCHEMA_VERSION,
          migration.version
        );
      }

      // --- Store singleton ---
      dbInstance = db;
      if (Platform.OS === 'web') {
        getGlobalStore()[GLOBAL_DB_KEY] = db;
      }

      return db;
    } catch (error) {
      console.error(
        '[DatabaseService] initialization failed; app will continue without database:',
        error
      );
      if (!dbInstance) {
        throw error;
      }
      return dbInstance;
    }
  }

  static async close(): Promise<void> {
    if (dbInstance) {
      await dbInstance.closeAsync();
      dbInstance = null;
    }
    if (Platform.OS === 'web') {
      const globalStore = getGlobalStore();
      if (globalStore[GLOBAL_DB_KEY]) {
        try {
          await globalStore[GLOBAL_DB_KEY]!.closeAsync();
        } catch {
          // ignore -- handle may already be dead
        }
        globalStore[GLOBAL_DB_KEY] = undefined;
      }
      globalStore[GLOBAL_INIT_PROMISE_KEY] = undefined;
    }
  }
}

export default DatabaseService;
