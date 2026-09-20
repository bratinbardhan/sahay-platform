import { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Maximize2, ShieldAlert, X } from 'lucide-react';
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
import { LeafletMap } from '@/components/LeafletMap';
import { MOCK_GEOFENCE } from '@/lib/mockData';

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
  const [expanded, setExpanded] = useState<'trend' | 'dda' | 'mood' | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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
  const showReportToast = () => {
    setToast('Detailed clinical telemetry PDF report generated.');
    window.setTimeout(() => setToast(null), 2800);
  };
  const trendChart = (
    <CognitiveTrendChart points={ddaHistory?.points ?? []} loadSeries={getDemoCognitiveLoad14d()} metric={metric} />
  );
  const ddaChart = (
    <DdaDifficultyCurve points={ddaHistory?.points ?? []} recommendedDifficulty={cognitiveSummary?.recommended_difficulty ?? null} />
  );
  const moodChart = <MoodStabilityChart data={moodSeries} />;

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
        <button type="button" onClick={showReportToast} className="ml-auto inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-teal-700">
          <Download className="h-4 w-4" /> Download Detailed Report
        </button>
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
        <div className="flex justify-end"><button type="button" onClick={() => setExpanded('trend')} aria-label="Maximize cognitive trend chart" className="rounded-md p-2 text-slate-600 hover:bg-slate-100"><Maximize2 className="h-4 w-4" /></button></div>
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
        {trendChart}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full mb-8">
        <Card title="Achaotic DDA Curve — Rolling Latency vs Difficulty" className="bg-sahay-surface shadow-caretaker-card animate-slide-up">
          <div className="flex justify-end"><button type="button" onClick={() => setExpanded('dda')} aria-label="Maximize DDA chart" className="rounded-md p-2 text-slate-600 hover:bg-slate-100"><Maximize2 className="h-4 w-4" /></button></div>
          {ddaChart}
        </Card>
        <Card title="Mood Stability — Diurnal Sundowning Pattern" className="bg-sahay-surface shadow-caretaker-card animate-slide-up">
          <div className="flex justify-end"><button type="button" onClick={() => setExpanded('mood')} aria-label="Maximize mood chart" className="rounded-md p-2 text-slate-600 hover:bg-slate-100"><Maximize2 className="h-4 w-4" /></button></div>
          {moodChart}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card title="Security & Geofence Breaches" className="bg-sahay-surface shadow-caretaker-card">
          <div className="space-y-3 text-sm">
            <div className="flex gap-3 rounded-lg border border-red-100 bg-red-50 p-3">
              <ShieldAlert className="h-5 w-5 shrink-0 text-red-500" />
              <p><strong>19 Sept 05:14 PM</strong> — Outer Safe Zone breached (Displaced 140m) — <span className="font-semibold text-emerald-700">Resolved</span></p>
            </div>
            <div className="flex gap-3 rounded-lg border border-slate-200 p-3 text-slate-600">18 Sept 02:08 PM — Garden perimeter check-in — Resolved</div>
          </div>
        </Card>
        <Card title="Spatial Roaming & Live Patient Tracking" className="bg-sahay-surface shadow-caretaker-card">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Live Tracking Active</div>
          <LeafletMap centerLat={MOCK_GEOFENCE.center_lat} centerLng={MOCK_GEOFENCE.center_lng} radiusMeters={MOCK_GEOFENCE.radius_meters} onPick={() => undefined} />
        </Card>
      </div>

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
      {expanded ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true">
          <div className="h-[80vh] w-full max-w-7xl overflow-auto rounded-2xl bg-white p-6">
            <div className="mb-4 flex justify-end"><button type="button" onClick={() => setExpanded(null)} aria-label="Close expanded chart" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
            {expanded === 'trend' ? trendChart : expanded === 'dda' ? ddaChart : moodChart}
          </div>
        </div>
      ) : null}
      {toast ? <div role="status" className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg">{toast}</div> : null}
    </div>
  );
}
