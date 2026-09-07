import { useCallback, useEffect, useState } from 'react';
import type { SessionRecord } from '@sahay/types';
import { fetchGameplaySessions } from '@/lib/api';
import { DEMO_PATIENT_ID, getDemoSessionsPage } from '@/lib/demoSeed';

export interface GameplaySessionsState {
  sessions: SessionRecord[];
  total: number;
  page: number;
  pages: number;
  loading: boolean;
  error: string | null;
  /** True when the rendered records are the synthetic demo seed. */
  isDemo: boolean;
  setPage: (page: number) => void;
}

/**
 * Paginated live gameplay session records (GET .../sessions).
 *
 * Falls back to the deterministic demo seed for brand-new patients (zero
 * records) or network failures; `isDemo` flags the fallback for the UI.
 */
export function useGameplaySessions(
  token: string | null,
  patientId: string | null,
  size = 10
): GameplaySessionsState {
  const [page, setPageState] = useState(1);
  const [state, setState] = useState<Omit<GameplaySessionsState, 'setPage'>>({
    sessions: [],
    total: 0,
    page: 1,
    pages: 0,
    loading: false,
    error: null,
    isDemo: false,
  });

  const setPage = useCallback((next: number) => {
    setPageState(Math.max(1, next));
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!patientId) {
      setState({ sessions: [], total: 0, page: 1, pages: 0, loading: false, error: null, isDemo: false });
      return () => {
        cancelled = true;
      };
    }
    if (!token || patientId === DEMO_PATIENT_ID) {
      const demo = getDemoSessionsPage(1, size);
      setPageState(1);
      setState({
        sessions: demo.items,
        total: demo.total,
        page: demo.page,
        pages: demo.pages,
        loading: false,
        error: null,
        isDemo: true,
      });
      return () => {
        cancelled = true;
      };
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    fetchGameplaySessions(token, patientId, page, size)
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (result.total === 0) {
          // Brand-new patient with zero records → demo seed so charts render.
          const demo = getDemoSessionsPage(1, size);
          setState({
            sessions: demo.items,
            total: demo.total,
            page: demo.page,
            pages: demo.pages,
            loading: false,
            error: null,
            isDemo: true,
          });
          return;
        }
        setState({
          sessions: result.items,
          total: result.total,
          page: result.page,
          pages: result.pages,
          loading: false,
          error: null,
          isDemo: false,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        const message = err instanceof Error ? err.message : 'Session logs unavailable';
        const demo = getDemoSessionsPage(1, size);
        setState({
          sessions: demo.items,
          total: demo.total,
          page: demo.page,
          pages: demo.pages,
          loading: false,
          error: message,
          isDemo: true,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [token, patientId, page, size]);

  return { ...state, setPage };
}