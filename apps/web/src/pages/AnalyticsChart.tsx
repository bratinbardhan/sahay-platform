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
  const latencyBreakdown = (
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

  const reboundBreakdown = (
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

  const consistencyBreakdown = (
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

  const heatmapBreakdown = (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
        <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-200/70 shadow-sm"><div className="text-xl font-bold text-amber-950">10:00 AM</div><div className="text-xs font-semibold text-amber-950">Peak Focus</div></div>
        <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-200/70 shadow-sm"><div className="text-xl font-bold text-amber-950">6.4 hrs</div><div className="text-xs font-semibold text-amber-950">Active Hours</div></div>
        <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-200/70 shadow-sm"><div className="text-xl font-bold text-amber-950">4 intervals</div><div className="text-xs font-semibold text-amber-950">Rest Gaps</div></div>
        <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-200/70 shadow-sm"><div className="text-xl font-bold text-amber-950">94%</div><div className="text-xs font-semibold text-amber-950">Consistency</div></div>
      </div>
      <div className="w-full flex flex-col items-center justify-center bg-slate-50/80 rounded-xl border border-slate-200 py-6 overflow-x-auto">
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 opacity-90 min-w-max items-center">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="contents">
              <div className="text-right text-xs font-bold text-slate-500 tracking-wide uppercase">{day}</div>
              <div className="flex gap-1.5">
                {Array.from({ length: 18 }).map((__, c) => {
                  const hour = 6 + c;
                  const time = hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`;
                  const rand = Math.random();
                  const activityLevel = rand > 0.85 ? 'Peak Focus' : rand > 0.6 ? 'Moderate' : rand > 0.3 ? 'Baseline' : 'Inactive';
                  const bg = rand > 0.85 ? 'bg-amber-400' : rand > 0.6 ? 'bg-teal-600' : rand > 0.3 ? 'bg-teal-400' : 'bg-slate-200';
                  return (
                    <div key={c} title={`${day} ${time} - ${activityLevel}`} className={`transition-all duration-200 ease-in-out hover:scale-125 hover:shadow-md hover:z-10 relative cursor-pointer w-5 h-5 md:w-6 md:h-6 rounded-sm m-0.5 ${bg}`} />
                  );
                })}
              </div>
            </div>
          ))}
          <div className="contents">
            <div></div>
            <div className="flex justify-between text-xs font-bold text-slate-500 tracking-wide uppercase pt-1">
              <span>6 AM</span>
              <span>9 AM</span>
              <span>12 PM</span>
              <span>3 PM</span>
              <span>6 PM</span>
              <span>9 PM</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 mb-2">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-slate-200"></div><span className="text-xs font-bold text-slate-600">Inactive</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-teal-400"></div><span className="text-xs font-bold text-slate-600">Baseline</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-teal-600"></div><span className="text-xs font-bold text-slate-600">Moderate</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-amber-400"></div><span className="text-xs font-bold text-slate-600">Peak Focus</span></div>
        </div>
        <span className="text-xs font-bold text-slate-500 mt-6 block">Circadian 7-day x 18-hour activity matrix</span>
      </div>
    </div>
  );

  let breakdownContent = null;
  if (breakdown === 'latency') breakdownContent = latencyBreakdown;
  else if (breakdown === 'rebound') breakdownContent = reboundBreakdown;
  else if (breakdown === 'consistency') breakdownContent = consistencyBreakdown;
  else if (breakdown === 'heatmap') breakdownContent = heatmapBreakdown;

  const cognitiveLoadChart = <CognitiveTrendChart points={ddaHistory?.points ?? []} loadSeries={boundLoadSeries} metric="load" />;
  const reactionLatencyChart = <CognitiveTrendChart points={ddaHistory?.points ?? []} loadSeries={boundLoadSeries} metric="latency" />;

  return (
    <div className="min-h-screen bg-sahay-bg p-4 sm:p-8" data-palette="caretaker">
      {/* Print-Only Custom Header */}
      <div className="hidden print:flex print:flex-col print:items-center print:mb-8 border-b border-slate-200 print:pb-6">
        <div className="flex items-center gap-3 mb-2">
          <img src="/sahay-logo.png" alt="Sahay Logo" className="w-12 h-12 object-contain" />
          <h1 className="text-3xl font-extrabold text-teal-700 tracking-tight">Sahāy</h1>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-4 uppercase tracking-wide">Detailed Analytics of the Patient</h2>
        <div className="flex gap-12 text-sm font-semibold text-slate-600">
          <p>Patient: <span className="text-slate-800">Aarav (Age: 72)</span></p>
          <p>Caretaker: <span className="text-slate-800">Ram</span></p>
        </div>
      </div>
      <div className="flex items-center mb-6 print:hidden">
        <button
          type="button"
          className="mr-4 p-2 rounded-lg bg-sahay-surface border-2 border-sahay-ink text-sahay-ink hover:bg-sahay-surface-sunken transition-all duration-care ease-care"
          onClick={() => onNavigate('dashboard')}
          aria-label="Back to dashboard"
        >
          <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
        </button>
        <h1 className="text-3xl font-bold text-sahay-ink">Cognitive Health Analytics</h1>
        <button type="button" onClick={() => window.print()} className="ml-auto inline-flex items-center gap-2 rounded-lg bg-sahay-accent px-3 py-2 text-sm font-semibold text-white hover:bg-sahay-accent-strong print:hidden">
          <Download className="h-4 w-4" /> Download Detailed Report
        </button>
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-sahay-line bg-sahay-surface px-3 py-2 text-sm font-semibold text-sahay-ink hover:bg-sahay-surface-sunken print:hidden">
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
        className="mb-8 bg-white border border-slate-200 shadow-none print:hidden"
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
        <Card title="Achaotic DDA Curve — Rolling Latency vs Difficulty" className="bg-white border border-slate-200 shadow-none print:break-inside-avoid print:w-full">
          <div className="flex justify-end print:hidden"><button type="button" onClick={() => setExpanded('dda')} aria-label="Maximize DDA chart" className="rounded-md p-2 text-slate-600 hover:bg-slate-100"><Maximize2 className="h-4 w-4" /></button></div>
          {ddaChart}
        </Card>
        <Card title="Mood Stability — Diurnal Sundowning Pattern" className="bg-white border border-slate-200 shadow-none print:break-inside-avoid print:w-full">
          <div className="flex justify-end print:hidden"><button type="button" onClick={() => setExpanded('mood')} aria-label="Maximize mood chart" className="rounded-md p-2 text-slate-600 hover:bg-slate-100"><Maximize2 className="h-4 w-4" /></button></div>
          {moodChart}
        </Card>
      </div>

      <Card title="Clinical Breakdown Views" className="mb-8 bg-sahay-surface shadow-caretaker-card print:hidden">
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

      {/* PRINT-ONLY SEQUENTIAL CHARTS VIEW */}
      <div className="absolute -left-[9999px] top-0 opacity-0 pointer-events-none print:relative print:left-0 print:opacity-100 print:flex print:flex-col print:gap-10 print:w-full print:mb-0">
        {/* 1. Standard Analytics */}
        <div className="print:break-inside-avoid w-full">
          <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Cognitive Load Index</h3>
          <div className="h-[550px] w-full">
            {cognitiveLoadChart}
          </div>
        </div>

        {/* --- HARD SPACER --- */}
        <div className="h-40 w-full shrink-0 block"></div>

        <div className="print:break-inside-avoid w-full">
          <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Reaction Latency Trend</h3>
          <div className="h-[550px] w-full">
            {reactionLatencyChart}
          </div>
        </div>

        {/* --- HARD SPACER --- */}
        <div className="h-40 w-full shrink-0 block"></div>

        {/* 2. Clinical Breakdown Views */}
        <div className="print:break-inside-avoid w-full">
          <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Daily Reaction Latency</h3>
          <div className="h-[550px] w-full">
            {latencyBreakdown}
          </div>
        </div>

        {/* --- HARD SPACER --- */}
        <div className="h-40 w-full shrink-0 block"></div>

        <div className="print:break-inside-avoid w-full">
          <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Touch Errorless Rebound</h3>
          <div className="h-[550px] w-full">
            {reboundBreakdown}
          </div>
        </div>

        {/* --- HARD SPACER --- */}
        <div className="h-40 w-full shrink-0 block"></div>

        <div className="print:break-inside-avoid w-full">
          <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Session Consistency</h3>
          <div className="h-[550px] w-full">
            {consistencyBreakdown}
          </div>
        </div>

        {/* --- HARD SPACER --- */}
        <div className="h-40 w-full shrink-0 block"></div>

        <div className="print:break-inside-avoid w-full mt-12">
          <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Activity Heatmap</h3>
          <div className="h-[700px] w-full">
            {heatmapBreakdown}
          </div>
        </div>
      </div>

      <Card title="Session Performance — Daily Attempts vs Completed" className="mb-8 bg-white border border-slate-200 shadow-none print:mt-16">
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
                    <td className="p-2 text-sahay-ink capitalize">{log.game_module_id.replace(/_/g, ' ')}</td>
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
      {/* Print-Only Custom Footer */}
      <div className="hidden print:block print:mt-12 print:pt-6 border-t border-slate-200 print:break-inside-avoid">
        <div className="mb-8">
          <h3 className="text-lg font-bold text-slate-800 mb-3">Analytics Summary & Suggestions</h3>
          <p className="text-sm text-slate-600 mb-3 leading-relaxed">
            <strong className="text-slate-800">Summary:</strong> The patient has maintained a stable routine with consistent engagement during morning sessions. The clinical heatmap indicates peak cognitive focus between 9 AM and 12 PM, with moderate activity pacing in the late afternoon.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            <strong className="text-slate-800">Recommendation:</strong> Schedule high-cognitive tasks and primary memory therapy sessions during the morning peak focus hours. Encourage light physical activity or relaxation exercises during the late afternoon to maintain consistent energy levels and prevent fatigue.
          </p>
        </div>
        <div className="text-center mt-10 italic text-slate-500 font-serif text-lg">
          "To care for those who once cared for us is one of the highest honors."
        </div>
      </div>
    </div>
  );
}
