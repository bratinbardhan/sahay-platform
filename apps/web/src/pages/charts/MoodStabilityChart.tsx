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

  const morningColor = SAHAY_CARETAKER.viz[0];
  const afternoonColor = SAHAY_CARETAKER.viz[5];
  const eveningColor = SAHAY_CARETAKER.viz[2];

  return (
    <ChartShell>
      <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="morningFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={morningColor} stopOpacity={0.35} />
            <stop offset="100%" stopColor={morningColor} stopOpacity={0.04} />
          </linearGradient>
          <linearGradient id="afternoonFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={afternoonColor} stopOpacity={0.32} />
            <stop offset="100%" stopColor={afternoonColor} stopOpacity={0.04} />
          </linearGradient>
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
          fill="url(#morningFill)"
          strokeWidth={2.4}
          isAnimationActive={true}
          animationDuration={CHART_ANIMATION_MS}
              animationEasing="ease-in-out"
        />
        <Area
          type="monotone"
          dataKey="afternoon"
          name="Late afternoon (sundowning)"
          stroke={afternoonColor}
          fill="url(#afternoonFill)"
          strokeWidth={2.4}
          isAnimationActive={true}
          animationDuration={CHART_ANIMATION_MS}
              animationEasing="ease-in-out"
        />
        <Area
          type="monotone"
          dataKey="evening"
          name="Evening"
          stroke={eveningColor}
          fill="transparent"
          strokeWidth={1.8}
          strokeDasharray="5 4"
          isAnimationActive={true}
          animationDuration={CHART_ANIMATION_MS}
              animationEasing="ease-in-out"
        />
      </AreaChart>
    </ChartShell>
  );
}
