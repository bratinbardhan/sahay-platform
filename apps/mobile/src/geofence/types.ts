/** A GEOFENCE_EXIT transition delivered by the OS geofence boundary. */
export interface GeofenceExitEvent {
  zoneId: string;
  lat: number;
  lng: number;
  timestamp: string;
  /** True when delivered by the headless task after app termination/reboot. */
  isHeadless?: boolean;
}