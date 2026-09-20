import AsyncStorage from '@react-native-async-storage/async-storage';

type QueuePayload = Record<string, boolean | number | string | null>;
type QueueItem = { id: string; type: 'telemetry' | 'gameplay'; payload: QueuePayload };

export class SyncQueue {
  private static STORAGE_KEY = '@sahay_sync_queue';
  private static inMemoryQueue: QueueItem[] = [];

  static async enqueue(type: QueueItem['type'], payload: QueuePayload): Promise<void> {
    const item = { id: Date.now().toString(), type, payload };
    this.inMemoryQueue.push(item);
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.inMemoryQueue));
    } catch (e) {
      console.error('Failed to persist sync queue', e);
      // Fallback: inMemoryQueue is already updated
    }
  }

  static async getPendingBatches(): Promise<QueueItem[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.inMemoryQueue = parsed.filter((item): item is QueueItem => {
            if (!item || typeof item !== 'object') return false;
            const candidate = item as Record<string, unknown>;
            return typeof candidate.id === 'string' &&
              (candidate.type === 'telemetry' || candidate.type === 'gameplay') &&
              typeof candidate.payload === 'object' && candidate.payload !== null;
          });
        }
      }
    } catch (e) {
      console.error('Failed to load sync queue', e);
    }
    return this.inMemoryQueue;
  }

  static async clearBatches(ids: string[]): Promise<void> {
    this.inMemoryQueue = this.inMemoryQueue.filter(item => !ids.includes(item.id));
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.inMemoryQueue));
    } catch (e) {
      console.error('Failed to persist sync queue', e);
    }
  }
}
