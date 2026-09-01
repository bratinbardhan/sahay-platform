import type { GeofenceZone } from '@sahay/types';

import { DatabaseService } from '@/db/DatabaseService';

const DEMO_GEOFENCE_ID = '44444444-4444-4444-8444-444444444444';
/** Shillong, Meghalaya (NER) — demo home anchor. */
const DEMO_HOME_LAT = 25.5941;
const DEMO_HOME_LNG = 91.7362;

type GeofenceZoneRow = {
  id: string;
  patient_id: string;
  zone_name: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  is_active: number;
};

export type PendingGeofenceAlertRow = {
  id: string;
  patient_id: string;
  lat: number;
  lng: number;
  breach_timestamp: string;
  attempts: number;
};

function mapZoneRow(row: GeofenceZoneRow): GeofenceZone {
  return {
    id: row.id,
    patient_id: row.patient_id,
    zone_name: row.zone_name,
    center_lat: row.center_lat,
    center_lng: row.center_lng,
    radius_meters: row.radius_meters,
    is_active: row.is_active === 1,
  };
}

/** Active safe zones the background daemon registers as OS geofences. */
export async function getActiveGeofenceZones(
  patientId: string
): Promise<GeofenceZone[]> {
  const db = await DatabaseService.getDatabase();
  const rows = await db.getAllAsync<GeofenceZoneRow>(
    `SELECT id, patient_id, zone_name, center_lat, center_lng, radius_meters, is_active
     FROM geofence_zones
     WHERE patient_id = ? AND is_active = 1
     ORDER BY zone_name ASC`,
    patientId
  );
  return rows.map(mapZoneRow);
}

/** Queue an offline breach so it can be dispatched once signal returns. */
export async function queueGeofenceAlert(input: {
  id: string;
  patientId: string;
  lat: number;
  lng: number;
  breachTimestamp: string;
}): Promise<void> {
  const db = await DatabaseService.getDatabase();
  await db.runAsync(
    `INSERT INTO pending_geofence_alerts (id, patient_id, lat, lng, breach_timestamp)
     VALUES (?, ?, ?, ?, ?)`,
    input.id,
    input.patientId,
    input.lat,
    input.lng,
    input.breachTimestamp
  );
}

export async function getPendingGeofenceAlerts(
  limit = 50
): Promise<PendingGeofenceAlertRow[]> {
  const db = await DatabaseService.getDatabase();
  return db.getAllAsync<PendingGeofenceAlertRow>(
    `SELECT id, patient_id, lat, lng, breach_timestamp, attempts
     FROM pending_geofence_alerts
     ORDER BY created_at ASC
     LIMIT ?`,
    limit
  );
}

export async function deleteGeofenceAlert(id: string): Promise<void> {
  const db = await DatabaseService.getDatabase();
  await db.runAsync('DELETE FROM pending_geofence_alerts WHERE id = ?', id);
}

export async function incrementGeofenceAlertAttempts(id: string): Promise<void> {
  const db = await DatabaseService.getDatabase();
  await db.runAsync(
    'UPDATE pending_geofence_alerts SET attempts = attempts + 1 WHERE id = ?',
    id
  );
}

/** Seed a demo home zone so the daemon has a boundary in local development. */
export async function seedDemoGeofenceZoneIfNeeded(patientId: string): Promise<void> {
  const db = await DatabaseService.getDatabase();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM geofence_zones WHERE id = ?',
    DEMO_GEOFENCE_ID
  );
  if (existing) {
    return;
  }
  await db.runAsync(
    `INSERT INTO geofence_zones (
       id, patient_id, zone_name, center_lat, center_lng, radius_meters, is_active
     ) VALUES (?, ?, 'Home', ?, ?, 250, 1)`,
    DEMO_GEOFENCE_ID,
    patientId,
    DEMO_HOME_LAT,
    DEMO_HOME_LNG
  );
}