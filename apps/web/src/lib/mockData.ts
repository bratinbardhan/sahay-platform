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
        ? `https://images.unsplash.com/photo-${['1500530855697-b586d89ba3ee', '1519681393784-d120267933ba', '1507525428034-b723cf961d3e', '1497366754035-f200968a6e72'][index % 4]}?auto=format&fit=crop&w=800&q=80`
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
