import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { PatientProfile } from '@sahay/types';

import { DatabaseService } from '@/db/DatabaseService';
import { getActivePatient, seedLocalPatientIfNeeded } from '@/db/patientRepository';
import { seedDemoGeofenceZoneIfNeeded } from '@/db/geofenceRepository';
import { GeofenceManager } from '@/geofence/GeofenceManager';
import { SyncManager } from '@/sync/SyncManager';

type PatientContextValue = {
  patient: PatientProfile | null;
  ready: boolean;
  refresh: () => Promise<void>;
};

const PatientContext = createContext<PatientContextValue | null>(null);

export function PatientProvider({ children }: { children: ReactNode }) {
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    await DatabaseService.getDatabase();
    await seedLocalPatientIfNeeded();
    const next = await getActivePatient();
    if (next) {
      await seedDemoGeofenceZoneIfNeeded(next.id);
    }
    setPatient(next);
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
    SyncManager.startBackgroundSync();
    // Wire the offline ledger sync hook — posts unsynced ledger entries
    // to POST /api/v1/ledger/transaction when network is reachable.
    SyncManager.startLedgerSync();
    void GeofenceManager.start();
    GeofenceManager.startFlushWorker();
    return () => {
      SyncManager.stopBackgroundSync();
      SyncManager.stopLedgerSync();
      GeofenceManager.stopFlushWorker();
    };
  }, []);

  const value = useMemo(
    () => ({
      patient,
      ready,
      refresh,
    }),
    [patient, ready, refresh]
  );

  return <PatientContext.Provider value={value}>{children}</PatientContext.Provider>;
}

export function usePatient(): PatientContextValue {
  const ctx = useContext(PatientContext);
  if (!ctx) {
    throw new Error('usePatient must be used within PatientProvider');
  }
  return ctx;
}
