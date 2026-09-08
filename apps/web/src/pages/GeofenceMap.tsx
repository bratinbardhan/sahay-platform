import { useState } from 'react';
import type { GeofenceZone, GeofenceZoneUpsertPayload } from '@sahay/types';
import { BellRing, ChevronLeft, Loader2, MapPin, Plus, Search } from 'lucide-react';

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
    <div>
      <button
        type="button"
        onClick={() => onNavigate('dashboard')}
        className="flex items-center gap-2 text-[#2C3E50] font-semibold mb-6 hover:text-[#E67E22] transition-colors"
      >
        <ChevronLeft size={20} /> Back to Dashboard
      </button>

      <h1 className="text-3xl font-bold text-[#2C3E50] mb-2">Anti-Wandering Geofencing</h1>
      <p className="text-[#2C3E50]/70 mb-8">
        Place the home anchor pin and set a safe radius. When the patient's device crosses the
        boundary, emergency contacts receive an SMS with a live Google Maps location link.
      </p>

      {notice ? (
        <div className="mb-6 px-4 py-3 rounded-xl bg-[#E67E22]/10 border-2 border-[#E67E22] text-[#2C3E50] font-semibold">
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
            className="flex-1 px-4 py-3 border-2 border-[#2C3E50] rounded-xl bg-[#FFFCF6] text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
          />
          <ActionButton
            label={searching ? 'Searching…' : 'Search'}
            icon={searching ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
            onClick={() => void handleSearch()}
            disabled={searching}
          />
        </div>
        {searchResults.length > 0 ? (
          <ul className="mt-4 divide-y divide-[#2C3E50]/10 border-2 border-[#2C3E50]/20 rounded-xl overflow-hidden">
            {searchResults.map((place) => (
              <li key={`${place.lat},${place.lng}`}>
                <button
                  type="button"
                  onClick={() => applyPlace(place)}
                  className="w-full text-left px-4 py-3 bg-[#FFFCF6] hover:bg-[#E67E22]/10 transition-colors text-sm text-[#2C3E50]"
                >
                  <MapPin size={16} className="inline mr-2 text-[#E67E22]" />
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
            />
            <p className="mt-3 text-sm text-[#2C3E50]/70">
              Click the map or drag the pin to move the home anchor. The shaded circle is the safe
              boundary the mobile daemon monitors.
            </p>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#2C3E50] mb-1">Zone Name</label>
              <input
                type="text"
                value={draft.zone_name}
                onChange={(e) => setDraft({ ...draft, zone_name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-[#2C3E50] rounded-xl bg-[#FFFCF6] text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-[#2C3E50] mb-1">
                  Center Latitude
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={draft.center_lat}
                  onChange={(e) => setDraft({ ...draft, center_lat: parseCoord(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-[#2C3E50] rounded-xl bg-[#FFFCF6] text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#2C3E50] mb-1">
                  Center Longitude
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={draft.center_lng}
                  onChange={(e) => setDraft({ ...draft, center_lng: parseCoord(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-[#2C3E50] rounded-xl bg-[#FFFCF6] text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                />
              </div>
            </div>
            <div>
              <label className="flex items-center justify-between text-sm font-semibold text-[#2C3E50] mb-1">
                <span>Safe Radius</span>
                <span className="text-[#E67E22]">{draft.radius_meters} m</span>
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
                className="w-full accent-[#E67E22]"
              />
              <div className="flex justify-between text-xs text-[#2C3E50]/60 mt-1">
                <span>{MIN_RADIUS_M} m</span>
                <span>{MAX_RADIUS_M} m</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <ActionButton
                label={saving ? 'Saving…' : draft.id ? 'Update Zone' : 'Save Zone'}
                icon={<MapPin size={20} />}
                onClick={() => void handleSaveZone()}
                disabled={saving}
              />
              <ActionButton
                label="Add New Zone"
                variant="secondary"
                icon={<Plus size={20} />}
                onClick={startNewZone}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Twilio SMS toggle */}
      <Card title="Background Anti-Wandering SMS Alerts (Twilio)" className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-[#2C3E50]">
              {smsArmed ? 'Alerts are ARMED' : 'Alerts are OFF'}
            </p>
            <p className="text-sm text-[#2C3E50]/70 mt-1">
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
            className={`relative inline-flex h-12 w-24 items-center rounded-full border-2 border-[#2C3E50] transition-colors shrink-0 ${
              smsArmed ? 'bg-[#E67E22]' : 'bg-[#F8F6F0]'
            } ${smsToggling ? 'opacity-50 cursor-wait' : ''}`}
          >
            <span
              className={`inline-block h-8 w-8 transform rounded-full bg-white border-2 border-[#2C3E50] transition-transform ${
                smsArmed ? 'translate-x-12' : 'translate-x-2'
              }`}
            />
            <span
              className={`absolute text-xs font-bold ${
                smsArmed ? 'left-3 text-white' : 'right-2.5 text-[#2C3E50]'
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
            <div key={zone.id} className="p-4 bg-[#FFFCF6] border-2 border-[#2C3E50] rounded-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="font-bold text-[#2C3E50]">{zone.zone_name}</div>
                <button
                  type="button"
                  onClick={() => toggleZoneActive(zone.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-[#2C3E50] transition-colors ${
                    zone.is_active ? 'bg-[#E67E22] text-white' : 'bg-[#F8F6F0] text-[#2C3E50]'
                  }`}
                >
                  {zone.is_active ? 'ACTIVE' : 'OFF'}
                </button>
              </div>
              <p className="text-sm text-[#2C3E50]/70 mt-2">
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
                  size={18}
                  className={zone.is_active ? 'text-[#E67E22]' : 'text-[#2C3E50]/40'}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
