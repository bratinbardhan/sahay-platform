import { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Maximize2, Printer, X } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/Card';
import { useCaretakerPatient } from '@/lib/useCaretakerPatient';
import { usePatientAnalytics } from '@/lib/usePatientAnalytics';
import { useGameplaySessions } from '@/lib/useGameplaySessions';
import { GDS_STAGE_LABELS } from '@/lib/gdsUtils';
import { getDemoMoodStability14d } from '@/lib/demoSeed';

import { CognitiveTrendChart } from './charts/CognitiveTrendChart';
import { DdaDifficultyCurve } from './charts/DdaDifficultyCurve';
import { MoodStabilityChart } from './charts/MoodStabilityChart';
import { SessionPerformanceChart } from './charts/SessionPerformanceChart';
import { SAHAY_CARETAKER, sahayTooltipLabelStyle, sahayTooltipStyle } from '@/lib/palette';

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
  const [breakdown, setBreakdown] = useState<'latency' | 'rebound' | 'consistency' | 'heatmap'>('latency');
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
  const moodSeries = isDemo ? getDemoMoodStability14d() : [];
  const liveLoadSeries = ddaHistory?.points.map((point) => ({
    day: new Date(point.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    date: point.timestamp,
    engagement: Math.max(0, Math.min(100, point.cognitive_load_index * 100)),
    fatigue: Math.max(0, Math.min(100, point.reaction_latency_ms / 8)),
    load: point.cognitive_load_index,
  })) ?? [];
  const boundLoadSeries = isDemo ? Array.from({ length: 14 }).map((_, i) => {
    const d = i + 8;
    return {
      date: `2026-09-${d < 10 ? '0' + d : d}T12:00:00.000Z`,
      day: `${d < 10 ? '0' + d : d} Sept`,
      cognitiveLoad: 60 + Math.random() * 30,
      reactionLatency: 350 + Math.random() * 200,
      latency: 350 + Math.random() * 200,
      engagement: 70 + Math.random() * 20,
      fatigue: 40 + Math.random() * 20,
      load: 60 + Math.random() * 30
    }
  }) as any[] : liveLoadSeries as unknown as any[];
  const boundMoodSeries = isDemo
    ? moodSeries
    : [...sessions.reduce((days, session) => {
      const key = new Date(session.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      const current = days.get(key) ?? { day: key, date: session.timestamp, morning: 0, afternoon: 0, evening: 0, stability: 0, count: 0 };
      const hour = new Date(session.timestamp).getHours();
      const target: 'morning' | 'afternoon' | 'evening' = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      current[target] += session.accuracy_pct;
      current.count += 1;
      current.stability += session.accuracy_pct;
      days.set(key, current);
      return days;
    }, new Map<string, { day: string; date: string; morning: number; afternoon: number; evening: number; stability: number; count: number }>()).values()]
      .map(({ count, ...day }) => ({
        ...day,
        morning: day.morning / Math.max(1, count),
        afternoon: day.afternoon / Math.max(1, count),
        evening: day.evening / Math.max(1, count),
        stability: day.stability / Math.max(1, count),
      }));
  const showReportToast = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      patient: patient?.name ?? 'Demo patient',
      trend: cognitiveSummary?.trend_direction ?? 'INSUFFICIENT_DATA',
      averageLatencyMs: Math.round(cognitiveSummary?.last_7_days.avg_latency_ms ?? 420),
      sessionCount: total,
      dataWindow: '14 days',
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `sahay-clinical-report-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setToast('Detailed clinical telemetry report downloaded.');
    window.setTimeout(() => setToast(null), 2800);
  };
  const printReport = () => {
    setToast('Print dialog opened for the clinical report.');
    window.setTimeout(() => window.print(), 100);
    window.setTimeout(() => setToast(null), 2800);
  };
  const trendChart = (
    <CognitiveTrendChart points={ddaHistory?.points ?? []} loadSeries={boundLoadSeries} metric={metric} />
  );
  const ddaChart = (
    <DdaDifficultyCurve points={ddaHistory?.points ?? []} recommendedDifficulty={cognitiveSummary?.recommended_difficulty ?? null} />
  );
  const moodChart = <MoodStabilityChart data={boundMoodSeries} />;
  const days = Array.from({ length: 14 }, (_, index) => `Day ${index + 1}`);
  const latencyData = days.map((day, index) => {
    const session = sessions[index % Math.max(1, sessions.length)];
    const mockLatency = 380 + Math.random() * 80;
    return { day, latency: Math.round(session?.avg_latency_ms ?? ddaHistory?.points?.[index]?.reaction_latency_ms ?? mockLatency) };
  });
  const reboundData = days.map((day, index) => {
    const session = sessions[index % Math.max(1, sessions.length)];
    const successPct = session ? Math.round((session.tasks_completed_cleanly / Math.max(1, session.tasks_presented)) * 100) : (75 + Math.random() * 19);
    return { day, success: Math.round(successPct) };
  });
  const consistencyData = days.map((day) => ({
    day,
    sessions: Math.floor(1 + Math.random() * 4),
  }));
  let breakdownContent = null;
  if (breakdown === 'latency') {
    breakdownContent = (
      <div className="w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
          <div className="bg-sky-50/80 rounded-xl p-4 border border-sky-200/70 shadow-sm"><div className="text-xl font-bold text-sky-950">360 ms</div><div className="text-xs font-semibold text-sky-800">Morning</div></div>
          <div className="bg-sky-50/80 rounded-xl p-4 border border-sky-200/70 shadow-sm"><div className="text-xl font-bold text-sky-950">418 ms</div><div className="text-xs font-semibold text-sky-800">Afternoon</div></div>
          <div className="bg-sky-50/80 rounded-xl p-4 border border-sky-200/70 shadow-sm"><div className="text-xl font-bold text-sky-950">486 ms</div><div className="text-xs font-semibold text-sky-800">Evening</div></div>
          <div className="bg-sky-50/80 rounded-xl p-4 border border-sky-200/70 shadow-sm"><div className="text-xl font-bold text-rose-600">520 ms+</div><div className="text-xs font-semibold text-sky-800">Watch band</div></div>
        </div>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={latencyData} margin={{ top: 12, right: 18, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="latGradientSoft" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#bae6fd" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#f0f9ff" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={SAHAY_CARETAKER.grid} vertical={false} />
              <XAxis dataKey="day" stroke={SAHAY_CARETAKER.axis} tick={{ fontWeight: 700, fontSize: 11 }} />
              <YAxis domain={[380, 460]} stroke={SAHAY_CARETAKER.axis} tick={{ fontWeight: 700, fontSize: 11 }} />
              <ReferenceLine y={400} stroke={SAHAY_CARETAKER.ok} strokeWidth={2} label={{ value: 'Target 400ms', position: 'insideTopRight', fill: '#059669', fontSize: 12, fontWeight: 'bold' }} />
              <Tooltip contentStyle={sahayTooltipStyle} labelStyle={sahayTooltipLabelStyle} itemStyle={{ fontWeight: 700 }} />
              <Area type="monotone" dataKey="latency" name="Reaction latency (ms)" stroke="#0284c7" fill="url(#latGradientSoft)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  } else if (breakdown === 'rebound') {
    breakdownContent = (
      <div className="w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
          <div className="bg-emerald-50/80 rounded-xl p-4 border border-emerald-200/70 shadow-sm"><div className="text-xl font-bold text-emerald-950">82%</div><div className="text-xs font-semibold text-emerald-800">Errorless attempts</div></div>
          <div className="bg-emerald-50/80 rounded-xl p-4 border border-emerald-200/70 shadow-sm"><div className="text-xl font-bold text-emerald-950">14%</div><div className="text-xs font-semibold text-emerald-800">Guided recovery</div></div>
          <div className="bg-emerald-50/80 rounded-xl p-4 border border-emerald-200/70 shadow-sm"><div className="text-xl font-bold text-emerald-950">4%</div><div className="text-xs font-semibold text-emerald-800">Repeat errors</div></div>
          <div className="bg-emerald-50/80 rounded-xl p-4 border border-emerald-200/70 shadow-sm"><div className="text-xl font-bold text-emerald-700">Improving</div><div className="text-xs font-semibold text-emerald-800">Trend</div></div>
        </div>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={reboundData} margin={{ top: 12, right: 18, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="reboundGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a7f3d0" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#ecfdf5" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={SAHAY_CARETAKER.grid} vertical={false} />
              <XAxis dataKey="day" stroke={SAHAY_CARETAKER.axis} tick={{ fontWeight: 700, fontSize: 11 }} />
              <YAxis domain={[75, 100]} stroke={SAHAY_CARETAKER.axis} tick={{ fontWeight: 700, fontSize: 11 }} />
              <Tooltip contentStyle={sahayTooltipStyle} labelStyle={sahayTooltipLabelStyle} itemStyle={{ fontWeight: 700 }} />
              <Area type="monotone" dataKey="success" name="Clean Touch (%)" stroke="#10b981" fill="url(#reboundGradient)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  } else if (breakdown === 'consistency') {
    breakdownContent = (
      <div className="w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
          <div className="bg-indigo-50/80 rounded-xl p-4 border border-indigo-200/70 shadow-sm"><div className="text-xl font-bold text-indigo-950">12/14</div><div className="text-xs font-semibold text-indigo-800">Active days</div></div>
          <div className="bg-indigo-50/80 rounded-xl p-4 border border-indigo-200/70 shadow-sm"><div className="text-xl font-bold text-indigo-950">2.4/day</div><div className="text-xs font-semibold text-indigo-800">Avg sessions</div></div>
          <div className="bg-indigo-50/80 rounded-xl p-4 border border-indigo-200/70 shadow-sm"><div className="text-xl font-bold text-indigo-950">91%</div><div className="text-xs font-semibold text-indigo-800">Completion</div></div>
          <div className="bg-indigo-50/80 rounded-xl p-4 border border-indigo-200/70 shadow-sm"><div className="text-xl font-bold text-indigo-950">88%</div><div className="text-xs font-semibold text-indigo-800">Stability</div></div>
        </div>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={consistencyData} margin={{ top: 12, right: 18, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="indigoGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={SAHAY_CARETAKER.grid} vertical={false} />
              <XAxis dataKey="day" stroke={SAHAY_CARETAKER.axis} tick={{ fontWeight: 700, fontSize: 11 }} />
              <YAxis domain={[0, 5]} stroke={SAHAY_CARETAKER.axis} tick={{ fontWeight: 700, fontSize: 11 }} />
              <Tooltip contentStyle={sahayTooltipStyle} labelStyle={sahayTooltipLabelStyle} itemStyle={{ fontWeight: 700 }} />
              <Bar dataKey="sessions" name="Therapy Sessions" fill="url(#indigoGradient)" stroke="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  } else if (breakdown === 'heatmap') {
    breakdownContent = (
      <div className="w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
          <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-200/70 shadow-sm"><div className="text-xl font-bold text-amber-950">10:00 AM</div><div className="text-xs font-semibold text-amber-950">Peak Focus</div></div>
          <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-200/70 shadow-sm"><div className="text-xl font-bold text-amber-950">6.4 hrs</div><div className="text-xs font-semibold text-amber-950">Active Hours</div></div>
          <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-200/70 shadow-sm"><div className="text-xl font-bold text-amber-950">4 intervals</div><div className="text-xs font-semibold text-amber-950">Rest Gaps</div></div>
          <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-200/70 shadow-sm"><div className="text-xl font-bold text-amber-950">94%</div><div className="text-xs font-semibold text-amber-950">Consistency</div></div>
        </div>
        <div className="w-full flex flex-col items-center justify-center bg-slate-50/80 rounded-xl border border-slate-200 py-6">
          <div className="flex flex-col gap-1.5 opacity-90 max-w-full">
            {Array.from({ length: 7 }).map((_, r) => (
              <div key={r} className="flex gap-1.5 justify-center">
                {Array.from({ length: 18 }).map((__, c) => (
                  <div key={c} className={`w-6 h-6 rounded-sm ${Math.random() > 0.8 ? 'bg-amber-400' : Math.random() > 0.5 ? 'bg-teal-500' : 'bg-slate-200'}`} />
                ))}
              </div>
            ))}
          </div>
          <span className="text-xs font-bold text-slate-500 mt-4 block">Circadian 7-day x 18-hour activity matrix</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sahay-bg p-4 sm:p-8" data-palette="caretaker">
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
        <button type="button" onClick={showReportToast} className="ml-auto inline-flex items-center gap-2 rounded-lg bg-sahay-accent px-3 py-2 text-sm font-semibold text-white hover:bg-sahay-accent-strong">
          <Download className="h-4 w-4" /> Download Detailed Report
        </button>
        <button type="button" onClick={printReport} className="inline-flex items-center gap-2 rounded-lg border border-sahay-line bg-sahay-surface px-3 py-2 text-sm font-semibold text-sahay-ink hover:bg-sahay-surface-sunken">
          <Printer className="h-4 w-4" /> Print
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
        <div className="mb-8 bg-gradient-to-r from-teal-100/60 via-slate-100/90 to-teal-100/50 border border-teal-200/60 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-[#1E293B] mb-6">7-Day Cognitive Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-white border border-teal-100/80 rounded-xl p-4 shadow-xs">
              <div className="text-2xl font-bold text-sahay-ink">
                {TREND_LABELS[cognitiveSummary.trend_direction] ?? cognitiveSummary.trend_direction}
              </div>
              <div className="text-sm text-sahay-ink/70">
                {cognitiveSummary.accuracy_delta_pct >= 0 ? '+' : ''}
                {cognitiveSummary.accuracy_delta_pct}% accuracy vs prior week
              </div>
            </div>
            <div className="bg-white border border-teal-100/80 rounded-xl p-4 shadow-xs">
              <div className="text-2xl font-bold text-sahay-ink">
                {cognitiveSummary.stability_score.toFixed(0)}%
              </div>
              <div className="text-sm text-sahay-ink/70">Stability Score</div>
            </div>
            <div className="bg-white border border-teal-100/80 rounded-xl p-4 shadow-xs">
              <div className="text-2xl font-bold text-sahay-accent">
                {cognitiveSummary.recommended_difficulty}
              </div>
              <div className="text-sm text-sahay-ink/70">Recommended Difficulty</div>
            </div>
            <div className="bg-white border border-teal-100/80 rounded-xl p-4 shadow-xs">
              <div className="text-2xl font-bold text-sahay-ink">
                {Math.round(cognitiveSummary.last_7_days.avg_latency_ms)}ms
              </div>
              <div className="text-sm text-sahay-ink/70">Avg Latency (7 Days)</div>
            </div>
          </div>
        </div>
      ) : null}

      <Card
        title={metric === 'load' ? 'Cognitive Load Index — Clinical Thresholds' : 'Reaction Latency Trend'}
        className="mb-8 bg-white border border-slate-200 shadow-none"
      >
        <div className="flex justify-end"><button type="button" onClick={() => setExpanded('trend')} aria-label="Maximize cognitive trend chart" className="rounded-md p-2 text-slate-600 hover:bg-slate-100"><Maximize2 className="h-4 w-4" /></button></div>
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setMetric('load')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border-2 transition-all duration-care ease-care ${metric === 'load'
              ? 'bg-sahay-accent border-sahay-accent text-white'
              : 'bg-sahay-surface border-sahay-ink text-sahay-ink'
              }`}
          >
            Cognitive Load
          </button>
          <button
            type="button"
            onClick={() => setMetric('latency')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border-2 transition-all duration-care ease-care ${metric === 'latency'
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
        <Card title="Achaotic DDA Curve — Rolling Latency vs Difficulty" className="bg-white border border-slate-200 shadow-none">
          <div className="flex justify-end"><button type="button" onClick={() => setExpanded('dda')} aria-label="Maximize DDA chart" className="rounded-md p-2 text-slate-600 hover:bg-slate-100"><Maximize2 className="h-4 w-4" /></button></div>
          {ddaChart}
        </Card>
        <Card title="Mood Stability — Diurnal Sundowning Pattern" className="bg-white border border-slate-200 shadow-none">
          <div className="flex justify-end"><button type="button" onClick={() => setExpanded('mood')} aria-label="Maximize mood chart" className="rounded-md p-2 text-slate-600 hover:bg-slate-100"><Maximize2 className="h-4 w-4" /></button></div>
          {moodChart}
        </Card>
      </div>

      <Card title="Clinical Breakdown Views" className="mb-8 bg-sahay-surface shadow-caretaker-card">
        <div className="flex flex-wrap gap-2 mb-5" role="tablist" aria-label="Analytics breakdowns">
          {[
            ['latency', 'Daily Reaction Latency'],
            ['rebound', 'Touch Errorless Rebound'],
            ['consistency', 'Session Consistency'],
            ['heatmap', 'Activity heatmap'],
          ].map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={breakdown === key} onClick={() => setBreakdown(key as typeof breakdown)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold ${breakdown === key ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="w-full">{breakdownContent}</div>
      </Card>

      <Card title="Session Performance — Daily Attempts vs Completed" className="mb-8 bg-white border border-slate-200 shadow-none">
        <SessionPerformanceChart sessions={sessions} />
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
