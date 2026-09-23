import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DdaHistoryPoint } from '@sahay/types';

import { SAHAY_CARETAKER, sahayTooltipLabelStyle, sahayTooltipStyle } from '@/lib/palette';
import { CHART_ANIMATION_MS, ChartShell } from './ChartShell';

interface DdaDifficultyCurveProps {
  points: DdaHistoryPoint[];
  recommendedDifficulty?: number | null;
  lastRounds?: number;
}

/**
 * Achaotic DDA curve — smooth rolling-average reaction time vs difficulty.
 * Difficulty never spikes; it tracks a 3-session trailing average.
 */
export function DdaDifficultyCurve({
  points,
  recommendedDifficulty = null,
  lastRounds = 14,
}: DdaDifficultyCurveProps) {
  const ordered = [...points]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-lastRounds);

  if (ordered.length === 0) {
    return (
      <p className="text-sm text-sahay-ink/60 text-center py-8">
        No DDA difficulty data yet — the curve calibrates after the first sessions sync.
      </p>
    );
  }

  const data = ordered.map((point, index) => ({
    round: `R${index + 1}`,
    difficulty: Number(point.difficulty_level.toFixed(2)),
    latency: Math.round(point.reaction_latency_ms),
    recommended: recommendedDifficulty ?? undefined,
  }));

  const difficultyColor = SAHAY_CARETAKER.viz[0];
  const latencyColor = SAHAY_CARETAKER.viz[2];
  const guideColor = SAHAY_CARETAKER.viz[5];

  return (
    <ChartShell>
      <LineChart data={data} margin={{ top: 12, right: 18, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={SAHAY_CARETAKER.grid} />
        <XAxis dataKey="round" stroke={SAHAY_CARETAKER.axis} tick={{ fontWeight: 'bold', fontSize: 11 }} />
        <YAxis
          yAxisId="difficulty"
          stroke={SAHAY_CARETAKER.axis}
          tick={{ fontWeight: 'bold', fontSize: 11 }}
          domain={[0, 8]}
          label={{ value: 'Difficulty', angle: -90, position: 'insideLeft', fontSize: 10, fontWeight: 'bold' }}
        />
        <YAxis
          yAxisId="latency"
          orientation="right"
          stroke={SAHAY_CARETAKER.axis}
          tick={{ fontWeight: 'bold', fontSize: 11 }}
          domain={[300, 520]}
          label={{ value: 'ms', angle: 90, position: 'insideRight', fontSize: 10, fontWeight: 'bold' }}
        />
        <Tooltip
          contentStyle={sahayTooltipStyle}
          labelStyle={sahayTooltipLabelStyle}
          formatter={(value: unknown, name: unknown) => {
            const numeric = typeof value === 'number' ? value : Number(value ?? 0);
            const key = String(name);
            if (key === 'Reaction time' || key === 'latency') {
              return [`${Math.round(numeric)} ms`, 'Reaction time'];
            }
            if (key === 'Difficulty' || key === 'difficulty') {
              return [numeric.toFixed(2), 'Difficulty'];
            }
            return [`${numeric}`, 'Recommended'];
          }}
        />
        <Legend />
        <Line
          yAxisId="difficulty"
          type="monotone"
          dataKey="difficulty"
          name="Difficulty"
          stroke={difficultyColor}
          strokeWidth={2.8}
          dot={{ r: 3 }}
          isAnimationActive={true}
          animationDuration={CHART_ANIMATION_MS}
          animationEasing="ease-in-out"
        />
        <Line
          yAxisId="latency"
          type="monotone"
          dataKey="latency"
          name="Reaction time"
          stroke={latencyColor}
          strokeWidth={2.2}
          dot={{ r: 3 }}
          isAnimationActive={true}
          animationDuration={CHART_ANIMATION_MS}
          animationEasing="ease-in-out"
        />
        {recommendedDifficulty !== null ? (
          <Line
            yAxisId="difficulty"
            type="monotone"
            dataKey="recommended"
            name="Recommended"
            stroke={guideColor}
            strokeDasharray="6 4"
            strokeWidth={1.6}
            dot={false}
            isAnimationActive={true}
            animationDuration={CHART_ANIMATION_MS}
            animationEasing="ease-in-out"
          />
        ) : null}
      </LineChart>
    </ChartShell>
  );
}
