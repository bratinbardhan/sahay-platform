import type {
  CognitiveSummaryResponse,
  CognitiveWindowAggregate,
  DdaHistoryPoint,
  DdaHistoryResponse,
  GeofenceZone,
  MemoryItemResponse,
  PatientProfile,
  SessionRecord,
  SessionsPage,
  TrendDirection,
} from '@sahay/types';

/**
 * Deterministic synthetic telemetry for brand-new patients (zero gameplay
 * records) or when the analytics API is unreachable. Mirrors the backend
 * aggregation math exactly so charts render identically for demo data.
 *
 * All generation is seeded — no Math.random() — so re-renders are stable.
 */

/** Unified demo identities — shared by the Web caretaker portal and the Mobile
 * patient app so the offline demo login maps to the same seeded patient. */
export const DEMO_CARETAKER: {
  id: string;
  name: string;
  email: string;
  role: string;
  patientId: string;
  phone: string;
} = {
  id: 'demo-caretaker-ram',
  name: 'Ram Sharma',
  email: 'ram',
  role: 'caretaker',
  patientId: 'demo-patient-aditya',
  phone: '+91 98620 44110',
};

export const DEMO_PATIENT: {
  id: string;
  name: string;
  email: string;
  role: string;
} = {
  id: 'demo-patient-aditya',
  name: 'Aditya Sharma',
  email: 'aditya',
  role: 'patient',
};

export const DEMO_PATIENT_ID = DEMO_PATIENT.id;

export const DEMO_CAREGIVER_CONTACT = {
  name: DEMO_CARETAKER.name,
  phone: DEMO_CARETAKER.phone,
  email: 'ram.sharma@sahay.care',
  relation: 'Son / Primary Caregiver',
} as const;

export type MemoryGalleryTag = 'Family' | 'Travel' | 'Music';

export interface CognitiveLoadDay {
  day: string;
  date: string;
  engagement: number;
  fatigue: number;
  load: number;
}

export interface MoodStabilityDay {
  day: string;
  date: string;
  morning: number;
  afternoon: number;
  evening: number;
  stability: number;
}

export interface HeatmapCell {
  dayIndex: number;
  dayLabel: string;
  hour: number;
  density: number;
  latencyMs: number;
}

export interface SessionMetricDay {
  day: string;
  date: string;
  durationSeconds: number;
  sortAccuracy: number;
  avgLatencyMs: number;
  attempts: number;
  completed: number;
}

const DEMO_GAME_MODULES = [
  'rapid_fire_sorting',
  'serial_number_scatter',
  'face_name_match',
  'environmental_sound_match',
] as const;

const SESSION_COUNT = 14;
const TARGET_LATENCY_MS = 420;
const TARGET_STABILITY = 88;

/** Mulberry32 seeded PRNG — deterministic across renders and reloads. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoDaysAgo(daysAgo: number, hour = 10, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

function dayLabel(daysAgo: number): string {
  return new Date(isoDaysAgo(daysAgo)).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

/** Mirror of the backend's cognitive-load formula (60% latency / 40% errors). */
function cognitiveLoadIndex(latencyRollingMs: number, errorRateRolling: number): number {
  const latencyComponent = Math.min(1, Math.max(0, latencyRollingMs) / 2000);
  const errorComponent = Math.min(1, Math.max(0, errorRateRolling));
  return Math.round(100 * (0.6 * latencyComponent + 0.4 * errorComponent) * 100) / 100;
}

export function getDemoPatient(): PatientProfile {
  return {
    id: DEMO_PATIENT_ID,
    caregiver_id: DEMO_CARETAKER.id,
    name: DEMO_PATIENT.name,
    age: 74,
    assigned_gds_stage: 3,
    primary_language: 'as',
    demitoken_balance: 186,
    streak_days: 14,
    created_at: isoDaysAgo(48, 9, 15),
  };
}

export function getDemoPatientTimestamps(): {
  last_session_at: string;
  last_sync_at: string;
  last_known_location_at: string;
} {
  return {
    last_session_at: isoDaysAgo(0, 16, 42),
    last_sync_at: isoDaysAgo(0, 16, 48),
    last_known_location_at: isoDaysAgo(0, 16, 50),
  };
}

/** Home perimeter in Shillong (Police Bazar / Laitumkhrah basin). */
export const DEMO_GEOFENCE: GeofenceZone = {
  id: 'fence-home-shillong',
  patient_id: DEMO_PATIENT_ID,
  zone_name: 'Home Perimeter',
  center_lat: 25.5788,
  center_lng: 91.8933,
  radius_meters: 180,
  is_active: true,
};

export function getDemoGeofence(): GeofenceZone {
  return { ...DEMO_GEOFENCE };
}

/** Touch latency clustered around 420ms with a smooth, non-spiking wave. */
function latencyForRound(roundsAgo: number): number {
  const wave = Math.sin(roundsAgo / 2.4) * 16;
  const sundownBias = roundsAgo % 4 === 1 ? 22 : 0;
  return Math.max(360, Math.round(TARGET_LATENCY_MS + wave + sundownBias));
}

/** Fourteen demo sessions over the last fourteen days, newest first. */
export function getDemoSessionRecords(): SessionRecord[] {
  const rand = mulberry32(97531);
  const records: SessionRecord[] = [];
  for (let i = 0; i < SESSION_COUNT; i += 1) {
    const roundsAgo = SESSION_COUNT - 1 - i;
    const presented = 12 + Math.floor(rand() * 6);
    // Introduce clinical variance (e.g. 91-97% start, mid-period dips, ~83% near day 13, recovering to ~95% later)
    const errorPattern = [1, 0, 1, 0, 2, 1, 2, 2, 1, 1, 0, 1, 3, 1];
    const guided = errorPattern[13 - roundsAgo] ?? 0;
    const clean = presented - guided;
    const duration = 420 + Math.round(rand() * 180);
    records.push({
      session_log_id: `${DEMO_PATIENT_ID}-s${i + 1}`,
      game_module_id: DEMO_GAME_MODULES[i % DEMO_GAME_MODULES.length],
      gds_stage: 3,
      difficulty_level: Math.min(5, 2 + Math.floor(roundsAgo / 4)),
      duration_seconds: duration,
      avg_latency_ms: latencyForRound(roundsAgo),
      score: clean * 10 + guided * 2,
      accuracy_pct: Math.round((clean / presented) * 10000) / 100,
      demitokens_earned: clean * 2 + guided,
      tasks_presented: presented,
      tasks_completed_cleanly: clean,
      timestamp: isoDaysAgo(roundsAgo, 10 + (roundsAgo % 3), 12),
    });
  }
  return records;
}

function orderedDemoSessions(): SessionRecord[] {
  return [...getDemoSessionRecords()].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

function demoLatency(s: SessionRecord): number {
  return s.avg_latency_ms;
}

function trailingAverage(values: number[], index: number, window: number): number {
  const low = Math.max(0, index - window + 1);
  const chunk = values.slice(low, index + 1);
  return chunk.reduce((sum, v) => sum + v, 0) / chunk.length;
}

function clinicalLoadForDay(dayIndex: number): number {
  const engagement = 44 + Math.sin(dayIndex / 2.1) * 9;
  const lateWeekFatigue = dayIndex > 10 ? 11 : dayIndex > 7 ? 5 : 0;
  const restDay = dayIndex % 7 === 6 ? -7 : 0;
  return Math.round((engagement + lateWeekFatigue + restDay) * 10) / 10;
}

/** 14-day game sessions: duration, sort accuracy, ~420 ms touch latency. */
export function getDemoSessionMetrics14d(): SessionMetricDay[] {
  return orderedDemoSessions().map((session) => ({
    day: dayLabel(
      Math.max(
        0,
        Math.round((Date.now() - new Date(session.timestamp).getTime()) / 86_400_000)
      )
    ),
    date: session.timestamp,
    durationSeconds: session.duration_seconds,
    sortAccuracy: session.accuracy_pct,
    avgLatencyMs: session.avg_latency_ms,
    attempts: session.tasks_presented,
    completed: session.tasks_completed_cleanly,
  }));
}

/** 14-day Cognitive Load Index — engagement vs mental fatigue. */
export function getDemoCognitiveLoad14d(): CognitiveLoadDay[] {
  return Array.from({ length: 14 }, (_, i) => {
    const daysAgo = 13 - i;
    const load = clinicalLoadForDay(i);
    const engagement = Math.round((88 - load * 0.35) * 10) / 10;
    const fatigue = Math.round((load * 0.9 + 8) * 10) / 10;
    return {
      day: dayLabel(daysAgo),
      date: isoDaysAgo(daysAgo),
      engagement,
      fatigue,
      load,
    };
  });
}

/**
 * 14-day mood stability with a late-afternoon sundowning dip
 * (afternoon scores sit 18–28 points below morning).
 */
export function getDemoMoodStability14d(): MoodStabilityDay[] {
  return Array.from({ length: 14 }, (_, i) => {
    const daysAgo = 13 - i;
    const morning = Math.round(82 + Math.sin(i / 3) * 5);
    const afternoon = Math.round(morning - (22 + Math.sin(i / 2.6) * 5));
    const evening = Math.round(afternoon + 6 + (i % 3));
    const stability = Math.round((morning * 0.4 + afternoon * 0.35 + evening * 0.25) * 10) / 10;
    return {
      day: dayLabel(daysAgo),
      date: isoDaysAgo(daysAgo),
      morning,
      afternoon,
      evening,
      stability,
    };
  });
}

/** Population GDS 1–7 distribution for the command-center overview. */
export function getDemoGdsDistribution(): Record<string, number> {
  return {
    '1': 18,
    '2': 24,
    '3': 31,
    '4': 22,
    '5': 14,
    '6': 7,
    '7': 3,
  };
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** 7×24 interaction density + touch-latency clusters (late-afternoon peak). */
export function getDemoActivityHeatmap(): HeatmapCell[] {
  const rand = mulberry32(42001);
  const cells: HeatmapCell[] = [];
  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      const morningPeak = hour >= 9 && hour <= 11 ? 0.55 : 0;
      const sundownPeak = hour >= 15 && hour <= 18 ? 0.85 : 0;
      const night = hour < 6 || hour > 21 ? -0.35 : 0;
      const density = Math.max(
        0,
        Math.min(1, 0.12 + morningPeak + sundownPeak + night + rand() * 0.18)
      );
      const latencyMs = Math.round(
        TARGET_LATENCY_MS + (hour >= 15 && hour <= 18 ? 48 : 0) + (density - 0.4) * 40 + rand() * 18
      );
      cells.push({
        dayIndex,
        dayLabel: WEEKDAY_LABELS[dayIndex],
        hour,
        density: Math.round(density * 100) / 100,
        latencyMs,
      });
    }
  }
  return cells;
}

export function getDemoDdaHistory(): DdaHistoryResponse {
  const sessions = orderedDemoSessions();
  const loadSeries = getDemoCognitiveLoad14d();
  const points: DdaHistoryPoint[] = sessions.map((s, i) => {
    const guided = s.tasks_presented - s.tasks_completed_cleanly;
    const errorRate = s.tasks_presented > 0 ? guided / s.tasks_presented : 0;
    const latencyRolling =
      Math.round(trailingAverage(sessions.map(demoLatency), i, 5) * 100) / 100;
    const difficultyRolling =
      Math.round(trailingAverage(sessions.map((x) => x.difficulty_level), i, 3) * 1000) / 1000;
    const derived = cognitiveLoadIndex(latencyRolling, errorRate);
    const clinical = loadSeries[i]?.load ?? derived;
    return {
      timestamp: s.timestamp,
      cognitive_load_index: clinical,
      difficulty_level: difficultyRolling,
      reaction_latency_ms: latencyRolling,
    };
  });
  const latest = points[points.length - 1];
  return {
    patient_id: DEMO_PATIENT_ID,
    source: 'derived',
    current_difficulty_level: latest ? latest.difficulty_level : 0,
    latest_cognitive_load_index: latest ? latest.cognitive_load_index : 0,
    points,
  };
}

function windowAggregate(rows: SessionRecord[]): CognitiveWindowAggregate {
  if (rows.length === 0) {
    return { sessions: 0, avg_accuracy_pct: 0, avg_latency_ms: 0, avg_difficulty: 0 };
  }
  const presented = rows.reduce((sum, s) => sum + s.tasks_presented, 0);
  const clean = rows.reduce((sum, s) => sum + s.tasks_completed_cleanly, 0);
  return {
    sessions: rows.length,
    avg_accuracy_pct: presented > 0 ? Math.round((clean / presented) * 10000) / 100 : 0,
    avg_latency_ms:
      Math.round((rows.reduce((sum, s) => sum + demoLatency(s), 0) / rows.length) * 100) / 100,
    avg_difficulty:
      Math.round((rows.reduce((sum, s) => sum + s.difficulty_level, 0) / rows.length) * 100) / 100,
  };
}

export function getDemoCognitiveSummary(): CognitiveSummaryResponse {
  const now = Date.now();
  const cutoff7 = now - 7 * 24 * 60 * 60 * 1000;
  const cutoff14 = now - 14 * 24 * 60 * 60 * 1000;
  const sessions = orderedDemoSessions();
  const last7 = sessions.filter((s) => new Date(s.timestamp).getTime() > cutoff7);
  const prev7 = sessions.filter((ts) => {
    const t = new Date(ts.timestamp).getTime();
    return t > cutoff14 && t <= cutoff7;
  });

  const lastAgg = windowAggregate(last7);
  const prevAgg = windowAggregate(prev7);

  let trendDirection: TrendDirection = 'STABLE';
  let accuracyDelta = 0;
  if (last7.length > 0 && prev7.length > 0) {
    accuracyDelta =
      Math.round((lastAgg.avg_accuracy_pct - prevAgg.avg_accuracy_pct) * 100) / 100;
    trendDirection =
      accuracyDelta >= 2 ? 'IMPROVING' : accuracyDelta <= -2 ? 'DECLINING' : 'STABLE';
  }

  const latest = sessions[sessions.length - 1];
  let recommended = latest ? latest.difficulty_level : 1;
  if (lastAgg.avg_accuracy_pct >= 85) {
    recommended += 1;
  } else if (lastAgg.avg_accuracy_pct < 60) {
    recommended -= 1;
  }
  recommended = Math.max(1, Math.min(10, recommended));

  return {
    patient_id: DEMO_PATIENT_ID,
    last_7_days: {
      ...lastAgg,
      avg_latency_ms: TARGET_LATENCY_MS,
    },
    previous_7_days: prevAgg,
    accuracy_delta_pct: accuracyDelta,
    trend_direction: trendDirection,
    stability_score: TARGET_STABILITY,
    recommended_difficulty: recommended,
  };
}

export function getDemoSessionsPage(page: number, size: number): SessionsPage {
  const records = getDemoSessionRecords();
  const total = records.length;
  return {
    items: records.slice((page - 1) * size, page * size),
    total,
    page,
    size,
    pages: Math.ceil(total / size),
  };
}

/**
 * Deterministic demo memories for the Familiar Memory Album vault. Mirrors the
 * exact same entries seeded on the mobile offline DB (apps/mobile/src/db/mockData.ts).
 */
export const DEMO_MEMORIES: MemoryItemResponse[] = [
  {
    id: 'demo-memory-0001',
    patient_id: DEMO_PATIENT_ID,
    title: "Rahul's Certificate Day",
    relationship_tag: 'Family',
    era_or_date: 'Summer 2012',
    image_url:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
    audio_narration_url: null,
    caption_text: 'Rahul receiving the class trophy at his annual day ceremony.',
    created_at: '2025-06-18T10:30:00.000Z',
  },
  {
    id: 'demo-memory-0002',
    patient_id: DEMO_PATIENT_ID,
    title: 'Our Wedding Day',
    relationship_tag: 'Family',
    era_or_date: '12 May 1985',
    image_url:
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
    audio_narration_url: 'https://example.com/audio/wedding-narration.mp3',
    caption_text: 'The family gathered under the marigold arch. Meera still hums this song.',
    created_at: '2025-05-30T08:15:00.000Z',
  },
  {
    id: 'demo-memory-0003',
    patient_id: DEMO_PATIENT_ID,
    title: 'Kaziranga Family Trip',
    relationship_tag: 'Travel',
    era_or_date: 'Puja Holidays 2018',
    image_url:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    audio_narration_url: null,
    caption_text: 'Elephant safari with the grandchildren at Kaziranga.',
    created_at: '2025-05-12T16:45:00.000Z',
  },
  {
    id: 'demo-memory-0004',
    patient_id: DEMO_PATIENT_ID,
    title: 'Umiam Lake Picnic',
    relationship_tag: 'Travel',
    era_or_date: 'Winter 2016',
    image_url:
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80',
    audio_narration_url: null,
    caption_text: 'Boating at Umiam with Meera and the children after the Shillong market.',
    created_at: '2025-04-02T11:10:00.000Z',
  },
  {
    id: 'demo-memory-0005',
    patient_id: DEMO_PATIENT_ID,
    title: 'Bihu Evening at Home',
    relationship_tag: 'Music',
    era_or_date: 'Bohag Bihu 2009',
    image_url:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    audio_narration_url: 'https://example.com/audio/bihu-dhol.mp3',
    caption_text: 'The dhol from the courtyard — Aditya always kept time with his palm.',
    created_at: '2025-03-18T18:20:00.000Z',
  },
  {
    id: 'demo-memory-0006',
    patient_id: DEMO_PATIENT_ID,
    title: 'All India Radio Evenings',
    relationship_tag: 'Music',
    era_or_date: 'Monsoon 1998',
    image_url:
      'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=800&q=80',
    audio_narration_url: 'https://example.com/audio/air-assamese.mp3',
    caption_text: 'The wooden radio on the windowsill, tuned to the Assamese evening raga.',
    created_at: '2025-02-09T19:05:00.000Z',
  },
];
