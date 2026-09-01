import type { GeofenceZone } from '@sahay/types';

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance in meters between two WGS-84 points (haversine). */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = Math.PI / 180;
  const phi1 = lat1 * toRad;
  const phi2 = lat2 * toRad;
  const deltaPhi = (lat2 - lat1) * toRad;
  const deltaLambda = (lng2 - lng1) * toRad;

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

export interface ZoneBreachEvaluation {
  breached: boolean;
  nearestZone: GeofenceZone | null;
  nearestDistanceM: number;
}

/**
 * Locally re-verify a GEOFENCE_EXIT against every active zone before
 * dispatching, so spurious OS transitions never raise false alarms.
 */
export function evaluateBreach(
  lat: number,
  lng: number,
  zones: GeofenceZone[]
): ZoneBreachEvaluation {
  let breached = zones.length > 0;
  let nearestZone: GeofenceZone | null = null;
  let nearestDistanceM = Number.POSITIVE_INFINITY;

  for (const zone of zones) {
    const distance = haversineMeters(lat, lng, zone.center_lat, zone.center_lng);
    if (distance < nearestDistanceM) {
      nearestDistanceM = distance;
      nearestZone = zone;
    }
    if (distance <= zone.radius_meters) {
      breached = false;
    }
  }

  return { breached, nearestZone, nearestDistanceM };
}