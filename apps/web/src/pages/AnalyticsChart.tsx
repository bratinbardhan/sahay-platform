import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/Card';
import { useCaretakerPatient } from '@/lib/useCaretakerPatient';
import { usePatientAnalytics } from '@/lib/usePatientAnalytics';
import { useGameplaySessions } from '@/lib/useGameplaySessions';
import { GDS_STAGE_LABELS } from '@/lib/gdsUtils';

import { CognitiveTrendChart } from './charts/CognitiveTrendChart';
import { DdaDifficultyCurve } from './charts/DdaDifficultyCurve';

interface AnalyticsChartProps {
  onNavigate: (page: string) => void;
  token: string;
}

const SESSION_PAGE_SIZE = 10;

const TREND_LABELS: Record<string, string> = {
  IMPROVING: 'Improving',
  STABLE: 'Stable',
  DECLINING: 'Declining',
  INSUFFICIENT_DATA: 'Building baseline…',
};

export function AnalyticsChart({ onNavigate, token }: AnalyticsChartProps) {
  const [metric, setMetric] = useState<'load' | 'latency'>('load');

  // Live telemetry: caretaker's patient → DDA history + paginated session logs.
  const { patient, isDemo: patientIsDemo } = useCaretakerPatient(token);
  const { ddaHistory, cognitiveSummary, isDemo: analyticsIsDemo } = usePatientAnalytics(
    token,
    patient?.id ?? null
  );
  const { sessions, total, page, pages, setPage, isDemo: sessionsIsDemo } = useGameplaySessions(
    token,
    patient?.id ?? null,
    SESSION_PAGE_SIZE
  );
  const isDemo = patientIsDemo || analyticsIsDemo || sessionsIsDemo;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8 overflow-x-hidden animate-in">
      <div className="flex items-center mb-6">
        <button
          type="button"
          className="mr-4 p-2 rounded-lg bg-white border-2 border-slate-300 text-slate-800 hover:bg-slate-200"
          onClick={() => onNavigate('dashboard')}
          aria-label="Back to dashboard"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-3xl font-bold text-slate-800">Cognitive Health Analytics</h1>
        {isDemo && (
          <span className="ml-auto rounded-full border-2 border-teal-600 bg-white px-3 py-1 text-xs font-semibold text-teal-600">
            Demo data — live telemetry unavailable
          </span>
        )}
      </div>

      <p className="text-slate-800/70 mb-6">
        {patient ? `Live telemetry for ${patient.name}` : 'Live telemetry'} — cognitive load,
        reaction latency, and the Achaotic DDA difficulty curve.
      </p>

      {/* 7-day Cognitive Summary */}
      {cognitiveSummary && (
        <Card title="7-Day Cognitive Summary" className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-slate-800">
                {TREND_LABELS[cognitiveSummary.trend_direction] ?? cognitiveSummary.trend_direction}
              </div>
              <div className="text-sm text-slate-800/70">
                {cognitiveSummary.accuracy_delta_pct >= 0 ? '+' : ''}
                {cognitiveSummary.accuracy_delta_pct}% accuracy vs prior week
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">
                {cognitiveSummary.stability_score.toFixed(0)}
              </div>
              <div className="text-sm text-slate-800/70">Stability Score</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-teal-600">
                {cognitiveSummary.recommended_difficulty}
              </div>
              <div className="text-sm text-slate-800/70">Recommended Difficulty</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">
                {Math.round(cognitiveSummary.last_7_days.avg_latency_ms)}ms
              </div>
              <div className="text-sm text-slate-800/70">Avg Latency (7 Days)</div>
            </div>
          </div>
        </Card>
      )}

      {/* Cognitive trajectory (load index or reaction latency) */}
      <Card
        title={
          metric === 'load' ? 'Cognitive Load Index Trend' : 'Reaction Latency Trend'
        }
        className="mb-8"
      >
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setMetric('load')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border-2 transition-colors ${
              metric === 'load'
                ? 'bg-teal-600 border-teal-600 text-white'
                : 'bg-white border-slate-300 text-slate-800'
            }`}
          >
            Cognitive Load
          </button>
          <button
            type="button"
            onClick={() => setMetric('latency')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border-2 transition-colors ${
              metric === 'latency'
                ? 'bg-teal-600 border-teal-600 text-white'
                : 'bg-white border-slate-300 text-slate-800'
            }`}
          >
            Reaction Latency
          </button>
        </div>
        <CognitiveTrendChart points={ddaHistory?.points ?? []} metric={metric} />
      </Card>

      {/* Achaotic DDA Difficulty Curve (last 10 rounds) */}
      <Card title="Achaotic DDA Difficulty Curve — Last 10 Rounds" className="mb-8">
        <DdaDifficultyCurve
          points={ddaHistory?.points ?? []}
          recommendedDifficulty={cognitiveSummary?.recommended_difficulty ?? null}
        />
        <p className="text-xs text-slate-800/60 mt-2">
          The Achaotic DDA engine applies a non-spiking weighted rolling average to touch latency
          and error frequency. Difficulty rises and falls only gradually as long-term performance
          improves; the dashed amber guide marks the recommended next level.
        </p>
      </Card>

      {/* Session Logs Table */}
      <Card title="Session Logs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300">
                <th className="text-left p-2 text-slate-800">Session</th>
                <th className="text-left p-2 text-slate-800">Game</th>
                <th className="text-left p-2 text-slate-800">GDS</th>
                <th className="text-right p-2 text-slate-800">Latency</th>
                <th className="text-right p-2 text-slate-800">Clean/Total</th>
                <th className="text-right p-2 text-slate-800">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((log, index) => {
                const stageLabel = GDS_STAGE_LABELS[log.gds_stage] ?? `Stage ${log.gds_stage}`;
                return (
                  <tr key={log.session_log_id} className="border-b border-slate-300/20">
                    <td className="p-2 font-medium text-slate-800">
                      {(page - 1) * SESSION_PAGE_SIZE + index + 1}
                    </td>
                    <td className="p-2 text-slate-800">{log.game_module_id.replace(/_/g, ' ')}</td>
                    <td className="p-2 text-slate-800">{stageLabel}</td>
                    <td className="text-right p-2 text-teal-600 font-medium">
                      {Math.round(log.avg_latency_ms)}ms
                    </td>
                    <td className="text-right p-2 text-slate-800">
                      {log.tasks_completed_cleanly}/{log.tasks_presented}
                    </td>
                    <td className="text-right p-2 text-slate-800">{log.score}</td>
                    <td className="text-right p-2 text-slate-800">{log.demitokens_earned}</td>
                  </tr>
                );
              })}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-slate-800/60">
                    No gameplay sessions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-end gap-3 mt-3 text-sm text-slate-800">
            <span>
              Page {page} of {pages} — {total} sessions
            </span>
            <button
              type="button"
              className="p-1.5 rounded-lg border-2 border-slate-300 bg-white disabled:opacity-40"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="p-1.5 rounded-lg border-2 border-slate-300 bg-white disabled:opacity-40"
              onClick={() => setPage(page + 1)}
              disabled={page >= pages}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}


