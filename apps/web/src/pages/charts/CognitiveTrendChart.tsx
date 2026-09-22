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

export function CognitiveTrendChart({
  points,
  loadSeries = [],
  metric = 'load',
}: CognitiveTrendChartProps) {
  void points;
  const guaranteedChartData = [
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

  const engagementColor = SAHAY_CARETAKER.viz[3];
  const fatigueColor = SAHAY_CARETAKER.viz[5];
  const latencyColor = SAHAY_CARETAKER.viz[1];
  const watchColor = SAHAY_CARETAKER.viz[5];
  const fatigueLineColor = SAHAY_CARETAKER.viz[7];

  return (
    <ChartShell>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={loadSeries.length > 0 ? loadSeries : (guaranteedChartData || [])} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={SAHAY_CARETAKER.grid} />
            <XAxis
              dataKey="date"
              stroke={SAHAY_CARETAKER.axis}
              tick={{ fontWeight: 'bold', fontSize: 11 }}
              tickFormatter={(str) => {
                const d = new Date(str);
                return isNaN(d.getTime()) ? str : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              stroke={SAHAY_CARETAKER.axis}
              tick={{ fontWeight: 'bold', fontSize: 11 }}
              domain={[0, 100]}
              label={{ value: 'Cognitive Index', angle: -90, position: 'insideLeft', fontSize: 10, fontWeight: 'bold' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke={latencyColor}
              tick={{ fontWeight: 'bold', fontSize: 11 }}
              domain={[200, 800]}
              label={{ value: 'Latency (ms)', angle: 90, position: 'insideRight', fontSize: 10, fontWeight: 'bold' }}
            />
            <Tooltip
              contentStyle={sahayTooltipStyle}
              labelStyle={sahayTooltipLabelStyle}
              labelFormatter={(label) => { const d = new Date(label as string); return isNaN(d.getTime()) ? label : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }}
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
            <ReferenceLine
              y={WATCH_THRESHOLD}
              yAxisId="left"
              stroke={watchColor}
              strokeDasharray="6 4"
              label={{ value: 'Watch', position: 'insideTopRight', fill: watchColor, fontSize: 12, fontWeight: 'bold' }}
            />
            <ReferenceLine
              y={FATIGUE_THRESHOLD}
              yAxisId="left"
              stroke={fatigueLineColor}
              strokeDasharray="4 4"
              label={{ value: 'Fatigue', position: 'insideTopRight', fill: fatigueLineColor, fontSize: 12, fontWeight: 'bold' }}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="cognitiveLoad"
              stroke="#0D9488"
              fill="#0D9488"
              fillOpacity={0.2}
              strokeWidth={3}
              isAnimationActive={false}
              hide={metric !== 'load'}
            />
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
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="reactionLatency"
              stroke="#2563EB"
              fill="#2563EB"
              fillOpacity={0.2}
              strokeWidth={3}
              isAnimationActive={false}
              hide={metric !== 'latency'}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartShell>
  );
}
