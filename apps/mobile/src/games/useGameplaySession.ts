import * as Crypto from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';
import type { PatientProfile } from '@sahay/types';

import { addDemitokens, insertGameplaySession } from '@/db/patientRepository';
import { AchaoticDDA, type DifficultyVariables } from '@/engine/AchaoticDDA';
import type { GameModuleId } from '@/games/gdsRouting';

const TOKENS_CLEAN = 2;
const TOKENS_GUIDED = 1;

type SessionState = {
  tasksPresented: number;
  tasksCompletedCleanly: number;
  tasksGuided: number;
  latencies: number[];
  demitokensEarned: number;
  difficulty: DifficultyVariables;
};

export function useGameplaySession(patient: PatientProfile, gameModuleId: GameModuleId) {
  const engineRef = useRef(new AchaoticDDA());
  const taskStartedAt = useRef(Date.now());
  const [session, setSession] = useState<SessionState>({
    tasksPresented: 0,
    tasksCompletedCleanly: 0,
    tasksGuided: 0,
    latencies: [],
    demitokensEarned: 0,
    difficulty: engineRef.current.getVariables(),
  });
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    engineRef.current.reset();
    taskStartedAt.current = Date.now();
  }, [gameModuleId]);

  const beginTask = (): void => {
    taskStartedAt.current = Date.now();
  };

  const completeTask = async (completedCleanly: boolean): Promise<DifficultyVariables> => {
    const latencyMs = Math.max(80, Date.now() - taskStartedAt.current);
    const difficulty = engineRef.current.recordTask({ latencyMs, completedCleanly });
    const tokens = completedCleanly ? TOKENS_CLEAN : TOKENS_GUIDED;

    setSession((prev) => ({
      tasksPresented: prev.tasksPresented + 1,
      tasksCompletedCleanly: prev.tasksCompletedCleanly + (completedCleanly ? 1 : 0),
      tasksGuided: prev.tasksGuided + (completedCleanly ? 0 : 1),
      latencies: [...prev.latencies, latencyMs],
      demitokensEarned: prev.demitokensEarned + tokens,
      difficulty,
    }));

    await addDemitokens(patient.id, tokens);
    return difficulty;
  };

  const persistSession = async (): Promise<void> => {
    const current = sessionRef.current;
    if (current.tasksPresented === 0) {
      return;
    }
    const avgLatency =
      current.latencies.reduce((sum, value) => sum + value, 0) / current.latencies.length;

    await insertGameplaySession({
      id: Crypto.randomUUID(),
      patientId: patient.id,
      gameModuleId,
      gdsStage: patient.assigned_gds_stage,
      difficultyLevel: current.difficulty.difficultyLevel,
      tasksPresented: current.tasksPresented,
      tasksCompletedCleanly: current.tasksCompletedCleanly,
      tasksGuided: current.tasksGuided,
      avgLatencyMs: avgLatency,
      demitokensEarned: current.demitokensEarned,
    });
  };

  return {
    session,
    beginTask,
    completeTask,
    persistSession,
  };
}
