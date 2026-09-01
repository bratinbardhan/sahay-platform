import type {
  GeofenceAlertPayload,
  GeofenceAlertResult,
  GeofenceZoneUpsertPayload,
} from '@sahay/types';

const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000';

const GEOFENCE_ZONE_ENDPOINT = `${API_BASE_URL}/api/v1/geofence/zone`;

async function postJson<TResponse>(url: string, body: unknown): Promise<TResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`API ${response.status}: ${detail}`);
  }
  return (await response.json()) as TResponse;
}

/** Persist a caregiver-configured safe zone (create or update by id). */
export function saveGeofenceZone(
  payload: GeofenceZoneUpsertPayload
): Promise<GeofenceZoneUpsertPayload & { id: string }> {
  return postJson(GEOFENCE_ZONE_ENDPOINT, payload);
}

/** Dispatch an anti-wandering breach alert (used by manual test tools). */
export function sendGeofenceAlert(payload: GeofenceAlertPayload): Promise<GeofenceAlertResult> {
  return postJson(`${API_BASE_URL}/api/v1/geofence/alert`, payload);
}

export interface GeocodedPlace {
  displayName: string;
  lat: number;
  lng: number;
}

/**
 * Address lookup via OpenStreetMap Nominatim (keyless, fair-use compliant).
 * Used by the caregiver to place the home anchor pin by address search.
 */
export async function searchAddress(query: string): Promise<GeocodedPlace[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(
    query
  )}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Address search failed (${response.status})`);
  }
  const results = (await response.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
  }>;
  return results.map((result) => ({
    displayName: result.display_name,
    lat: Number.parseFloat(result.lat),
    lng: Number.parseFloat(result.lon),
  }));
}
