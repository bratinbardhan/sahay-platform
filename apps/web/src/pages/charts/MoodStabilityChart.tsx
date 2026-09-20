import { Area, AreaChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts';

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

  const morningColor = '#0D9488';
  const afternoonColor = '#E11D48';
  const eveningColor = '#6366F1';

  return (
    <ChartShell>
      <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
        <defs>
        </defs>
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
        <Area
          type="monotone"
          dataKey="morning"
          name="Morning"
          stroke={morningColor}
          fill={morningColor}
          fillOpacity={0.08}
          strokeWidth={2.4}
          isAnimationActive={false}
          animationDuration={CHART_ANIMATION_MS}
        />
        <Area
          type="monotone"
          dataKey="afternoon"
          name="Late afternoon (sundowning)"
          stroke={afternoonColor}
          fill={afternoonColor}
          fillOpacity={0.08}
          strokeWidth={2.4}
          strokeDasharray="3 3"
          isAnimationActive={false}
          animationDuration={CHART_ANIMATION_MS}
        />
        <Area
          type="monotone"
          dataKey="evening"
          name="Evening"
          stroke={eveningColor}
          fill="transparent"
          strokeWidth={1.8}
          strokeDasharray="5 4"
          isAnimationActive={false}
          animationDuration={CHART_ANIMATION_MS}
        />
      </AreaChart>
    </ChartShell>
  );
}
