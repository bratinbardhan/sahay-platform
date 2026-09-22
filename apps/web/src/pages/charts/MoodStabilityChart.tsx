import { CartesianGrid, Legend, Area, AreaChart, Tooltip, XAxis, YAxis } from 'recharts';

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

  const eveningColor = '#4F46E5';

  return (
    <ChartShell>
      <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="morningGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0D9488" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#0D9488" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="afternoonGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D97706" stopOpacity={0.12} />
            <stop offset="100%" stopColor="#D97706" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={SAHAY_CARETAKER.grid} vertical={false} />
        <XAxis dataKey="day" stroke={SAHAY_CARETAKER.axis} tick={{ fontWeight: 'bold', fontSize: 11 }} />
        <YAxis domain={[30, 100]} stroke={SAHAY_CARETAKER.axis} tick={{ fontWeight: 'bold', fontSize: 11 }} />
        <Tooltip
          contentStyle={sahayTooltipStyle}
          labelStyle={sahayTooltipLabelStyle}
          formatter={(value: unknown, name: unknown) => {
            const numeric = typeof value === 'number' ? value : Number(value ?? 0);
            return [`${Math.round(numeric)}`, String(name)];
          }}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="morning"
          name="Morning"
          stroke="#0D9488"
          fill="url(#morningGradient)"
          strokeWidth={2.4}
          isAnimationActive={false}
          animationDuration={CHART_ANIMATION_MS}
        />
        <Area
          type="monotone"
          dataKey="afternoon"
          name="Late afternoon (sundowning)"
          stroke="#D97706"
          fill="url(#afternoonGradient)"
          strokeWidth={2.4}
          strokeDasharray="5 5"
          isAnimationActive={false}
          animationDuration={CHART_ANIMATION_MS}
        />
        <Area
          type="monotone"
          dataKey="evening"
          name="Evening"
          stroke={eveningColor}
          fill="none"
          strokeWidth={1.8}
          strokeDasharray="2 2"
          isAnimationActive={false}
          animationDuration={CHART_ANIMATION_MS}
        />
      </AreaChart>
    </ChartShell>
  );
}
