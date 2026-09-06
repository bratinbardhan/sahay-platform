import AsyncStorage from '@react-native-async-storage/async-storage';

export class SyncQueue {
  private static STORAGE_KEY = '@sahay_sync_queue';
  private static inMemoryQueue: any[] = [];

  static async enqueue(type: 'telemetry' | 'gameplay', payload: any) {
    const item = { id: Date.now().toString(), type, payload };
    this.inMemoryQueue.push(item);
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.inMemoryQueue));
    } catch (e) {
      console.error('Failed to persist sync queue', e);
      // Fallback: inMemoryQueue is already updated
    }
  }

  static async getPendingBatches(): Promise<any[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.inMemoryQueue = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load sync queue', e);
    }
    return this.inMemoryQueue;
  }

  static async clearBatches(ids: string[]) {
    this.inMemoryQueue = this.inMemoryQueue.filter(item => !ids.includes(item.id));
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.inMemoryQueue));
    } catch (e) {
      console.error('Failed to persist sync queue', e);
    }
  }
}
