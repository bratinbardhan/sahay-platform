export { colors, MIN_TOUCH_DP } from '@/theme/colors';

// Re-export runtime API config (resolved in apiConfig.ts via env / app.json extra)
export { API_BASE_URL, SYNC_ENDPOINT, GEOFENCE_ALERT_ENDPOINT } from '@/config/apiConfig';

/** How often the offline breach queue is retried (cellular polling worker). */
export const GEOFENCE_FLUSH_INTERVAL_MS = 30_000;

export const DB_NAME = 'sahay_encrypted.db';
