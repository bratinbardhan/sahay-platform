import type { MemoryItemResponse } from '@sahay/types';

/**
 * Deterministic demo memories for the Familiar Memory Album. These are the
 * EXACT same entries as `DEMO_MEMORIES` in the web caretaker vault
 * (apps/web/src/lib/demoSeed.ts) so both surfaces render identical content.
 * Seeded into the offline SQLite vault by `seedLocalMemoriesIfNeeded()`.
 */
export const DEMO_MEMORIES: MemoryItemResponse[] = [
  {
    id: 'demo-memory-0001',
    patient_id: 'demo-patient-aditya',
    title: "Rahul's Certificate Day",
    relationship_tag: 'Grandson Rahul',
    era_or_date: 'Summer 2012',
    image_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
    audio_narration_url: null,
    caption_text: 'Rahul receiving the class trophy at his annual day ceremony. He was so proud that day.',
    created_at: '2025-06-18T10:30:00.000Z',
  },
  {
    id: 'demo-memory-0002',
    patient_id: 'demo-patient-aditya',
    title: 'Our Wedding Day',
    relationship_tag: 'Wife Meera',
    era_or_date: '12 May 1985',
    image_url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
    audio_narration_url: 'https://example.com/audio/wedding-narration.mp3',
    caption_text: 'The whole family gathered under the marigold arch. Meera still hums this song.',
    created_at: '2025-05-30T08:15:00.000Z',
  },
  {
    id: 'demo-memory-0003',
    patient_id: 'demo-patient-aditya',
    title: 'Kaziranga Family Trip',
    relationship_tag: 'Daughter Meera & Family',
    era_or_date: 'Puja Holidays 2018',
    image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    audio_narration_url: null,
    caption_text: 'Elephant safari with the grandchildren at Kaziranga. Everyone waved at the one-horned rhino.',
    created_at: '2025-05-12T16:45:00.000Z',
  },
];