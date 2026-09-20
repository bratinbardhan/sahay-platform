import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';

import type { MoodStabilityDay } from '@/lib/demoSeed';
import { SAHAY_CARETAKER, sahayTooltipLabelStyle, sahayTooltipStyle } from '@/lib/palette';
import { CHART_ANIMATION_MS, ChartShell } from './ChartShell';

interface MoodStabilityChartProps {
  data: MoodStabilityDay[];
}

/**
 * Diurnal mood stability — morning vs late-afternoon (sundowning) series.
 */
export function MoodStabilityChart({ data }: MoodStabilityChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-sahay-ink/60 text-center py-8">No mood observations yet.</p>
    );
  }

  const morningColor = SAHAY_CARETAKER.viz[0];
  const afternoonColor = '#D97706';
  const eveningColor = '#4F46E5';

  return (
    <ChartShell>
      <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={SAHAY_CARETAKER.grid} vertical={false} />
        <XAxis dataKey="day" stroke={SAHAY_CARETAKER.axis} fontSize={11} />
        <YAxis domain={[30, 100]} stroke={SAHAY_CARETAKER.axis} fontSize={11} />
        <Tooltip
          contentStyle={sahayTooltipStyle}
          labelStyle={sahayTooltipLabelStyle}
          formatter={(value: unknown, name: unknown) => {
            const numeric = typeof value === 'number' ? value : Number(value ?? 0);
            return [`${Math.round(numeric)}`, String(name)];
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="morning"
          name="Morning"
          stroke={morningColor}
          strokeWidth={2.4}
          isAnimationActive={false}
          animationDuration={CHART_ANIMATION_MS}
        />
        <Line
          type="monotone"
          dataKey="afternoon"
          name="Late afternoon (sundowning)"
          stroke={afternoonColor}
          strokeWidth={2.4}
          strokeDasharray="5 5"
          isAnimationActive={false}
          animationDuration={CHART_ANIMATION_MS}
        />
        <Line
          type="monotone"
          dataKey="evening"
          name="Evening"
          stroke={eveningColor}
          strokeWidth={1.8}
          strokeDasharray="2 2"
          isAnimationActive={false}
          animationDuration={CHART_ANIMATION_MS}
        />
      </LineChart>
    </ChartShell>
  );
}
