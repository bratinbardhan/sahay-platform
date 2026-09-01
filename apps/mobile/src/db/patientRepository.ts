import type { PatientProfile, ReminiscenceMedia } from '@sahay/types';

import { DatabaseService } from '@/db/DatabaseService';

const DEMO_PATIENT_ID = '11111111-1111-4111-8111-111111111111';
const DEMO_CAREGIVER_ID = '22222222-2222-4222-8222-222222222222';

export type PatientRow = {
  id: string;
  caregiver_id: string;
  name: string;
  age: number;
  assigned_gds_stage: number;
  primary_language: string;
  demitoken_balance: number;
  streak_days: number;
  created_at: string;
};

export async function getActivePatient(): Promise<PatientProfile | null> {
  const db = await DatabaseService.getDatabase();
  const demo = await db.getFirstAsync<PatientRow>(
    'SELECT * FROM patient_profiles WHERE id = ?',
    DEMO_PATIENT_ID
  );
  if (demo) {
    return demo;
  }
  return db.getFirstAsync<PatientRow>(
    'SELECT * FROM patient_profiles ORDER BY created_at ASC LIMIT 1'
  );
}

export async function addDemitokens(patientId: string, amount: number): Promise<number> {
  const db = await DatabaseService.getDatabase();
  await db.runAsync(
    'UPDATE patient_profiles SET demitoken_balance = demitoken_balance + ? WHERE id = ?',
    amount,
    patientId
  );
  const row = await db.getFirstAsync<{ demitoken_balance: number }>(
    'SELECT demitoken_balance FROM patient_profiles WHERE id = ?',
    patientId
  );
  return row?.demitoken_balance ?? 0;
}

export async function getFamilyPhotos(patientId: string): Promise<ReminiscenceMedia[]> {
  const db = await DatabaseService.getDatabase();
  return db.getAllAsync<ReminiscenceMedia>(
    `SELECT id, patient_id, media_type, file_url, label_text, relation_tag, event_year, checksum_sha256
     FROM reminiscence_media
     WHERE patient_id = ? AND media_type = 'PHOTO'
     ORDER BY relation_tag ASC`,
    patientId
  );
}

export async function insertGameplaySession(params: {
  id: string;
  patientId: string;
  gameModuleId: string;
  gdsStage: number;
  difficultyLevel: number;
  tasksPresented: number;
  tasksCompletedCleanly: number;
  tasksGuided: number;
  avgLatencyMs: number;
  demitokensEarned: number;
}): Promise<void> {
  const db = await DatabaseService.getDatabase();
  await db.runAsync(
    `INSERT INTO gameplay_session_logs (
      id, patient_id, game_module_id, gds_stage, difficulty_level,
      tasks_presented, tasks_completed_cleanly, tasks_guided,
      avg_latency_ms, demitokens_earned, sync_status, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_SYNC', datetime('now'))`,
    params.id,
    params.patientId,
    params.gameModuleId,
    params.gdsStage,
    params.difficultyLevel,
    params.tasksPresented,
    params.tasksCompletedCleanly,
    params.tasksGuided,
    params.avgLatencyMs,
    params.demitokensEarned
  );
}

const FAMILY_PHOTOS: Array<{
  id: string;
  label: string;
  relation: string;
  year: number;
  seed: string;
}> = [
  {
    id: '33333333-3333-4333-8333-333333333331',
    label: 'Rahul',
    relation: 'Grandson',
    year: 2012,
    seed: 'sahay-rahul',
  },
  {
    id: '33333333-3333-4333-8333-333333333332',
    label: 'Meera',
    relation: 'Daughter',
    year: 1982,
    seed: 'sahay-meera',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    label: 'Anil',
    relation: 'Brother',
    year: 1956,
    seed: 'sahay-anil',
  },
  {
    id: '33333333-3333-4333-8333-333333333334',
    label: 'Lata',
    relation: 'Granddaughter',
    year: 2016,
    seed: 'sahay-lata',
  },
];

/** Temporary local seed so AppRouter has a GDS stage to read. */
export async function seedLocalPatientIfNeeded(): Promise<void> {
  const db = await DatabaseService.getDatabase();
  const existing = await db.getFirstAsync<PatientRow>(
    'SELECT * FROM patient_profiles WHERE id = ?',
    DEMO_PATIENT_ID
  );

  if (existing) {
    await db.runAsync(
      `UPDATE patient_profiles
       SET name = ?, assigned_gds_stage = ?, primary_language = ?
       WHERE id = ?`,
      'Jeniva Saha',
      1,
      'as',
      DEMO_PATIENT_ID
    );
  } else {
    await db.runAsync(
      `INSERT INTO patient_profiles (
        id, caregiver_id, name, age, assigned_gds_stage, primary_language,
        demitoken_balance, streak_days, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      DEMO_PATIENT_ID,
      DEMO_CAREGIVER_ID,
      'Jeniva Saha',
      72,
      1,
      'as',
      0,
      1
    );
  }

  for (const member of FAMILY_PHOTOS) {
    const photo = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM reminiscence_media WHERE id = ?',
      member.id
    );
    const fileUrl = `https://picsum.photos/seed/${member.seed}/600/600`;
    if (photo) {
      await db.runAsync(
        'UPDATE reminiscence_media SET file_url = ?, label_text = ?, relation_tag = ? WHERE id = ?',
        fileUrl,
        member.label,
        member.relation,
        member.id
      );
    } else {
      await db.runAsync(
        `INSERT INTO reminiscence_media (
          id, patient_id, media_type, file_url, label_text, relation_tag, event_year, checksum_sha256
        ) VALUES (?, ?, 'PHOTO', ?, ?, ?, ?, ?)`,
        member.id,
        DEMO_PATIENT_ID,
        fileUrl,
        member.label,
        member.relation,
        member.year,
        member.id.replace(/-/g, '')
      );
    }
  }
}
