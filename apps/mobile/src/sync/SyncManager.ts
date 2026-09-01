import NetInfo from '@react-native-community/netinfo';
import type {
  DeltaSyncPayload,
  DeltaSyncResponse,
  GameplaySessionLog,
  PatientProfile,
  SyncStatus,
  TokenBalanceUpdate,
} from '@sahay/types';

import { SYNC_ENDPOINT } from '@/config/constants';
import { DatabaseService } from '@/db/DatabaseService';

type SessionLogRow = {
  id: string;
  patient_id: string;
  game_module_id: string;
  gds_stage: number;
  difficulty_level: number;
  tasks_presented: number;
  tasks_completed_cleanly: number;
  tasks_guided: number;
  avg_latency_ms: number;
  demitokens_earned: number;
  sync_status: SyncStatus;
  timestamp: string;
};

type PatientRow = {
  id: string;
  caregiver_id: string;
  name: string;
  age: number;
  assigned_gds_stage: number;
  primary_language: string;
  demitoken_balance: number;
  streak_days: number;
  created_at: string;
};

export class SyncManager {
  private static isRunning = false;
  private static intervalId: ReturnType<typeof setInterval> | null = null;

  /** Start periodic background sync (default every 60 seconds). */
  static startBackgroundSync(intervalMs = 60_000): void {
    if (this.intervalId) {
      return;
    }

    void this.syncPendingRecords();

    this.intervalId = setInterval(() => {
      void this.syncPendingRecords();
    }, intervalMs);
  }

  static stopBackgroundSync(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  static async syncPendingRecords(): Promise<DeltaSyncResponse | null> {
    if (this.isRunning) {
      return null;
    }

    const network = await NetInfo.fetch();
    if (!network.isConnected || network.isInternetReachable === false) {
      return null;
    }

    this.isRunning = true;

    try {
      const db = await DatabaseService.getDatabase();
      const pendingLogs = await db.getAllAsync<SessionLogRow>(
        `SELECT id, patient_id, game_module_id, gds_stage, difficulty_level,
                tasks_presented, tasks_completed_cleanly, tasks_guided,
                avg_latency_ms, demitokens_earned, sync_status, timestamp
         FROM gameplay_session_logs
         WHERE sync_status = 'PENDING_SYNC'
         ORDER BY timestamp ASC
         LIMIT 500`
      );

      const patients = await db.getAllAsync<PatientRow>(
        'SELECT * FROM patient_profiles'
      );

      const tokenUpdates: TokenBalanceUpdate[] = patients.map((patient) => ({
        patient_id: patient.id,
        demitoken_balance: patient.demitoken_balance,
        streak_days: patient.streak_days,
      }));

      if (pendingLogs.length === 0 && tokenUpdates.length === 0) {
        return null;
      }

      const payload: DeltaSyncPayload = {
        session_logs: pendingLogs.map(mapSessionLogRow),
        token_updates: tokenUpdates,
      };

      const response = await fetch(SYNC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Sync failed with status ${response.status}`);
      }

      const result = (await response.json()) as DeltaSyncResponse;

      await db.withTransactionAsync(async () => {
        for (const id of result.synced_session_log_ids) {
          await db.runAsync(
            `UPDATE gameplay_session_logs SET sync_status = 'SYNCED' WHERE id = ?`,
            id
          );
        }
      });

      return result;
    } catch (error) {
      console.warn('[SyncManager] Delta sync failed:', error);
      return null;
    } finally {
      this.isRunning = false;
    }
  }
}

function mapSessionLogRow(row: SessionLogRow): GameplaySessionLog {
  return {
    id: row.id,
    patient_id: row.patient_id,
    game_module_id: row.game_module_id,
    gds_stage: row.gds_stage,
    difficulty_level: row.difficulty_level,
    tasks_presented: row.tasks_presented,
    tasks_completed_cleanly: row.tasks_completed_cleanly,
    tasks_guided: row.tasks_guided,
    avg_latency_ms: row.avg_latency_ms,
    demitokens_earned: row.demitokens_earned,
    sync_status: row.sync_status,
    timestamp: row.timestamp,
  };
}

export type { PatientProfile };

export default SyncManager;
