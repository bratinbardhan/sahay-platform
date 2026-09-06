import * as Crypto from 'expo-crypto';

import { DatabaseService } from '@/db/DatabaseService';

/**
 * Transaction types mirrored from the backend `TransactionType` enum.
 */
export type LedgerTransactionType =
  | 'GAMEPLAY_REWARD'
  | 'DAILY_CHECKIN'
  | 'STREAK_BONUS'
  | 'ASSESSMENT_PENALTY'
  | 'REDEMPTION'
  | 'SYNC_ADJUSTMENT';

export type LedgerEntry = {
  id: string;
  patient_id: string;
  amount: number;
  transaction_type: LedgerTransactionType;
  balance_after: number;
  reference_id: string | null;
  metadata: string;
  synced: number;
  created_at: string;
};

/**
 * LedgerService — auditable token ledger for the mobile client.
 *
 * Replaces raw `UPDATE demitoken_balance = demitoken_balance + ?` increments
 * with append-only ledger entries. The verified balance is always SUM(amount)
 * over the patient's ledger rows.
 */
export class LedgerService {
  /**
   * Record a new ledger transaction atomically.
   *
   * Inserts a ledger row and updates the cached balance in patient_profiles
   * within a single SQLite transaction.
   */
  static async recordTransaction(
    patientId: string,
    amount: number,
    type: LedgerTransactionType,
    referenceId?: string,
    metadata?: Record<string, unknown>
  ): Promise<{ id: string; balanceAfter: number }> {
    if (amount === 0) {
      throw new Error('Ledger transaction amount must be nonzero');
    }

    const db = await DatabaseService.getDatabase();
    const id = Crypto.randomUUID();
    let balanceAfter = 0;

    await db.withTransactionAsync(async () => {
      // Compute current balance from the ledger sum
      const existing = await db.getFirstAsync<{ total: number }>(
        'SELECT COALESCE(SUM(amount), 0) as total FROM demitoken_ledger WHERE patient_id = ?',
        patientId
      );
      const currentBalance = existing?.total ?? 0;
      balanceAfter = currentBalance + amount;

      await db.runAsync(
        `INSERT INTO demitoken_ledger (
          id, patient_id, amount, transaction_type, balance_after,
          reference_id, metadata, synced, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))`,
        id,
        patientId,
        amount,
        type,
        balanceAfter,
        referenceId ?? null,
        JSON.stringify(metadata ?? {})
      );

      // Keep the cached balance in patient_profiles for fast home-screen reads
      await db.runAsync(
        'UPDATE patient_profiles SET demitoken_balance = ? WHERE id = ?',
        balanceAfter,
        patientId
      );
    });

    return { id, balanceAfter };
  }

  /**
   * Get the verified balance for a patient — SUM(amount) over all ledger rows.
   */
  static async getBalance(patientId: string): Promise<number> {
    const db = await DatabaseService.getDatabase();
    const row = await db.getFirstAsync<{ total: number }>(
      'SELECT COALESCE(SUM(amount), 0) as total FROM demitoken_ledger WHERE patient_id = ?',
      patientId
    );
    return row?.total ?? 0;
  }

  /**
   * Get the cached balance from patient_profiles (fast read).
   */
  static async getCachedBalance(patientId: string): Promise<number> {
    const db = await DatabaseService.getDatabase();
    const row = await db.getFirstAsync<{ demitoken_balance: number }>(
      'SELECT demitoken_balance FROM patient_profiles WHERE id = ?',
      patientId
    );
    return row?.demitoken_balance ?? 0;
  }

  /**
   * Get paginated transaction history for a patient, newest first.
   */
  static async getHistory(
    patientId: string,
    page = 1,
    pageSize = 20
  ): Promise<{ total: number; entries: LedgerEntry[] }> {
    const db = await DatabaseService.getDatabase();
    const offset = (page - 1) * pageSize;

    const totalRow = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM demitoken_ledger WHERE patient_id = ?',
      patientId
    );

    const entries = await db.getAllAsync<LedgerEntry>(
      `SELECT id, patient_id, amount, transaction_type, balance_after,
              reference_id, metadata, synced, created_at
       FROM demitoken_ledger
       WHERE patient_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      patientId,
      pageSize,
      offset
    );

    return { total: totalRow?.count ?? 0, entries };
  }

  /**
   * Get all unsynced ledger entries for a patient.
   */
  static async getUnsynced(patientId: string): Promise<LedgerEntry[]> {
    const db = await DatabaseService.getDatabase();
    return db.getAllAsync<LedgerEntry>(
      `SELECT id, patient_id, amount, transaction_type, balance_after,
              reference_id, metadata, synced, created_at
       FROM demitoken_ledger
       WHERE patient_id = ? AND synced = 0
       ORDER BY created_at ASC`,
      patientId
    );
  }

  /**
   * Mark a list of ledger entries as synced.
   */
  static async markSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await DatabaseService.getDatabase();
    await db.withTransactionAsync(async () => {
      for (const id of ids) {
        await db.runAsync(
          'UPDATE demitoken_ledger SET synced = 1 WHERE id = ?',
          id
        );
      }
    });
  }
}

export default LedgerService;