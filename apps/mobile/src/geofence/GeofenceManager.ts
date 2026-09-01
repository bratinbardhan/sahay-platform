import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import type { GeofenceAlertPayload, GeofenceAlertResult } from '@sahay/types';

import { playSoothingPacifier } from '@/audio/pacifier';
import {
  GEOFENCE_ALERT_ENDPOINT,
  GEOFENCE_FLUSH_INTERVAL_MS,
} from '@/config/constants';
import {
  deleteGeofenceAlert,
  getActiveGeofenceZones,
  getPendingGeofenceAlerts,
  incrementGeofenceAlertAttempts,
  queueGeofenceAlert,
} from '@/db/geofenceRepository';
import { getActivePatient } from '@/db/patientRepository';
import {
  createGeofenceDriver,
  loadBackgroundGeolocation,
  type GeofenceDriver,
} from '@/geofence/driver';
import { evaluateBreach } from '@/geofence/geo';
import type { GeofenceExitEvent } from '@/geofence/types';

/**
 * Anti-wandering background geofence daemon.
 *
 * Online path:      GEOFENCE_EXIT -> POST /api/v1/geofence/alert immediately.
 * Offline fallback: cache the breach in SQLite (pending_geofence_alerts),
 *                   play the soothing caregiver pacifier locally, and let the
 *                   persistent flush worker dispatch once signal returns.
 */
export class GeofenceManager {
  private static driver: GeofenceDriver | null = null;
  private static starting: Promise<void> | null = null;
  private static flushInterval: ReturnType<typeof setInterval> | null = null;
  private static isFlushing = false;

  static async start(): Promise<void> {
    if (this.driver || this.starting) {
      return;
    }
    this.starting = this.initialize().finally(() => {
      this.starting = null;
    });
    await this.starting;
  }

  private static async initialize(): Promise<void> {
    try {
      const patient = await getActivePatient();
      if (!patient) {
        return;
      }

      const zones = await getActiveGeofenceZones(patient.id);
      const driver = createGeofenceDriver();
      const registered = await driver.register(zones);
      if (!registered) {
        return;
      }

      driver.onZoneExit((event) => {
        void this.handleZoneExit(event);
      });
      this.driver = driver;

      // Register the headless task so exits fired after app termination or a
      // device reboot are still delivered to the alert pipeline.
      this.registerHeadlessTask();
    } catch (error) {
      console.warn('[GeofenceManager] daemon start failed:', error);
    }
  }

  /** Handle a GEOFENCE_EXIT transition (foreground or headless). */
  static async handleZoneExit(event: GeofenceExitEvent): Promise<void> {
    try {
      const patient = await getActivePatient();
      if (!patient) {
        return;
      }

      // Re-verify locally: a patient inside another active zone is not a breach.
      const zones = await getActiveGeofenceZones(patient.id);
      const evaluation = evaluateBreach(event.lat, event.lng, zones);
      if (!evaluation.breached) {
        return;
      }

      const payload: GeofenceAlertPayload = {
        patient_id: patient.id,
        lat: event.lat,
        lng: event.lng,
        device_timestamp: event.timestamp,
      };

      const online = await isOnline();
      if (online && (await this.postAlert(payload))) {
        return;
      }

      // Offline fallback: queue the SMS payload for the flush worker and
      // immediately soothe the patient with the pre-recorded caregiver audio.
      await queueGeofenceAlert({
        id: Crypto.randomUUID(),
        patientId: patient.id,
        lat: event.lat,
        lng: event.lng,
        breachTimestamp: event.timestamp,
      });
      if (!online) {
        await playSoothingPacifier();
      }
    } catch (error) {
      console.warn('[GeofenceManager] zone exit handling failed:', error);
    }
  }

  /** Persistent worker: polls connectivity and dispatches queued breaches. */
  static startFlushWorker(intervalMs = GEOFENCE_FLUSH_INTERVAL_MS): void {
    if (this.flushInterval) {
      return;
    }
    void this.flushPendingAlerts();
    this.flushInterval = setInterval(() => {
      void this.flushPendingAlerts();
    }, intervalMs);
  }

  static stopFlushWorker(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  static async flushPendingAlerts(): Promise<void> {
    if (this.isFlushing) {
      return;
    }
    try {
      if (!(await isOnline())) {
        return;
      }
      this.isFlushing = true;
      const pending = await getPendingGeofenceAlerts();
      for (const alert of pending) {
        const payload: GeofenceAlertPayload = {
          patient_id: alert.patient_id,
          lat: alert.lat,
          lng: alert.lng,
          device_timestamp: alert.breach_timestamp,
          is_offline_breach: true,
        };
        if (await this.postAlert(payload)) {
          await deleteGeofenceAlert(alert.id);
        } else {
          await incrementGeofenceAlertAttempts(alert.id);
        }
      }
    } catch (error) {
      console.warn('[GeofenceManager] offline alert flush failed:', error);
    } finally {
      this.isFlushing = false;
    }
  }

  /** Re-register boundaries (e.g. after the caregiver updates safe zones). */
  static async refreshZones(): Promise<void> {
    if (!this.driver) {
      return;
    }
    try {
      const patient = await getActivePatient();
      if (!patient) {
        return;
      }
      const zones = await getActiveGeofenceZones(patient.id);
      await this.driver.register(zones);
    } catch (error) {
      console.warn('[GeofenceManager] zone refresh failed:', error);
    }
  }

  private static registerHeadlessTask(): void {
    const bg = loadBackgroundGeolocation();
    if (!bg) {
      return;
    }
    bg.registerHeadlessTask(async (event) => {
      if (event.name !== 'geofence') {
        return;
      }
      const params = event.params as
        | {
            identifier?: string;
            action?: string;
            location?: {
              coords?: { latitude?: number; longitude?: number };
              timestamp?: string;
            };
          }
        | undefined;
      if (
        params?.action !== 'EXIT' ||
        typeof params.location?.coords?.latitude !== 'number' ||
        typeof params.location?.coords?.longitude !== 'number'
      ) {
        return;
      }
      await this.handleZoneExit({
        zoneId: params.identifier ?? 'unknown',
        lat: params.location.coords.latitude,
        lng: params.location.coords.longitude,
        timestamp: params.location.timestamp || new Date().toISOString(),
        isHeadless: true,
      });
    });
  }

  private static async postAlert(payload: GeofenceAlertPayload): Promise<boolean> {
    try {
      const response = await fetch(GEOFENCE_ALERT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        return false;
      }
      await response.json() as GeofenceAlertResult;
      return true;
    } catch {
      return false;
    }
  }
}

async function isOnline(): Promise<boolean> {
  const network = await NetInfo.fetch();
  return network.isConnected === true && network.isInternetReachable !== false;
}