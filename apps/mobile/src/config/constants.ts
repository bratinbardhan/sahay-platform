export { colors, MIN_TOUCH_DP } from '@/theme/colors';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export const SYNC_ENDPOINT = `${API_BASE_URL}/api/v1/sync/delta`;

export const GEOFENCE_ALERT_ENDPOINT = `${API_BASE_URL}/api/v1/geofence/alert`;

/** How often the offline breach queue is retried (cellular polling worker). */
export const GEOFENCE_FLUSH_INTERVAL_MS = 30_000;

export const DB_NAME = 'sahay_encrypted.db';
