/**
 * Ambient declarations for the optional `react-native-background-geolocation`
 * native module (Transistorsoft). The dependency is declared in package.json;
 * the driver resolves it lazily at runtime so the app still boots (with an
 * inert driver) on builds where the native module is not linked.
 *
 * Only the API subset used by Sahāy's anti-wandering daemon is declared.
 */

declare function require(moduleName: string): unknown;

interface SahayBgGeoGeofenceConfig {
  identifier: string;
  latitude: number;
  longitude: number;
  radius: number;
  notifyOnEntry: boolean;
  notifyOnExit: boolean;
  notifyOnDwell: boolean;
  loiteringDelay?: number;
}

interface SahayBgGeoGeofenceEvent {
  identifier: string;
  action: 'ENTER' | 'EXIT';
  location: {
    coords: { latitude: number; longitude: number };
    timestamp: string;
  };
}

interface SahayBgGeoReadyConfig {
  desiredAccuracy: number;
  distanceFilter: number;
  stopOnTerminate: boolean;
  startOnBoot: boolean;
  enableHeadless: boolean;
  heartbeatInterval: number;
  logLevel: number;
}

interface SahayBgGeoHeadlessEvent {
  name: string;
  params?: Record<string, unknown>;
}

interface SahayBgGeoApi {
  readonly DESIRED_ACCURACY_HIGH: number;
  readonly LOG_LEVEL_WARNING: number;
  on(event: 'geofence', callback: (event: SahayBgGeoGeofenceEvent) => void): void;
  on(event: string, callback: (event: unknown) => void): void;
  ready(config: Partial<SahayBgGeoReadyConfig>): Promise<unknown>;
  start(): Promise<unknown>;
  addGeofences(configs: SahayBgGeoGeofenceConfig[]): Promise<void>;
  removeGeofences(): Promise<void>;
  registerHeadlessTask(
    task: (event: SahayBgGeoHeadlessEvent) => Promise<void>
  ): void;
}