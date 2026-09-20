import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';

import { API_BASE_URL } from '@/config/apiConfig';
import { DatabaseService } from '@/db/DatabaseService';

export type TelemetryPayload = Record<string, boolean | number | string | null>;

export type TelemetryQueueEvent = {
  id: string;
  event_type: string;
  payload: string;
  created_at: number;
  status: 'PENDING' | 'SYNCING' | 'SYNCED';
  retry_count: number;
};

const TELEMETRY_ENDPOINT = `${API_BASE_URL}/api/v1/telemetry/events`;

export class SyncQueueService {
  private static unsubscribe: (() => void) | null = null;
  private static flushPromise: Promise<void> | null = null;

  static async enqueueEvent(
    eventType: string,
    payload: TelemetryPayload
  ): Promise<string> {
    const id = Crypto.randomUUID();
    const db = await DatabaseService.getDatabase();
    await db.runAsync(
      `INSERT INTO telemetry_sync_queue
       (id, event_type, payload, created_at, status, retry_count)
       VALUES (?, ?, ?, ?, 'PENDING', 0)`,
      id,
      eventType,
      JSON.stringify(payload),
      Date.now()
    );
    return id;
  }

  static async getPendingEvents(): Promise<TelemetryQueueEvent[]> {
    const db = await DatabaseService.getDatabase();
    return db.getAllAsync<TelemetryQueueEvent>(
      `SELECT id, event_type, payload, created_at, status, retry_count
       FROM telemetry_sync_queue
       WHERE status = 'PENDING'
       ORDER BY created_at ASC`
    );
  }

  static async markSynced(id: string): Promise<void> {
    const db = await DatabaseService.getDatabase();
    await db.runAsync(
      `UPDATE telemetry_sync_queue SET status = 'SYNCED' WHERE id = ?`,
      id
    );
  }

  static async incrementRetry(id: string): Promise<void> {
    const db = await DatabaseService.getDatabase();
    await db.runAsync(
      `UPDATE telemetry_sync_queue
       SET status = 'PENDING', retry_count = retry_count + 1
       WHERE id = ?`,
      id
    );
  }

  static startNetworkListener(): void {
    if (this.unsubscribe) {
      return;
    }
    this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        void this.flush();
      }
    });
    void NetInfo.fetch().then((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        void this.flush();
      }
    });
  }

  static stopNetworkListener(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  static async flush(): Promise<void> {
    if (this.flushPromise) {
      return this.flushPromise;
    }
    this.flushPromise = this.flushPending();
    try {
      await this.flushPromise;
    } finally {
      this.flushPromise = null;
    }
  }

  private static async flushPending(): Promise<void> {
    const network = await NetInfo.fetch();
    if (!network.isConnected || network.isInternetReachable === false) {
      return;
    }
    const events = await this.getPendingEvents();
    for (const event of events) {
      const delayMs = Math.min(30_000, 500 * 2 ** Math.min(event.retry_count, 6));
      const jitterMs = Math.floor(Math.random() * 300);
      if (event.retry_count > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, delayMs + jitterMs));
      }
      try {
        const response = await fetch(TELEMETRY_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: event.id,
            event_type: event.event_type,
            payload: JSON.parse(event.payload) as TelemetryPayload,
            created_at: event.created_at,
          }),
        });
        if (!response.ok) {
          throw new Error(`Telemetry sync failed with HTTP ${response.status}`);
        }
        await this.markSynced(event.id);
      } catch (error) {
        console.warn('[SyncQueueService] telemetry sync deferred', error);
        await this.incrementRetry(event.id);
      }
    }
  }
}

