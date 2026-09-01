export const SCHEMA_VERSION = 2;

export const CREATE_TABLES_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS patient_profiles (
  id TEXT PRIMARY KEY NOT NULL,
  caregiver_id TEXT NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 0),
  assigned_gds_stage INTEGER NOT NULL CHECK (assigned_gds_stage BETWEEN 1 AND 7),
  primary_language TEXT NOT NULL DEFAULT 'en',
  demitoken_balance INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_patient_profiles_caregiver_id
  ON patient_profiles (caregiver_id);

CREATE TABLE IF NOT EXISTS gameplay_session_logs (
  id TEXT PRIMARY KEY NOT NULL,
  patient_id TEXT NOT NULL,
  game_module_id TEXT NOT NULL,
  gds_stage INTEGER NOT NULL CHECK (gds_stage BETWEEN 1 AND 7),
  difficulty_level INTEGER NOT NULL DEFAULT 1,
  tasks_presented INTEGER NOT NULL DEFAULT 0,
  tasks_completed_cleanly INTEGER NOT NULL DEFAULT 0,
  tasks_guided INTEGER NOT NULL DEFAULT 0,
  avg_latency_ms REAL NOT NULL DEFAULT 0,
  demitokens_earned INTEGER NOT NULL DEFAULT 0,
  sync_status TEXT NOT NULL DEFAULT 'PENDING_SYNC'
    CHECK (sync_status IN ('PENDING_SYNC', 'SYNCED', 'SYNC_FAILED')),
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patient_profiles (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gameplay_session_logs_patient_id
  ON gameplay_session_logs (patient_id);
CREATE INDEX IF NOT EXISTS idx_gameplay_session_logs_sync_status
  ON gameplay_session_logs (sync_status);

CREATE TABLE IF NOT EXISTS reminiscence_media (
  id TEXT PRIMARY KEY NOT NULL,
  patient_id TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('PHOTO', 'VOICE')),
  file_url TEXT NOT NULL,
  label_text TEXT NOT NULL DEFAULT '',
  relation_tag TEXT NOT NULL DEFAULT '',
  event_year INTEGER,
  checksum_sha256 TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patient_profiles (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reminiscence_media_patient_id
  ON reminiscence_media (patient_id);

CREATE TABLE IF NOT EXISTS geofence_zones (
  id TEXT PRIMARY KEY NOT NULL,
  patient_id TEXT NOT NULL,
  zone_name TEXT NOT NULL,
  center_lat REAL NOT NULL,
  center_lng REAL NOT NULL,
  radius_meters REAL NOT NULL CHECK (radius_meters > 0),
  is_active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (patient_id) REFERENCES patient_profiles (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_geofence_zones_patient_id
  ON geofence_zones (patient_id);

-- v2: offline anti-wandering breach queue. Breaches detected while the device
-- has no connectivity are cached here and flushed by the background worker
-- (GeofenceManager.startFlushWorker) once cellular/data signal returns.
CREATE TABLE IF NOT EXISTS pending_geofence_alerts (
  id TEXT PRIMARY KEY NOT NULL,
  patient_id TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  breach_timestamp TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patient_profiles (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pending_geofence_alerts_patient_id
  ON pending_geofence_alerts (patient_id);
`;
