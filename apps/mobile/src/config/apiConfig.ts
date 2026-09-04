/**
 * Runtime API configuration for the Sahāy mobile client.
 *
 * Resolution priority (highest first):
 *   1. `EXPO_PUBLIC_API_URL` env var — set via `.env` for local dev, or via
 *      EAS environment variables for staging / production builds.
 *   2. `http://localhost:8000` — last-resort fallback (only works on iOS
 *      Simulator and Android Emulator, **never** on a physical Android device
 *      where `localhost` resolves to the device itself).
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  ⚠  Before testing on a physical device, always set the env var:    │
 * │  EXPO_PUBLIC_API_URL=http://<your-dev-machine-LAN-IP>:8000           │
 * │  in `apps/mobile/.env` (see `.env.example`).                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

function resolveApiBaseUrl(): string {
  // Expo bakes EXPO_PUBLIC_* env vars into the native binary at build time.
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.replace(/\/+$/, '');
  }

  // Last resort — works only on simulators / emulators
  // eslint-disable-next-line no-console
  console.warn(
    '[Sahāy] EXPO_PUBLIC_API_URL is not set. Falling back to localhost:8000 ' +
      '(iOS Simulator / Android Emulator only). On a physical Android device, ' +
      'set EXPO_PUBLIC_API_URL to your dev machine LAN IP — see apps/mobile/.env.example.'
  );
  return 'http://localhost:8000';
}

export const API_BASE_URL: string = resolveApiBaseUrl();

export const SYNC_ENDPOINT: string = `${API_BASE_URL}/api/v1/sync/delta`;

export const GEOFENCE_ALERT_ENDPOINT: string = `${API_BASE_URL}/api/v1/geofence/alert`;

