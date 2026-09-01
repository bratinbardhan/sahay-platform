import { useEffect, useRef, useState } from 'react';

import {
  waitForLeaflet,
  type LeafletCircle,
  type LeafletMap as LeafletMapInstance,
  type LeafletMarker,
  type LeafletNamespace,
} from '@/lib/leaflet';

interface LeafletMapProps {
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  /** Called when the caregiver clicks the map or drags the pin. */
  onPick: (lat: number, lng: number) => void;
}

const HOME_PIN_COLOR = '#E67E22';
const ZONE_COLOR = '#2C3E50';

/**
 * Interactive Leaflet map for safe-zone configuration: OpenStreetMap tiles,
 * a draggable home anchor pin, a live radius circle, and click-to-reposition.
 */
export function LeafletMap({ centerLat, centerLng, radiusMeters, onPick }: LeafletMapProps) {
  const containerIdRef = useRef(`sahay-map-${Math.random().toString(36).slice(2)}`);
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const circleRef = useRef<LeafletCircle | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  const [mapError, setMapError] = useState<string | null>(null);

  // Create map once.
  useEffect(() => {
    let cancelled = false;

    const boot = async (): Promise<void> => {
      const L = await waitForLeaflet();
      if (cancelled) {
        return;
      }
      if (!L) {
        setMapError('Map tiles could not be loaded (offline?). Coordinates can still be entered manually.');
        return;
      }
      const map = L.map(containerIdRef.current, {
        center: [centerLat, centerLng],
        zoom: 16,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      const marker = L.marker([centerLat, centerLng], {
        draggable: true,
        title: 'Home anchor',
      }).addTo(map);
      marker.bindTooltip('Home anchor — drag to reposition');
      marker.on('dragend', (event) => {
        const { lat, lng } = event.target.getLatLng();
        pickRef.current(lat, lng);
      });

      const circle = L.circle([centerLat, centerLng], {
        radius: radiusMeters,
        color: ZONE_COLOR,
        weight: 2,
        fillColor: HOME_PIN_COLOR,
        fillOpacity: 0.18,
      }).addTo(map);

      map.on('click', (event) => {
        pickRef.current(event.latlng.lat, event.latlng.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;
    };

    void boot();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync pin + circle when props change.
  useEffect(() => {
    const marker = markerRef.current;
    const circle = circleRef.current;
    const map = mapRef.current;
    if (!marker || !circle || !map) {
      return;
    }
    marker.setLatLng({ lat: centerLat, lng: centerLng });
    circle.setLatLng({ lat: centerLat, lng: centerLng });
    circle.setRadius(radiusMeters);
    map.setView([centerLat, centerLng]);
  }, [centerLat, centerLng, radiusMeters]);

  return (
    <div className="relative">
      <div id={containerIdRef.current} className="h-[420px] w-full rounded-xl border-2 border-[#2C3E50] z-0" />
      {mapError ? (
        <p className="mt-2 text-sm text-[#2C3E50]/70">{mapError}</p>
      ) : null}
    </div>
  );
}

/** Re-export so the page can apply the same colors to the draggable marker. */
export { HOME_PIN_COLOR, ZONE_COLOR, type LeafletNamespace };
