import type {
  CognitiveSummaryResponse,
  CognitiveWindowAggregate,
  DdaHistoryPoint,
  DdaHistoryResponse,
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
} = {
  id: 'demo-caretaker-ram',
  name: 'Ram',
  email: 'ram',
  role: 'caretaker',
  patientId: 'demo-patient-aditya',
};

export const DEMO_PATIENT: {
  id: string;
  name: string;
  email: string;
  role: string;
} = {
  id: 'demo-patient-aditya',
  name: 'Aditya',
  email: 'aditya',
  role: 'patient',
};

export const DEMO_PATIENT_ID = DEMO_PATIENT.id;

const DEMO_GAME_MODULES = ['rapid_fire_sorting', 'serial_number_scatter'] as const;

const SESSION_COUNT = 10;

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
    age: 72,
    assigned_gds_stage: 4,
    primary_language: 'en',
    demitoken_balance: 128,
    streak_days: 14,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/** Demo sessions improve steadily: reaction latency tightens with each round. */
function latencyForRound(roundsAgo: number): number {
  return Math.max(280, Math.round(1050 - roundsAgo * 55));
}

/** Ten demo sessions over the last ten days, newest first (page-1 shape). */
export function getDemoSessionRecords(): SessionRecord[] {
  const rand = mulberry32(97531);
  const records: SessionRecord[] = [];
  for (let i = 0; i < SESSION_COUNT; i += 1) {
    const roundsAgo = SESSION_COUNT - 1 - i; // 0 = newest
    const presented = 12 + Math.floor(rand() * 6);
    const guided = Math.max(0, Math.round(rand() * 3) - Math.floor(roundsAgo / 4));
    const clean = presented - guided;
    records.push({
      session_log_id: `${DEMO_PATIENT_ID}-s${i + 1}`,
      game_module_id: DEMO_GAME_MODULES[i % DEMO_GAME_MODULES.length],
      gds_stage: 4,
      difficulty_level: Math.min(6, 2 + Math.floor(roundsAgo / 3)),
      duration_seconds: 300 + Math.round(rand() * 120),
      avg_latency_ms: latencyForRound(roundsAgo),
      score: clean * 10 + guided * 2,
      accuracy_pct: Math.round((clean / presented) * 10000) / 100,
      demitokens_earned: clean * 2 + guided,
      tasks_presented: presented,
      tasks_completed_cleanly: clean,
      timestamp: new Date(Date.now() - roundsAgo * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  return records;
}

/** Chronological demo sessions (oldest first) — the DDA-series input order. */
function orderedDemoSessions(): SessionRecord[] {
  return [...getDemoSessionRecords()].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/** Reaction latency carried on the demo session record itself. */
function demoLatency(s: SessionRecord): number {
  return s.avg_latency_ms;
}

function trailingAverage(values: number[], index: number, window: number): number {
  const low = Math.max(0, index - window + 1);
  const chunk = values.slice(low, index + 1);
  return chunk.reduce((sum, v) => sum + v, 0) / chunk.length;
}

/** Demo DDA history, mirroring the backend's derived-series math. */
export function getDemoDdaHistory(): DdaHistoryResponse {
  const sessions = orderedDemoSessions();
  const points: DdaHistoryPoint[] = sessions.map((s, i) => {
    const guided = s.tasks_presented - s.tasks_completed_cleanly;
    const errorRate = s.tasks_presented > 0 ? guided / s.tasks_presented : 0;
    const latencyRolling =
      Math.round(trailingAverage(sessions.map(demoLatency), i, 10) * 100) / 100;
    const difficultyRolling =
      Math.round(trailingAverage(sessions.map((x) => x.difficulty_level), i, 3) * 1000) / 1000;
    return {
      timestamp: s.timestamp,
      cognitive_load_index: cognitiveLoadIndex(latencyRolling, errorRate),
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
      Math.round(
        (rows.reduce((sum, s) => sum + s.difficulty_level, 0) / rows.length) * 100
      ) / 100,
  };
}

/** Demo cognitive summary (7-day vs previous 7-day), mirroring backend math. */
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

  let trendDirection: TrendDirection = 'INSUFFICIENT_DATA';
  let accuracyDelta = 0;
  if (last7.length > 0 && prev7.length > 0) {
    accuracyDelta =
      Math.round((lastAgg.avg_accuracy_pct - prevAgg.avg_accuracy_pct) * 100) / 100;
    trendDirection =
      accuracyDelta >= 2 ? 'IMPROVING' : accuracyDelta <= -2 ? 'DECLINING' : 'STABLE';
  }

  const accuracies = last7.map((s) =>
    s.tasks_presented > 0 ? (s.tasks_completed_cleanly / s.tasks_presented) * 100 : 0
  );
  const count = accuracies.length;
  const mean = accuracies.reduce((sum, a) => sum + a, 0) / (count || 1);
  const variance = accuracies.reduce((sum, a) => sum + (a - mean) ** 2, 0) / (count || 1);
  const stabilityScore =
    count === 0 ? 0 : Math.round(Math.max(0, 100 - 2 * Math.sqrt(variance)) * 100) / 100;

  const latest = sessions[sessions.length - 1];
  let recommended = latest ? latest.difficulty_level : 1;
  if (count > 0 && lastAgg.avg_accuracy_pct >= 85) {
    recommended += 1;
  } else if (count > 0 && lastAgg.avg_accuracy_pct < 60) {
    recommended -= 1;
  }
  recommended = Math.max(1, Math.min(10, recommended));

  return {
    patient_id: DEMO_PATIENT_ID,
    last_7_days: lastAgg,
    previous_7_days: prevAgg,
    accuracy_delta_pct: accuracyDelta,
    trend_direction: trendDirection,
    stability_score: stabilityScore,
    recommended_difficulty: recommended,
  };
}

/** Paginate the demo records with the same contract as the live endpoint. */
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