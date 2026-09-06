export type SyncStatus = 'PENDING_SYNC' | 'SYNCED' | 'SYNC_FAILED';

export type MediaType = 'PHOTO' | 'VOICE';

// ─── Unified auth (Phase 1) ────────────────────────────────────────────────
export type UserRole = 'ADMIN' | 'CARETAKER' | 'PATIENT';
export type UserTier = 'FREE' | 'PREMIUM';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  tier: UserTier;
  is_active: boolean;
  last_seen_at?: string | null;
  created_at: string;
}

/** Payload sent to POST /api/v1/admin/users/{user_id}/tier */
export interface TierUpdateRequest {
  tier: UserTier;
}

/** A single user row surfaced in the admin management table. */
export interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  tier: UserTier;
  is_active: boolean;
  last_active_at?: string | null;
  created_at: string;
}

export interface AdminUsersPage {
  items: AdminUser[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface OnlineUsersResponse {
  online_users: number;
  window_seconds: number;
}

export interface OverviewResponse {
  total_users: number;
  total_patients: number;
  total_caretakers: number;
  premium_user_count: number;
  premium_conversion_rate_pct: number;
  online_users: number;
  total_sessions: number;
  total_screen_time_seconds: number;
  average_session_length_seconds: number;
  stage_distribution: Record<string, number>;
  game_activity_breakdown: Record<string, number>;
}

export interface HeartbeatResponse {
  last_seen_at: string;
}

/** Payload sent to POST /api/v1/auth/login */
export interface LoginRequest {
  email: string;
  password: string;
  role?: UserRole;
}

/** Payload sent to POST /api/v1/auth/signup */
export interface SignupRequest {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

/** Response from POST /api/v1/auth/login and POST /api/v1/auth/signup */
export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

/** Response from GET /api/v1/auth/me */
export type MeResponse = User;

export interface PatientProfile {
  id: string;
  caregiver_id: string;
  name: string;
  age: number;
  assigned_gds_stage: number;
  primary_language: string;
  demitoken_balance: number;
  streak_days: number;
  created_at: string;
}

export interface GameplaySessionLog {
  id: string;
  patient_id: string;
  game_module_id: string;
  gds_stage: number;
  difficulty_level: number;
  tasks_presented: number;
  tasks_completed_cleanly: number;
  tasks_guided: number;
  avg_latency_ms: number;
  demitokens_earned: number;
  sync_status: SyncStatus;
  timestamp: string;
}

export interface ReminiscenceMedia {
  id: string;
  patient_id: string;
  media_type: MediaType;
  file_url: string;
  label_text: string;
  relation_tag: string;
  event_year: number | null;
  checksum_sha256: string;
}

export interface GeofenceZone {
  id: string;
  patient_id: string;
  zone_name: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  is_active: boolean;
}

/** Payload sent from mobile to POST /api/v1/sync/delta */
export interface DeltaSyncPayload {
  session_logs: GameplaySessionLog[];
  token_updates: TokenBalanceUpdate[];
}

export interface TokenBalanceUpdate {
  patient_id: string;
  demitoken_balance: number;
  streak_days: number;
}

/** Response from POST /api/v1/sync/delta */
export interface DeltaSyncResponse {
  synced_session_log_ids: string[];
  synced_token_update_patient_ids: string[];
}

/** Payload sent from mobile to POST /api/v1/geofence/zone (caregiver zone config). */
export interface GeofenceZoneUpsertPayload {
  id?: string;
  patient_id: string;
  zone_name: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  is_active: boolean;
}

/** Payload sent from mobile to POST /api/v1/geofence/alert on a GEOFENCE_EXIT transition. */
export interface GeofenceAlertPayload {
  patient_id: string;
  lat: number;
  lng: number;
  device_timestamp?: string;
  /** True when the alert was queued offline and flushed once connectivity returned. */
  is_offline_breach?: boolean;
}

export interface GeofenceZoneCheckResult {
  zone_id: string;
  zone_name: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  distance_from_center_m: number;
  breach: boolean;
}

/** Response from POST /api/v1/geofence/alert */
export interface GeofenceAlertResult {
  breach_detected: boolean;
  zone_checks: GeofenceZoneCheckResult[];
  sms_alert_triggered: boolean;
  sms_mocked?: boolean;
  sms_recipients?: string[];
  sms_message?: string | null;
}

export const GDS_STAGE_MIN = 1;
export const GDS_STAGE_MAX = 7;

export function isValidGdsStage(stage: number): boolean {
  return Number.isInteger(stage) && stage >= GDS_STAGE_MIN && stage <= GDS_STAGE_MAX;
}
