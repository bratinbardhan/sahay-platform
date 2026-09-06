import React from 'react';

interface SyncStatusIndicatorProps {
  lastSyncTimestamp?: Date | string | null;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ lastSyncTimestamp }) => {
  const lastSync = lastSyncTimestamp ? new Date(lastSyncTimestamp) : null;
  const isSynced = lastSync && (new Date().getTime() - lastSync.getTime()) < 5 * 60 * 1000;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
        isSynced ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${isSynced ? 'bg-green-500' : 'bg-amber-500'}`} />
      {isSynced ? 'Online & Synced' : 'Offline / Cached'}
    </div>
  );
};
