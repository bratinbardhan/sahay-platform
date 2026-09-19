import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/Card';
import { useCaretakerPatient } from '@/lib/useCaretakerPatient';
import { usePatientAnalytics } from '@/lib/usePatientAnalytics';
import { useGameplaySessions } from '@/lib/useGameplaySessions';
import { GDS_STAGE_LABELS } from '@/lib/gdsUtils';
import { getDemoActivityHeatmap, getDemoCognitiveLoad14d, getDemoMoodStability14d } from '@/lib/demoSeed';

import { CognitiveTrendChart } from './charts/CognitiveTrendChart';
import { DdaDifficultyCurve } from './charts/DdaDifficultyCurve';
import { MoodStabilityChart } from './charts/MoodStabilityChart';
import { SessionPerformanceChart } from './charts/SessionPerformanceChart';
import { ActivityHeatmap } from './charts/ActivityHeatmap';

interface AnalyticsChartProps {
  onNavigate: (page: string) => void;
  token: string;
}

const SESSION_PAGE_SIZE = 14;

const TREND_LABELS: Record<string, string> = {
  IMPROVING: 'Improving',
  STABLE: 'Stable',
  DECLINING: 'Declining',
  INSUFFICIENT_DATA: 'Building baseline…',
};

export function AnalyticsChart({ onNavigate, token }: AnalyticsChartProps) {
  const [metric, setMetric] = useState<'load' | 'latency'>('load');

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
  const moodSeries = getDemoMoodStability14d();
  const heatmapCells = getDemoActivityHeatmap();

  return (
    <div className="min-h-screen bg-sahay-bg p-4 sm:p-8 animate-fade-in" data-palette="caretaker">
      <div className="flex items-center mb-6">
        <button
          type="button"
          className="mr-4 p-2 rounded-lg bg-sahay-surface border-2 border-sahay-ink text-sahay-ink hover:bg-sahay-surface-sunken transition-all duration-care ease-care"
          onClick={() => onNavigate('dashboard')}
          aria-label="Back to dashboard"
        >
          <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
        </button>
        <h1 className="text-3xl font-bold text-sahay-ink">Cognitive Health Analytics</h1>
        {isDemo ? (
          <span className="ml-auto rounded-full border-2 border-sahay-accent bg-sahay-surface px-3 py-1 text-xs font-semibold text-sahay-accent">
            Demo data — 14-day seed
          </span>
        ) : null}
      </div>

      <p className="text-sahay-ink/70 mb-6">
        {patient ? `Live telemetry for ${patient.name}` : 'Live telemetry'} — cognitive load,
        Achaotic DDA, sundowning mood, session throughput, and touch-latency heat.
      </p>

      {cognitiveSummary ? (
        <Card title="7-Day Cognitive Summary" className="mb-8 bg-sahay-surface shadow-caretaker-card animate-slide-up">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-sahay-ink">
                {TREND_LABELS[cognitiveSummary.trend_direction] ?? cognitiveSummary.trend_direction}
              </div>
              <div className="text-sm text-sahay-ink/70">
                {cognitiveSummary.accuracy_delta_pct >= 0 ? '+' : ''}
                {cognitiveSummary.accuracy_delta_pct}% accuracy vs prior week
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-sahay-ink">
                {cognitiveSummary.stability_score.toFixed(0)}%
              </div>
              <div className="text-sm text-sahay-ink/70">Stability Score</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-sahay-accent">
                {cognitiveSummary.recommended_difficulty}
              </div>
              <div className="text-sm text-sahay-ink/70">Recommended Difficulty</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-sahay-ink">
                {Math.round(cognitiveSummary.last_7_days.avg_latency_ms)}ms
              </div>
              <div className="text-sm text-sahay-ink/70">Avg Latency (7 Days)</div>
            </div>
          </div>
        </Card>
      ) : null}

      <Card
        title={metric === 'load' ? 'Cognitive Load Index — Clinical Thresholds' : 'Reaction Latency Trend'}
        className="mb-8 bg-sahay-surface shadow-caretaker-card animate-slide-up"
      >
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setMetric('load')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border-2 transition-all duration-care ease-care ${
              metric === 'load'
                ? 'bg-sahay-accent border-sahay-accent text-white'
                : 'bg-sahay-surface border-sahay-ink text-sahay-ink'
            }`}
          >
            Cognitive Load
          </button>
          <button
            type="button"
            onClick={() => setMetric('latency')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border-2 transition-all duration-care ease-care ${
              metric === 'latency'
                ? 'bg-sahay-accent border-sahay-accent text-white'
                : 'bg-sahay-surface border-sahay-ink text-sahay-ink'
            }`}
          >
            Reaction Latency
          </button>
        </div>
        <CognitiveTrendChart
          points={ddaHistory?.points ?? []}
          loadSeries={getDemoCognitiveLoad14d()}
          metric={metric}
        />
      </Card>

      <Card title="Achaotic DDA Curve — Rolling Latency vs Difficulty" className="mb-8 bg-sahay-surface shadow-caretaker-card animate-slide-up">
        <DdaDifficultyCurve
          points={ddaHistory?.points ?? []}
          recommendedDifficulty={cognitiveSummary?.recommended_difficulty ?? null}
        />
        <p className="text-xs text-sahay-ink/60 mt-2">
          Difficulty follows a 3-session trailing average of error rate and a 5-session latency
          average (~420 ms). The engine never jumps a full level in a single round.
        </p>
      </Card>

      <Card title="Mood Stability — Diurnal Sundowning Pattern" className="mb-8 bg-sahay-surface shadow-caretaker-card animate-slide-up">
        <MoodStabilityChart data={moodSeries} />
        <p className="text-xs text-sahay-ink/60 mt-2">
          Late-afternoon scores dip 18–28 points below morning observations, consistent with
          sundowning. Evening partially recovers.
        </p>
      </Card>

      <Card title="Session Performance — Daily Attempts vs Completed" className="mb-8 bg-sahay-surface shadow-caretaker-card animate-slide-up">
        <SessionPerformanceChart sessions={sessions} />
      </Card>

      <Card title="Activity & Touch Latency Heatmap (7 × 24)" className="mb-8 bg-sahay-surface shadow-caretaker-card animate-slide-up">
        <ActivityHeatmap cells={heatmapCells} />
        <p className="text-xs text-sahay-ink/60 mt-2">
          7×24 grid coloured with a D3 latency scale: calm teal (fast) through ~420 ms, amber clusters in
          late afternoon (sundowning).
        </p>
      </Card>

      <Card title="Session Logs" className="bg-sahay-surface shadow-caretaker-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-sahay-ink">
                <th className="text-left p-2 text-sahay-ink">Session</th>
                <th className="text-left p-2 text-sahay-ink">Game</th>
                <th className="text-left p-2 text-sahay-ink">GDS</th>
                <th className="text-right p-2 text-sahay-ink">Latency</th>
                <th className="text-right p-2 text-sahay-ink">Clean/Total</th>
                <th className="text-right p-2 text-sahay-ink">Score</th>
                <th className="text-right p-2 text-sahay-ink">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((log, index) => {
                const stageLabel = GDS_STAGE_LABELS[log.gds_stage] ?? `Stage ${log.gds_stage}`;
                return (
                  <tr key={log.session_log_id} className="border-b border-sahay-ink/20">
                    <td className="p-2 font-medium text-sahay-ink">
                      {(page - 1) * SESSION_PAGE_SIZE + index + 1}
                    </td>
                    <td className="p-2 text-sahay-ink">{log.game_module_id.replace(/_/g, ' ')}</td>
                    <td className="p-2 text-sahay-ink">{stageLabel}</td>
                    <td className="text-right p-2 text-sahay-accent font-medium">
                      {Math.round(log.avg_latency_ms)}ms
                    </td>
                    <td className="text-right p-2 text-sahay-ink">
                      {log.tasks_completed_cleanly}/{log.tasks_presented}
                    </td>
                    <td className="text-right p-2 text-sahay-ink">{log.score}</td>
                    <td className="text-right p-2 text-sahay-ink">{log.demitokens_earned}</td>
                  </tr>
                );
              })}
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-sahay-ink/60">
                    No gameplay sessions recorded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {pages > 1 ? (
          <div className="flex items-center justify-end gap-3 mt-3 text-sm text-sahay-ink">
            <span>
              Page {page} of {pages} — {total} sessions
            </span>
            <button
              type="button"
              className="p-1.5 rounded-lg border-2 border-sahay-ink bg-sahay-surface disabled:opacity-40"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <button
              type="button"
              className="p-1.5 rounded-lg border-2 border-sahay-ink bg-sahay-surface disabled:opacity-40"
              onClick={() => setPage(page + 1)}
              disabled={page >= pages}
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
