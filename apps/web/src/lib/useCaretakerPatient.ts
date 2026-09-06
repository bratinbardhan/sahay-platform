import { useEffect, useState } from 'react';
import type { PatientProfile } from '@sahay/types';
import { fetchCaretakerPatient } from '@/lib/api';
import { getDemoPatient } from '@/lib/demoSeed';

export interface CaretakerPatientState {
  patient: PatientProfile | null;
  loading: boolean;
  error: string | null;
  /** True when the rendered patient is the synthetic demo seed, not live data. */
  isDemo: boolean;
}

/**
 * Resolve the patient assigned to the authenticated caretaker via
 * GET /api/v1/analytics/me/patient. Falls back to the deterministic demo
 * patient when the backend is unreachable or no patient is assigned yet, so
 * the dashboard still renders (flagged `isDemo` for the UI badge).
 */
export function useCaretakerPatient(token: string | null): CaretakerPatientState {
  const [state, setState] = useState<CaretakerPatientState>({
    patient: null,
    loading: Boolean(token),
    error: null,
    isDemo: false,
  });

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setState({ patient: getDemoPatient(), loading: false, error: null, isDemo: true });
      return () => {
        cancelled = true;
      };
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    fetchCaretakerPatient(token)
      .then((patient) => {
        if (!cancelled) {
          setState({ patient, loading: false, error: null, isDemo: false });
        }
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        const message = err instanceof Error ? err.message : 'Analytics unavailable';
        setState({ patient: getDemoPatient(), loading: false, error: message, isDemo: true });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return state;
}