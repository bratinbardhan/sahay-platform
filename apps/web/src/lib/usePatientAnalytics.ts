import { useEffect, useState } from 'react';
import type { CognitiveSummaryResponse, DdaHistoryResponse } from '@sahay/types';
import { fetchCognitiveSummary, fetchDdaHistory } from '@/lib/api';
import {
  DEMO_PATIENT_ID,
  getDemoCognitiveSummary,
  getDemoDdaHistory,
} from '@/lib/demoSeed';

export interface PatientAnalyticsState {
  ddaHistory: DdaHistoryResponse | null;
  cognitiveSummary: CognitiveSummaryResponse | null;
  loading: boolean;
  error: string | null;
  /** True when the rendered analytics are the synthetic demo seed. */
  isDemo: boolean;
}

function demoAnalytics(error: string | null): PatientAnalyticsState {
  return {
    ddaHistory: getDemoDdaHistory(),
    cognitiveSummary: getDemoCognitiveSummary(),
    loading: false,
    error,
    isDemo: true,
  };
}

/**
 * Live DDA telemetry + 7-day cognitive summary for a patient.
 *
 * Brand-new patients (zero gameplay records) are served the deterministic
 * demo seed so charts render instead of breaking; network failures fall back
 * the same way with the error surfaced for display.
 */
export function usePatientAnalytics(
  token: string | null,
  patientId: string | null
): PatientAnalyticsState {
  const [state, setState] = useState<PatientAnalyticsState>({
    ddaHistory: null,
    cognitiveSummary: null,
    loading: false,
    error: null,
    isDemo: false,
  });

  useEffect(() => {
    let cancelled = false;
    if (!patientId) {
      setState({ ddaHistory: null, cognitiveSummary: null, loading: false, error: null, isDemo: false });
      return () => {
        cancelled = true;
      };
    }
    if (!token || patientId === DEMO_PATIENT_ID) {
      setState(demoAnalytics(null));
      return () => {
        cancelled = true;
      };
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    Promise.all([fetchDdaHistory(token, patientId), fetchCognitiveSummary(token, patientId)])
      .then(([ddaHistory, cognitiveSummary]) => {
        if (cancelled) {
          return;
        }
        if (ddaHistory.points.length === 0 && cognitiveSummary.last_7_days.sessions === 0) {
          // Brand-new patient with zero records → demo seed so charts render.
          setState(demoAnalytics(null));
          return;
        }
        setState({ ddaHistory, cognitiveSummary, loading: false, error: null, isDemo: false });
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        const message = err instanceof Error ? err.message : 'Analytics unavailable';
        setState(demoAnalytics(message));
      });

    return () => {
      cancelled = true;
    };
  }, [token, patientId]);

  return state;
}