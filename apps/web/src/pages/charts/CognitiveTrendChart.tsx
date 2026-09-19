import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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

  const fromPoints = ordered.map((point) => ({
    day: formatDay(point.timestamp),
    load: point.cognitive_load_index,
    latency: Math.round(point.reaction_latency_ms),
    engagement: undefined as number | undefined,
    fatigue: undefined as number | undefined,
  }));

  const data =
    metric === 'load' && loadSeries.length > 0
      ? loadSeries.map((row) => ({
          day: row.day,
          load: row.load,
          latency: undefined as number | undefined,
          engagement: row.engagement,
          fatigue: row.fatigue,
        }))
      : fromPoints;

  const loadColor = SAHAY_CARETAKER.viz[0];
  const engagementColor = SAHAY_CARETAKER.viz[3];
  const fatigueColor = SAHAY_CARETAKER.viz[5];
  const latencyColor = SAHAY_CARETAKER.viz[1];
  const watchColor = SAHAY_CARETAKER.viz[5];
  const fatigueLineColor = SAHAY_CARETAKER.viz[7];

  return (
    <ChartShell>
      <LineChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={SAHAY_CARETAKER.grid} />
        <XAxis dataKey="day" stroke={SAHAY_CARETAKER.axis} fontSize={11} />
        <YAxis
          stroke={SAHAY_CARETAKER.axis}
          fontSize={11}
          domain={metric === 'latency' ? [300, 520] : [0, 100]}
        />
        <Tooltip
          contentStyle={sahayTooltipStyle}
          labelStyle={sahayTooltipLabelStyle}
          formatter={(value: unknown, name: unknown) => {
            const numeric = typeof value === 'number' ? value : Number(value ?? 0);
            const key = String(name);
            if (key === 'latency') {
              return [`${Math.round(numeric)} ms`, 'Touch latency'];
            }
            if (key === 'load') {
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
        {metric === 'load' ? (
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
            <Line
              type="monotone"
              dataKey="load"
              name="Cognitive load"
              stroke={loadColor}
              strokeWidth={2.6}
              dot={{ r: 3, stroke: loadColor, fill: SAHAY_CARETAKER.surfaceRaised }}
              isAnimationActive={true}
              animationDuration={CHART_ANIMATION_MS}
            />
            {loadSeries.length > 0 ? (
              <>
                <Line
                  type="monotone"
                  dataKey="engagement"
                  name="Engagement"
                  stroke={engagementColor}
                  strokeWidth={2.2}
                  dot={{ r: 3 }}
                  isAnimationActive={true}
                  animationDuration={CHART_ANIMATION_MS}
                />
                <Line
                  type="monotone"
                  dataKey="fatigue"
                  name="Mental fatigue"
                  stroke={fatigueColor}
                  strokeWidth={2.2}
                  strokeDasharray="5 4"
                  dot={{ r: 3 }}
                  isAnimationActive={true}
                  animationDuration={CHART_ANIMATION_MS}
                />
              </>
            ) : null}
          </>
        ) : (
          <Line
            type="monotone"
            dataKey="latency"
            name="Touch latency"
            stroke={latencyColor}
            strokeWidth={2.6}
            dot={{ r: 3, stroke: latencyColor, fill: SAHAY_CARETAKER.surfaceRaised }}
            isAnimationActive={true}
            animationDuration={CHART_ANIMATION_MS}
          />
        )}
      </LineChart>
    </ChartShell>
  );
}
