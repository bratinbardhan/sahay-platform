/**
 * Minimal typed subset of the Leaflet 1.9 API used by the caregiver geofence
 * editor. Leaflet itself is loaded from CDN (see index.html) so the app has
 * zero additional npm dependencies; this module surfaces it type-safely.
 */

export interface LeafletLatLng {
  lat: number;
  lng: number;
}

export interface LeafletMapOptions {
  center?: [number, number];
  zoom?: number;
}

export interface LeafletTileLayer {
  addTo(map: LeafletMap): LeafletTileLayer;
}

export interface LeafletCircle {
  addTo(map: LeafletMap): LeafletCircle;
  setLatLng(latlng: LeafletLatLng): LeafletCircle;
  setRadius(radius: number): LeafletCircle;
  remove(): void;
}

export interface LeafletMarker {
  addTo(map: LeafletMap): LeafletMarker;
  setLatLng(latlng: LeafletLatLng): LeafletMarker;
  bindTooltip(content: string): LeafletMarker;
  on(
    event: 'dragend',
    handler: (e: { target: { getLatLng(): LeafletLatLng } }) => void
  ): LeafletMarker;
  remove(): void;
}

export interface LeafletMap {
  setView(center: [number, number], zoom?: number): LeafletMap;
  on(event: 'click', handler: (e: { latlng: LeafletLatLng }) => void): LeafletMap;
  remove(): void;
}

export interface LeafletNamespace {
  map(id: string | HTMLElement, options?: LeafletMapOptions): LeafletMap;
  tileLayer(url: string, options?: { maxZoom?: number; attribution?: string }): LeafletTileLayer;
  circle(
    center: [number, number],
    options?: {
      radius?: number;
      color?: string;
      weight?: number;
      fillColor?: string;
      fillOpacity?: number;
    }
  ): LeafletCircle;
  marker(
    center: [number, number],
    options?: { draggable?: boolean; title?: string }
  ): LeafletMarker;
}

declare global {
  interface Window {
    L?: LeafletNamespace;
  }
}

export function getLeaflet(): LeafletNamespace | null {
  return typeof window !== 'undefined' ? window.L ?? null : null;
}

/** Waits briefly for the CDN script to be available (first paint race). */
export async function waitForLeaflet(attempts = 20): Promise<LeafletNamespace | null> {
  for (let i = 0; i < attempts; i += 1) {
    const L = getLeaflet();
    if (L) {
      return L;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
  return null;
}
