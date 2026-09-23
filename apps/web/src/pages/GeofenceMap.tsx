import { useState } from 'react';
import type { GeofenceZone, GeofenceZoneUpsertPayload } from '@sahay/types';
import { BellRing, ChevronLeft, Loader2, MapPin, Plus, Search, ShieldAlert, Siren } from 'lucide-react';

import { ActionButton } from '@/components/ActionButton';
import { Card } from '@/components/Card';
import { LeafletMap } from '@/components/LeafletMap';
import { saveGeofenceZone, searchAddress, type GeocodedPlace } from '@/lib/api';
import { MOCK_GEOFENCE } from '@/lib/mockData';

interface GeofenceMapProps {
  onNavigate: (page: string) => void;
}

const MIN_RADIUS_M = 50;
const MAX_RADIUS_M = 500;

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function parseCoord(raw: string): number {
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

interface DraftZone {
  id: string | null;
  zone_name: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  is_active: boolean;
}

function draftFromZone(zone: GeofenceZone): DraftZone {
  return {
    id: zone.id,
    zone_name: zone.zone_name,
    center_lat: zone.center_lat,
    center_lng: zone.center_lng,
    radius_meters: zone.radius_meters,
    is_active: zone.is_active,
  };
}

const FRESH_DRAFT: DraftZone = {
  id: null,
  zone_name: 'New Safe Zone',
  center_lat: MOCK_GEOFENCE.center_lat,
  center_lng: MOCK_GEOFENCE.center_lng,
  radius_meters: 200,
  is_active: true,
};

export function GeofenceMap({ onNavigate }: GeofenceMapProps) {
  const [zones, setZones] = useState<GeofenceZone[]>([{ ...MOCK_GEOFENCE }]);
  const [draft, setDraft] = useState<DraftZone>({ ...FRESH_DRAFT });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodedPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [smsArmed, setSmsArmed] = useState(true);
  const [smsToggling, setSmsToggling] = useState(false);
  const [breachSimulated, setBreachSimulated] = useState(false);
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(true);
  const [pendingState, setPendingState] = useState<boolean | null>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);

  const flashNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 4000);
  };

  /** Map click / pin drag moves the safe-zone center. */
  const handlePick = (lat: number, lng: number) => {
    setDraft((prev) => ({
      ...prev,
      center_lat: roundTo(lat, 6),
      center_lng: roundTo(lng, 6),
    }));
  };

  const handleSearch = async () => {
    if (searching || searchQuery.trim().length < 3) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const results = await searchAddress(searchQuery.trim());
      setSearchResults(results);
      if (results.length === 0) {
        flashNotice('No matching address found. Try a landmark, e.g. "Ward Lake Shillong".');
      }
    } catch {
      flashNotice('Address search unavailable (offline). Place the pin manually instead.');
    } finally {
      setSearching(false);
    }
  };

  const applyPlace = (place: GeocodedPlace) => {
    setDraft((prev) => ({
      ...prev,
      center_lat: roundTo(place.lat, 6),
      center_lng: roundTo(place.lng, 6),
      zone_name: prev.id === null ? place.displayName.split(',')[0] : prev.zone_name,
    }));
    setSearchResults([]);
    setSearchQuery('');
  };

  /** Persist via POST /api/v1/geofence/zone (local fallback when offline). */
  const handleSaveZone = async () => {
    if (saving) return;
    setSaving(true);
    const payload: GeofenceZoneUpsertPayload = {
      ...(draft.id !== null ? { id: draft.id } : {}),
      patient_id: MOCK_GEOFENCE.patient_id,
      zone_name: draft.zone_name.trim() || 'Safe Zone',
      center_lat: roundTo(draft.center_lat, 6),
      center_lng: roundTo(draft.center_lng, 6),
      radius_meters: Math.min(
        MAX_RADIUS_M,
        Math.max(MIN_RADIUS_M, Math.round(draft.radius_meters))
      ),
      is_active: draft.is_active,
    };
    try {
      const saved = await saveGeofenceZone(payload);
      const zone: GeofenceZone = { ...payload, id: saved.id };
      setZones((prev) => {
        const exists = prev.some((item) => item.id === zone.id);
        return exists
          ? prev.map((item) => (item.id === zone.id ? zone : item))
          : [...prev, zone];
      });
      setDraft(draftFromZone(zone));
      flashNotice(`Safe zone "${zone.zone_name}" synced to the Sahāy backend.`);
    } catch {
      // Offline-tolerant: keep the caregiver's work locally until connectivity
      // returns, mirroring the mobile delta-sync philosophy.
      const localId = draft.id ?? `fence-${Date.now()}`;
      const zone: GeofenceZone = { ...payload, id: localId };
      setZones((prev) => {
        const exists = prev.some((item) => item.id === localId);
        return exists
          ? prev.map((item) => (item.id === localId ? zone : item))
          : [...prev, zone];
      });
      setDraft(draftFromZone(zone));
      flashNotice('Backend unreachable — zone saved locally and queued to sync.');
    } finally {
      setSaving(false);
    }
  };

  const startNewZone = () => {
    setDraft({ ...FRESH_DRAFT });
  };

  const startEditZone = (zone: GeofenceZone) => {
    setDraft(draftFromZone(zone));
  };

  const toggleZoneActive = (zoneId: string) => {
    setZones((prev) =>
      prev.map((zone) => (zone.id === zoneId ? { ...zone, is_active: !zone.is_active } : zone))
    );
    setDraft((prev) => (prev.id === zoneId ? { ...prev, is_active: !prev.is_active } : prev));
  };

  const toggleSmsAlerts = async () => {
    if (smsToggling) return;
    setSmsToggling(true);
    // Mirrors the arm/disarm onto every zone, matching the Twilio dispatcher
    // gate on the backend (active zones only receive breach alerts).
    const nextArmed = !smsArmed;
    try {
      await Promise.all(
        zones
          .filter((zone) => zone.is_active !== nextArmed)
          .map((zone) =>
            saveGeofenceZone({
              id: zone.id,
              patient_id: zone.patient_id,
              zone_name: zone.zone_name,
              center_lat: zone.center_lat,
              center_lng: zone.center_lng,
              radius_meters: zone.radius_meters,
              is_active: nextArmed,
            })
          )
      );
      setZones((prev) => prev.map((zone) => ({ ...zone, is_active: nextArmed })));
    } catch {
      flashNotice('Backend unreachable — toggle saved locally.');
    } finally {
      setSmsArmed(nextArmed);
      setSmsToggling(false);
    }
  };

  return (
    <div
      className={`min-h-screen bg-sahay-bg p-4 sm:p-8 ${breachSimulated ? 'pt-20' : ''}`}
      data-palette="caretaker"
    >
      {breachSimulated ? (
        <div className="fixed top-0 inset-x-0 z-50 bg-sahay-alert text-white px-4 py-3 font-bold shadow-caretaker-card flex items-center justify-center gap-3">
          <Siren className="w-5 h-5 md:w-6 md:h-6 animate-ping" />
          SOS — geofence breach simulated. Home pin is alert crimson. Offline SMS payload queued for Twilio.
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => onNavigate('dashboard')}
        className="flex items-center gap-2 text-sahay-ink font-semibold mb-6 hover:text-sahay-accent transition-all duration-care ease-care"
      >
        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" /> Back to Dashboard
      </button>

      <h1 className="text-3xl font-bold text-sahay-ink mb-2">Anti-Wandering Geofencing</h1>
      <p className="text-sahay-ink/70 mb-8">
        Place the home anchor pin and set a safe radius. When the patient's device crosses the
        boundary, emergency contacts receive an SMS with a live Google Maps location link.
      </p>

      {notice ? (
        <div className="mb-6 px-4 py-3 rounded-xl bg-sahay-accent/10 border-2 border-sahay-accent text-sahay-ink font-semibold">
          {notice}
        </div>
      ) : null}

      {/* Address search */}
      <Card title="Find Home Address" className="mb-8">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSearch();
            }}
            placeholder="Search an address or landmark (e.g. Police Bazar, Shillong)"
            className="flex-1 px-4 py-3 border-2 border-sahay-ink rounded-xl bg-sahay-surface text-sahay-ink focus:outline-none focus:ring-2 focus:ring-sahay-accent"
          />
          <ActionButton
            label={searching ? 'Searching…' : 'Search'}
            icon={searching ? <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" /> : <Search className="w-5 h-5 md:w-6 md:h-6" />}
            onClick={() => void handleSearch()}
            disabled={searching}
          />
        </div>
        {searchResults.length > 0 ? (
          <ul className="mt-4 divide-y divide-sahay-ink/10 border-2 border-sahay-ink/20 rounded-xl overflow-hidden">
            {searchResults.map((place) => (
              <li key={`${place.lat},${place.lng}`}>
                <button
                  type="button"
                  onClick={() => applyPlace(place)}
                  className="w-full text-left px-4 py-3 bg-sahay-surface hover:bg-sahay-accent/10 transition-colors text-sm text-sahay-ink"
                >
                  <MapPin className="w-5 h-5 md:w-6 md:h-6 inline mr-2 text-sahay-accent" />
                  {place.displayName}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      {/* Interactive map + editor */}
      <Card title="Safe Zone Editor" className="mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <LeafletMap
              centerLat={draft.center_lat}
              centerLng={draft.center_lng}
              radiusMeters={draft.radius_meters}
              onPick={handlePick}
              breached={breachSimulated}
            />
            <p className="mt-3 text-sm text-sahay-ink/70">
              Click the map or drag the pin to move the home anchor. The shaded circle is the safe
              boundary the mobile daemon monitors.
            </p>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-sahay-ink mb-1">Zone Name</label>
              <input
                type="text"
                value={draft.zone_name}
                onChange={(e) => setDraft({ ...draft, zone_name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-sahay-ink rounded-xl bg-sahay-surface text-sahay-ink focus:outline-none focus:ring-2 focus:ring-sahay-accent"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-sahay-ink mb-1">
                  Center Latitude
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={draft.center_lat}
                  onChange={(e) => setDraft({ ...draft, center_lat: parseCoord(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-sahay-ink rounded-xl bg-sahay-surface text-sahay-ink focus:outline-none focus:ring-2 focus:ring-sahay-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-sahay-ink mb-1">
                  Center Longitude
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={draft.center_lng}
                  onChange={(e) => setDraft({ ...draft, center_lng: parseCoord(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-sahay-ink rounded-xl bg-sahay-surface text-sahay-ink focus:outline-none focus:ring-2 focus:ring-sahay-accent"
                />
              </div>
            </div>
            <div>
              <label className="flex items-center justify-between text-sm font-semibold text-sahay-ink mb-1">
                <span>Safe Radius</span>
                <span className="text-sahay-accent">{draft.radius_meters} m</span>
              </label>
              <input
                type="range"
                min={MIN_RADIUS_M}
                max={MAX_RADIUS_M}
                step={10}
                value={draft.radius_meters}
                onChange={(e) =>
                  setDraft({ ...draft, radius_meters: parseInt(e.target.value, 10) })
                }
                className="w-full accent-sahay-accent"
              />
              <div className="flex justify-between text-xs text-sahay-ink/60 mt-1">
                <span>{MIN_RADIUS_M} m</span>
                <span>{MAX_RADIUS_M} m</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <ActionButton
                label={saving ? 'Saving…' : draft.id ? 'Update Zone' : 'Save Zone'}
                icon={<MapPin className="w-5 h-5 md:w-6 md:h-6" />}
                onClick={() => void handleSaveZone()}
                disabled={saving}
              />
              <ActionButton
                label="Add New Zone"
                variant="secondary"
                icon={<Plus className="w-5 h-5 md:w-6 md:h-6" />}
                onClick={startNewZone}
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-sahay-surface shadow-caretaker-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-extrabold text-[#1E293B]">Live Tracking Status</h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={isTrackingEnabled} onChange={() => { setPendingState(!isTrackingEnabled); setIsTrackingModalOpen(true); }} />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold border ${isTrackingEnabled ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-amber-50 text-amber-800 border-amber-100'}`}>
            {isTrackingEnabled ? (
              <span className="relative flex h-3 w-3 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            ) : (
              <span className="h-3 w-3 rounded-full bg-amber-500 mr-1" />
            )}
            {isTrackingEnabled ? 'Live tracking active' : 'Live tracking paused / disabled'}
          </div>
          <p className="mt-4 text-sm text-slate-600">Amber heat zones show simulated high-density visits and recent breach locations around Shillong.</p>
        </Card>
        <Card title="Security Breach Log" className="bg-sahay-surface shadow-caretaker-card">
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-red-100 bg-red-50 p-3"><strong>19 Sept · 05:14 PM</strong><p className="text-slate-600">Outer Safe Zone · displaced 140 m · <span className="font-semibold text-emerald-700">Resolved</span></p></div>
            <div className="rounded-lg border border-slate-200 p-3"><strong>18 Sept · 02:08 PM</strong><p className="text-slate-600">Garden perimeter check-in · Resolved</p></div>
          </div>
        </Card>
      </div>

      {/* Twilio SMS toggle */}
      <Card title="Simulate Geofence Breach" className="mb-8 bg-sahay-surface shadow-caretaker-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sahay-ink">Prototype SOS drill</p>
            <p className="text-sm text-sahay-ink/70 mt-1">
              Swaps the home pin to alert crimson with a pulse, raises the SOS banner, and
              demonstrates the offline SMS queue that Twilio will flush on reconnect.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBreachSimulated((prev) => !prev)}
            aria-pressed={breachSimulated}
            className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-sahay-ink font-semibold min-h-[56px] transition-all duration-care ease-care ${breachSimulated ? 'bg-sahay-alert text-white' : 'bg-sahay-surface text-sahay-ink'
              }`}
          >
            <ShieldAlert className="w-5 h-5 md:w-6 md:h-6" />
            {breachSimulated ? 'Clear simulated breach' : 'Simulate Geofence Breach'}
          </button>
        </div>
      </Card>

      <Card title="Background SMS Notification (Twilio Gateway)" className="mb-8 bg-sahay-surface shadow-caretaker-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sahay-ink">
              {smsArmed ? 'Alerts are ARMED' : 'Alerts are OFF'}
            </p>
            <p className="text-sm text-sahay-ink/70 mt-1">
              On a GEOFENCE_EXIT transition, every active zone is checked and emergency contacts
              receive an SMS with a live Google Maps link. Offline breaches are queued on the device
              and dispatched once signal returns.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void toggleSmsAlerts()}
            disabled={smsToggling}
            aria-pressed={smsArmed}
            className={`relative inline-flex h-12 w-24 items-center rounded-full border-2 border-sahay-ink transition-colors shrink-0 ${smsArmed ? 'bg-sahay-accent' : 'bg-sahay-bg'
              } ${smsToggling ? 'opacity-50 cursor-wait' : ''}`}
          >
            <span
              className={`inline-block h-8 w-8 transform rounded-full bg-white border-2 border-sahay-ink transition-transform ${smsArmed ? 'translate-x-12' : 'translate-x-2'
                }`}
            />
            <span
              className={`absolute text-xs font-bold ${smsArmed ? 'left-3 text-white' : 'right-2.5 text-sahay-ink'
                }`}
            >
              {smsArmed ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
      </Card>

      <Card title={`Geofence Zones (${zones.length})`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {zones.map((zone) => (
            <div key={zone.id} className="p-4 bg-sahay-surface border-2 border-sahay-ink rounded-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="font-bold text-sahay-ink">{zone.zone_name}</div>
                <button
                  type="button"
                  onClick={() => toggleZoneActive(zone.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-sahay-ink transition-colors ${zone.is_active ? 'bg-sahay-accent text-white' : 'bg-sahay-bg text-sahay-ink'
                    }`}
                >
                  {zone.is_active ? 'ACTIVE' : 'OFF'}
                </button>
              </div>
              <p className="text-sm text-sahay-ink/70 mt-2">
                {zone.center_lat.toFixed(4)}, {zone.center_lng.toFixed(4)} · radius{' '}
                {zone.radius_meters} m
              </p>
              <div className="mt-3 flex items-center gap-3">
                <ActionButton
                  label="Edit"
                  variant="secondary"
                  onClick={() => startEditZone(zone)}
                  className="!min-h-0 !py-2 !px-3 text-xs"
                />
                <BellRing
                  className={`w-5 h-5 md:w-6 md:h-6 ${zone.is_active ? 'text-sahay-accent' : 'text-sahay-ink/40'}`}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {isTrackingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-slate-800 font-bold text-lg mb-2">
              {pendingState ? 'Enable Live Tracking?' : 'Disable Live Tracking?'}
            </h3>
            <p className="text-slate-600 text-sm mb-6">
              {pendingState
                ? 'Turning on live tracking will resume real-time updates and geofence monitoring.'
                : 'Warning: Disabling live tracking will halt real-time location updates and safety boundary alerts.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsTrackingModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { setIsTrackingEnabled(pendingState!); setIsTrackingModalOpen(false); }}
                className={`px-4 py-2 rounded-lg text-white font-semibold transition-colors ${pendingState ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
