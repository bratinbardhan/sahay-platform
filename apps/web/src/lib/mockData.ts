import type { PatientProfile, GameplaySessionLog, ReminiscenceMedia, GeofenceZone } from '@sahay/types';

/** Local id generator (removes runtime `uuid` dependency). */
function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getMockPatient(): Promise<PatientProfile> {
  return Promise.resolve({
    id: 'patient-001',
    caregiver_id: 'caregiver-001',
    name: 'Meera Devi',
    age: 72,
    assigned_gds_stage: 4,
    primary_language: 'en',
    demitoken_balance: 128,
    streak_days: 14,
    created_at: '2024-01-15T10:00:00Z',
  });
}

const GAME_MODULES = ['rapid_fire_sorting', 'serial_number_scatter', 'face_name_match', 'environmental_sound_match'];

export function getMockSessionLogs(): Promise<GameplaySessionLog[]> {
  const sessions: GameplaySessionLog[] = [];
  for (let i = 9; i >= 0; i -= 1) {
    const presented = 12 + Math.floor(Math.random() * 8);
    const guided = Math.floor(Math.random() * 3);
    const clean = presented - guided;
    const latency = 900 + Math.floor(Math.random() * 1400) - i * 80;
    sessions.push({
      id: randomId(),
      patient_id: 'patient-001',
      game_module_id: GAME_MODULES[i % GAME_MODULES.length],
      gds_stage: 4,
      difficulty_level: 3 + Math.floor(Math.random() * 3),
      tasks_presented: presented,
      tasks_completed_cleanly: clean,
      tasks_guided: guided,
      avg_latency_ms: Math.max(200, latency),
      demitokens_earned: clean * 2 + guided * 1,
      sync_status: 'SYNCED',
      timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  return Promise.resolve(sessions);
}

export const MOCK_MEDIA: ReminiscenceMedia[] = [
  {
    id: 'media-001',
    patient_id: 'patient-001',
    media_type: 'PHOTO',
    file_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop',
    label_text: 'Grandson Rahul at school',
    relation_tag: 'Grandson Rahul',
    event_year: 2023,
    checksum_sha256: 'abc123',
  },
  {
    id: 'media-002',
    patient_id: 'patient-001',
    media_type: 'VOICE',
    file_url: 'https://example.com/media/voice-note-001.mp3',
    label_text: 'Rahul singing rhymes',
    relation_tag: 'Grandson Rahul',
    event_year: 2023,
    checksum_sha256: 'def456',
  },
];

export const MOCK_GEOFENCE: GeofenceZone = {
  id: 'fence-001',
  patient_id: 'patient-001',
  zone_name: 'Home Perimeter',
  center_lat: 25.5941,
  center_lng: 91.7362,
  radius_meters: 200,
  is_active: true,
};
