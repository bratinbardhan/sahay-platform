import { useEffect, useRef, useState } from 'react';

import {
  waitForLeaflet,
  type LeafletCircle,
  type LeafletDivIcon,
  type LeafletMap as LeafletMapInstance,
  type LeafletMarker,
  type LeafletNamespace,
} from '@/lib/leaflet';

import { SAHAY_CARETAKER } from '@/lib/palette';

interface LeafletMapProps {
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  /** Called when the caregiver clicks the map or drags the pin. */
  onPick: (lat: number, lng: number) => void;
  breached?: boolean;
}

/** Clinical teal home pin — caretaker geofence spec. */
const HOME_PIN_COLOR = '#00B0B0';
/** Safe-radius outline — caretaker muted / border token. */
const ZONE_COLOR = '#60747E';
const BREACH_PIN_COLOR = SAHAY_CARETAKER.alert;

function pinHtml(color: string, pulse: boolean): string {
  const ping = pulse
    ? `<span style="position:absolute;inset:-8px;border-radius:9999px;background:${color};opacity:0.45;animation:sahay-pin-ping 1.2s cubic-bezier(0,0,0.2,1) infinite;"></span>`
    : '';
  return `<div style="position:relative;width:22px;height:22px;">${ping}<span style="position:absolute;inset:0;border-radius:9999px;background:${color};border:2px solid #2C3E50;box-shadow:0 2px 8px rgba(44,62,80,0.28);"></span></div>`;
}

function makePin(L: LeafletNamespace, breached: boolean): LeafletDivIcon {
  return L.divIcon({
    className: 'sahay-home-pin',
    html: pinHtml(breached ? BREACH_PIN_COLOR : HOME_PIN_COLOR, breached),
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export function LeafletMap({
  centerLat,
  centerLng,
  radiusMeters,
  onPick,
  breached = false,
}: LeafletMapProps) {
  const containerIdRef = useRef(`sahay-map-${Math.random().toString(36).slice(2)}`);
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const circleRef = useRef<LeafletCircle | null>(null);
  const leafletRef = useRef<LeafletNamespace | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const boot = async (): Promise<void> => {
      const L = await waitForLeaflet();
      if (cancelled) {
        return;
      }
      if (!L) {
        setMapError(
          'Map tiles could not be loaded (offline?). Coordinates can still be entered manually.'
        );
        return;
      }
      leafletRef.current = L;
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
        icon: makePin(L, breached),
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
        fillColor: breached ? BREACH_PIN_COLOR : HOME_PIN_COLOR,
        fillOpacity: breached ? 0.22 : 0.16,
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

  useEffect(() => {
    const marker = markerRef.current;
    const circle = circleRef.current;
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!marker || !circle || !map) {
      return;
    }
    marker.setLatLng({ lat: centerLat, lng: centerLng });
    if (L) {
      marker.setIcon(makePin(L, breached));
    }
    circle.setLatLng({ lat: centerLat, lng: centerLng });
    circle.setRadius(radiusMeters);
    circle.setStyle({
      color: ZONE_COLOR,
      fillColor: breached ? BREACH_PIN_COLOR : HOME_PIN_COLOR,
      fillOpacity: breached ? 0.22 : 0.16,
    });
    map.setView([centerLat, centerLng]);
  }, [centerLat, centerLng, radiusMeters, breached]);

  return (
    <div className="relative">
      <style>
        {`@keyframes sahay-pin-ping { 0% { transform: scale(1); opacity: 0.55; } 75%, 100% { transform: scale(2.1); opacity: 0; } }`}
      </style>
      <div
        id={containerIdRef.current}
        className="h-[420px] w-full rounded-xl border-2 border-sahay-ink z-0"
      />
      {breached ? (
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sahay-alert animate-ping"
          aria-hidden
        />
      ) : null}
      {mapError ? <p className="mt-2 text-sm text-sahay-ink/70">{mapError}</p> : null}
    </div>
  );
}

export { HOME_PIN_COLOR, ZONE_COLOR, type LeafletNamespace };
