import React from 'react';
import { SAHAY_CARETAKER } from '@/lib/palette';


interface SyncStatusIndicatorProps {
  lastSyncTimestamp?: Date | string | null;
}

/**
 * Caretaker-only connectivity pill. Sync health is caretaker telemetry, so it
 * uses the dashboard severity tokens (`ok` / `warn`) rather than raw hues.
 */
export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ lastSyncTimestamp }) => {
  const lastSync = lastSyncTimestamp ? new Date(lastSyncTimestamp) : null;
  const isSynced = lastSync && new Date().getTime() - lastSync.getTime() < 5 * 60 * 1000;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
        isSynced
          ? 'bg-sahay-ok-soft text-sahay-ok-ink'
          : 'bg-sahay-warn-soft text-sahay-warn-ink'
      }`}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: isSynced ? SAHAY_CARETAKER.ok : SAHAY_CARETAKER.warn }}
      />
      {isSynced ? 'Online & Synced' : 'Offline / Cached'}
    </div>
  );
};
