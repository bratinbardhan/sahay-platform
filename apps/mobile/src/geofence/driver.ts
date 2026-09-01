import type { GeofenceZone } from '@sahay/types';

import type { GeofenceExitEvent } from '@/geofence/types';

/** Pluggable OS-level geofence boundary registration. */
export interface GeofenceDriver {
  readonly name: string;
  /** Returns true when the OS boundary registration succeeded. */
  register(zones: GeofenceZone[]): Promise<boolean>;
  clear(): Promise<void>;
  onZoneExit(handler: (event: GeofenceExitEvent) => void): void;
}

export function loadBackgroundGeolocation(): SahayBgGeoApi | null {
  try {
    const mod = require('react-native-background-geolocation') as
      | SahayBgGeoApi
      | null
      | undefined;
    return mod ?? null;
  } catch {
    // Native module not linked in this build — fall back to the inert driver.
    return null;
  }
}

class TransistorsoftDriver implements GeofenceDriver {
  readonly name = 'react-native-background-geolocation';

  private exitHandler: ((event: GeofenceExitEvent) => void) | null = null;

  constructor(private readonly bg: SahayBgGeoApi) {}

  async register(zones: GeofenceZone[]): Promise<boolean> {
    if (zones.length === 0) {
      return false;
    }

    // Headless configuration: survive app termination and device reboots so
    // anti-wandering monitoring never depends on the patient opening Sahāy.
    await this.bg.ready({
      desiredAccuracy: this.bg.DESIRED_ACCURACY_HIGH,
      distanceFilter: 25,
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
      heartbeatInterval: 60,
      logLevel: this.bg.LOG_LEVEL_WARNING,
    });

    // Replace any stale boundaries from a previous session.
    await this.bg.removeGeofences().catch(() => undefined);

    await this.bg.addGeofences(
      zones.map((zone) => ({
        identifier: zone.id,
        latitude: zone.center_lat,
        longitude: zone.center_lng,
        radius: zone.radius_meters,
        notifyOnEntry: false,
        notifyOnExit: true,
        notifyOnDwell: false,
      }))
    );

    this.bg.on('geofence', this.handleGeofenceEvent);
    await this.bg.start();
    return true;
  }

  async clear(): Promise<void> {
    await this.bg.removeGeofences().catch(() => undefined);
  }

  onZoneExit(handler: (event: GeofenceExitEvent) => void): void {
    this.exitHandler = handler;
  }

  private handleGeofenceEvent = (event: SahayBgGeoGeofenceEvent): void => {
    if (event.action !== 'EXIT') {
      return;
    }
    this.exitHandler?.({
      zoneId: event.identifier,
      lat: event.location.coords.latitude,
      lng: event.location.coords.longitude,
      timestamp: event.location.timestamp || new Date().toISOString(),
    });
  };
}

/**
 * Inert fallback used when the native geofence module is not linked (e.g. the
 * Expo Go sandbox). The offline breach queue remains fully functional; only
 * the OS boundary registration is unavailable.
 */
class InertDriver implements GeofenceDriver {
  readonly name = 'inert (react-native-background-geolocation not linked)';

  async register(zones: GeofenceZone[]): Promise<boolean> {
    console.warn(
      `[GeofenceManager] ${zones.length} safe zone(s) loaded but no native geofence driver is linked; boundary monitoring disabled.`
    );
    return false;
  }

  async clear(): Promise<void> {
    // Nothing registered.
  }

  onZoneExit(): void {
    // No OS transitions without a native driver.
  }
}

export function createGeofenceDriver(): GeofenceDriver {
  const bg = loadBackgroundGeolocation();
  return bg ? new TransistorsoftDriver(bg) : new InertDriver();
}