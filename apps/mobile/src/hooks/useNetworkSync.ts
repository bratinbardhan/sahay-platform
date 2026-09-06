import { useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { SyncQueue } from '../services/sync/SyncQueue';

export function useNetworkSync() {
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      if (state.isConnected) {
        drainQueue();
      }
    });
    return () => unsubscribe();
  }, []);
}

async function drainQueue() {
  const batches = await SyncQueue.getPendingBatches();
  if (batches.length === 0) return;

  // Mock API call to /api/v1/sync/push
  console.log('Draining queue...', batches);
  // On success:
  // await SyncQueue.clearBatches(batches.map(b => b.id));
}
