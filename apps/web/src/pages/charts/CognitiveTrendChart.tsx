import {
  CartesianGrid,
  Legend,
  Area,
  AreaChart,
  Line,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer
} from 'recharts';

const primaryTelemetryData = [
  { date: '08 Sept', cognitiveLoad: 72, reactionLatency: 420 },
  { date: '09 Sept', cognitiveLoad: 75, reactionLatency: 410 },
  { date: '10 Sept', cognitiveLoad: 74, reactionLatency: 430 },
  { date: '11 Sept', cognitiveLoad: 78, reactionLatency: 395 },
  { date: '12 Sept', cognitiveLoad: 80, reactionLatency: 390 },
  { date: '13 Sept', cognitiveLoad: 77, reactionLatency: 415 },
  { date: '14 Sept', cognitiveLoad: 79, reactionLatency: 405 },
  { date: '15 Sept', cognitiveLoad: 73, reactionLatency: 440 },
  { date: '16 Sept', cognitiveLoad: 71, reactionLatency: 450 },
  { date: '17 Sept', cognitiveLoad: 76, reactionLatency: 420 },
  { date: '18 Sept', cognitiveLoad: 78, reactionLatency: 410 },
  { date: '19 Sept', cognitiveLoad: 81, reactionLatency: 390 },
  { date: '20 Sept', cognitiveLoad: 80, reactionLatency: 395 },
  { date: '21 Sept', cognitiveLoad: 82, reactionLatency: 385 }
];
import type { DdaHistoryPoint } from '@sahay/types';

import type { CognitiveLoadDay } from '@/lib/demoSeed';
import { SAHAY_CARETAKER, sahayTooltipLabelStyle, sahayTooltipStyle } from '@/lib/palette';
import { CHART_ANIMATION_MS, ChartShell } from './ChartShell';

interface CognitiveTrendChartProps {
  points: DdaHistoryPoint[];
  loadSeries?: CognitiveLoadDay[];
  metric?: 'load' | 'latency';
}

const WATCH_THRESHOLD = 55;
const FATIGUE_THRESHOLD = 70;

function formatDay(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function CognitiveTrendChart({
  points,
  loadSeries = [],
  metric = 'load',
}: CognitiveTrendChartProps) {
  void metric;
  const ordered = [...points].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  if (ordered.length === 0 && loadSeries.length === 0) {
    return (
      <p className="text-sm text-sahay-ink/60 text-center py-8">
        No cognitive telemetry recorded yet — charts appear after the first gameplay sync.
      </p>
    );
  }

  const fromPoints = ordered.map((d) => {
    const record = d as unknown as Record<string, unknown>;
    return {
      date: formatDay(d.timestamp),
      cognitiveLoad: Number(record.cognitiveLoad ?? record.score ?? d.cognitive_load_index ?? 70),
      reactionLatency: Number(record.latency ?? d.reaction_latency_ms ?? 420),
      engagement: undefined as number | undefined,
      fatigue: undefined as number | undefined,
    };
  });

  // Keep telemetry aligned by date. Index-based merging shifts latency when a
  // session is missing and makes the chart clinically misleading.
  const pointByDay = new Map(fromPoints.map((point) => [point.date, point]));
  const data =
    loadSeries.length > 0
      ? loadSeries.slice(-14).map((d) => {
        const record = d as unknown as Record<string, unknown>;
        return {
          date: d.day,
          cognitiveLoad: Number(record.cognitiveLoad ?? record.score ?? d.load ?? 70),
          reactionLatency: Number(record.reactionLatency ?? pointByDay.get(d.date)?.reactionLatency ?? 420),
          engagement: Number.isFinite(d.engagement) ? d.engagement : null,
          fatigue: Number.isFinite(d.fatigue) ? d.fatigue : null,
        };
      })
      : fromPoints;

  const engagementColor = SAHAY_CARETAKER.viz[3];
  const fatigueColor = SAHAY_CARETAKER.viz[5];
  const latencyColor = SAHAY_CARETAKER.viz[1];
  const watchColor = SAHAY_CARETAKER.viz[5];
  const fatigueLineColor = SAHAY_CARETAKER.viz[7];

  return (
    <ChartShell>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data?.length ? data : primaryTelemetryData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cogGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0D9488" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#0D9488" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="latGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#2563EB" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={SAHAY_CARETAKER.grid} />
            <XAxis dataKey="date" stroke={SAHAY_CARETAKER.axis} fontSize={11} />
            <YAxis
              yAxisId="left"
              stroke={SAHAY_CARETAKER.axis}
              fontSize={11}
              domain={[0, 100]}
              label={{ value: 'Cognitive Index', angle: -90, position: 'insideLeft', fontSize: 10 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke={latencyColor}
              fontSize={11}
              domain={[200, 800]}
              label={{ value: 'Latency (ms)', angle: 90, position: 'insideRight', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={sahayTooltipStyle}
              labelStyle={sahayTooltipLabelStyle}
              formatter={(value: unknown, name: unknown) => {
                const numeric = typeof value === 'number' ? value : Number(value ?? 0);
                const key = String(name);
                if (key === 'reactionLatency' || key === 'latency') {
                  return [`${Math.round(numeric)} ms`, 'Touch latency'];
                }
                if (key === 'cognitiveLoad') {
                  return [`${numeric.toFixed(1)}`, 'Cognitive load'];
                }
                if (key === 'engagement') {
                  return [`${numeric.toFixed(1)}`, 'Engagement'];
                }
                if (key === 'fatigue') {
                  return [`${numeric.toFixed(1)}`, 'Mental fatigue'];
                }
                return [`${numeric}`, key];
              }}
            />
            <Legend />
            <>
              <ReferenceLine
                y={WATCH_THRESHOLD}
                stroke={watchColor}
                strokeDasharray="6 4"
                label={{ value: 'Watch', fill: watchColor, fontSize: 10 }}
              />
              <ReferenceLine
                y={FATIGUE_THRESHOLD}
                stroke={fatigueLineColor}
                strokeDasharray="4 4"
                label={{ value: 'Fatigue', fill: fatigueLineColor, fontSize: 10 }}
              />
              {metric === 'load' ? (
                <Area
                  type="monotone"
                  yAxisId="left"
                  dataKey="cognitiveLoad"
                  name="Cognitive load"
                  stroke="#0D9488"
                  fill="url(#cogGradient)"
                  strokeWidth={2.5}
                />
              ) : null}
              {loadSeries.length > 0 ? (
                <>
                  <Line
                    type="monotone"
                    yAxisId="left"
                    dataKey="engagement"
                    name="Engagement"
                    stroke={engagementColor}
                    strokeWidth={2.2}
                    dot={{ r: 3 }}
                    isAnimationActive={false}
                    animationDuration={CHART_ANIMATION_MS}
                  />
                  <Line
                    type="monotone"
                    yAxisId="left"
                    dataKey="fatigue"
                    name="Mental fatigue"
                    stroke={fatigueColor}
                    strokeWidth={2.2}
                    strokeDasharray="5 4"
                    dot={{ r: 3 }}
                    isAnimationActive={false}
                    animationDuration={CHART_ANIMATION_MS}
                  />
                </>
              ) : null}
              {metric === 'latency' ? (
                <Area
                  type="monotone"
                  yAxisId="right"
                  dataKey="reactionLatency"
                  name="Touch latency"
                  stroke="#2563EB"
                  fill="url(#latGradient)"
                  strokeWidth={2.5}
                />
              ) : null}
            </>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartShell>
  );
}
