import type { PatientProfile, GameplaySessionLog, ReminiscenceMedia, GeofenceZone } from '@sahay/types';

import {
  DEMO_CAREGIVER_CONTACT,
  DEMO_CARETAKER,
  DEMO_GEOFENCE,
  DEMO_MEMORIES,
  DEMO_PATIENT_ID,
  getDemoActivityHeatmap,
  getDemoCognitiveLoad14d,
  getDemoGdsDistribution,
  getDemoGeofence,
  getDemoMoodStability14d,
  getDemoPatient,
  getDemoPatientTimestamps,
  getDemoSessionMetrics14d,
  getDemoSessionRecords,
  type MemoryGalleryTag,
} from '@/lib/demoSeed';

export {
  DEMO_CAREGIVER_CONTACT,
  DEMO_GEOFENCE,
  getDemoActivityHeatmap,
  getDemoCognitiveLoad14d,
  getDemoGdsDistribution,
  getDemoGeofence,
  getDemoMoodStability14d,
  getDemoPatientTimestamps,
  getDemoSessionMetrics14d,
};

export type { MemoryGalleryTag };

export interface GalleryMediaItem extends ReminiscenceMedia {
  title: string;
  filter_tag: MemoryGalleryTag;
  captured_on: string;
}

export function getMockPatient(): Promise<PatientProfile> {
  return Promise.resolve(getDemoPatient());
}

export function getMockSessionLogs(): Promise<GameplaySessionLog[]> {
  const sessions: GameplaySessionLog[] = getDemoSessionRecords().map((record) => ({
    id: record.session_log_id,
    patient_id: DEMO_PATIENT_ID,
    game_module_id: record.game_module_id,
    gds_stage: record.gds_stage,
    difficulty_level: record.difficulty_level,
    tasks_presented: record.tasks_presented,
    tasks_completed_cleanly: record.tasks_completed_cleanly,
    tasks_guided: record.tasks_presented - record.tasks_completed_cleanly,
    avg_latency_ms: record.avg_latency_ms,
    demitokens_earned: record.demitokens_earned,
    sync_status: 'SYNCED',
    timestamp: record.timestamp,
  }));
  return Promise.resolve(sessions);
}

export const MOCK_MEDIA: GalleryMediaItem[] = DEMO_MEMORIES.map((memory, index) => {
  const isAudio = memory.audio_narration_url !== null && index % 3 === 2;
  const tag = (memory.relationship_tag === 'Travel' || memory.relationship_tag === 'Music'
    ? memory.relationship_tag
    : 'Family') as MemoryGalleryTag;
  const yearMatch = memory.era_or_date?.match(/\d{4}/);
  return {
    id: memory.id,
    patient_id: memory.patient_id,
    media_type: isAudio ? 'VOICE' : 'PHOTO',
    file_url: isAudio
      ? (memory.audio_narration_url ?? memory.image_url)
      : (memory.image_url.startsWith('https://example.com')
        ? `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 420"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="${['#0D9488', '#3B82F6', '#8B5CF6', '#F59E0B'][index % 4]}"/><stop offset="1" stop-color="#E0F2FE"/></linearGradient></defs><rect width="800" height="420" fill="url(#g)"/><circle cx="${180 + index * 90}" cy="170" r="72" fill="#FEF3C7"/><circle cx="${155 + index * 90}" cy="155" r="9" fill="#0F172A"/><circle cx="${205 + index * 90}" cy="155" r="9" fill="#0F172A"/><path d="M155 195 Q180 220 205 195" fill="none" stroke="#0F172A" stroke-width="8" stroke-linecap="round"/><path d="M0 365 Q180 280 360 365 T800 350 V420 H0Z" fill="#A7F3D0" opacity=".75"/><text x="400" y="70" text-anchor="middle" fill="white" font-size="28" font-family="sans-serif">Sahāy memory album</text></svg>`)}`
        : memory.image_url),
    label_text: memory.caption_text,
    relation_tag: tag,
    event_year: yearMatch ? Number(yearMatch[0]) : null,
    checksum_sha256: `sha256-demo-${memory.id}`,
    title: memory.title,
    filter_tag: tag,
    captured_on: memory.created_at,
  };
});

/** Home perimeter in Shillong (Police Bazar / Laitumkhrah basin). */
export const MOCK_GEOFENCE: GeofenceZone = getDemoGeofence();

export const MOCK_CAREGIVER = DEMO_CARETAKER;
