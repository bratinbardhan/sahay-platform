import { CloudOff, Radio } from 'lucide-react';
import { SAHAY_CARETAKER } from '@/lib/palette';

interface SyncStatusIndicatorProps {
  lastSyncTimestamp?: Date | string | null;
  pendingQueueCount?: number;
  connected?: boolean;
}

/**
 * Caretaker-only connectivity pill. Reflects FastAPI delta-sync state and the
 * pending offline queue that will flush on reconnect.
 */
export function SyncStatusIndicator({
  lastSyncTimestamp,
  pendingQueueCount = 0,
  connected,
}: SyncStatusIndicatorProps) {
  const lastSync = lastSyncTimestamp ? new Date(lastSyncTimestamp) : null;
  const recent =
    lastSync !== null && Number.isFinite(lastSync.getTime())
      ? Date.now() - lastSync.getTime() < 5 * 60 * 1000
      : false;
  const isSynced = connected ?? recent;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border-2 shadow-caretaker-card transition-all duration-care ease-care ${
        isSynced
          ? 'bg-sahay-ok-soft text-sahay-ok-ink border-sahay-ok'
          : 'bg-sahay-warn-soft text-sahay-warn-ink border-sahay-warn'
      }`}
    >
      {isSynced ? (
        <Radio className="w-5 h-5 md:w-6 md:h-6" style={{ color: SAHAY_CARETAKER.okInk }} />
      ) : (
        <CloudOff className="w-5 h-5 md:w-6 md:h-6" style={{ color: SAHAY_CARETAKER.warnInk }} />
      )}
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: isSynced ? SAHAY_CARETAKER.ok : SAHAY_CARETAKER.warn }}
      />
      {isSynced ? 'FastAPI delta sync live' : 'Offline — queue held locally'}
      <span className="rounded-full bg-sahay-surface px-2 py-0.5 text-[10px] font-bold text-sahay-ink">
        {pendingQueueCount} pending
      </span>
    </div>
  );
}
