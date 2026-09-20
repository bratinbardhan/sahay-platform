import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import {
  SAHAY_CARETAKER,
  sahayGlassTooltipStyle,
  sahayTooltipLabelStyle,
} from '@/lib/palette';
import { CHART_ANIMATION_MS, ChartShell } from './ChartShell';

interface CognitiveEngagementChartProps {
  data: { day: string; minutes: number; accuracy: number }[];
}

export function CognitiveEngagementChart({ data }: CognitiveEngagementChartProps) {
  return (
    <ChartShell>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SAHAY_CARETAKER.viz[0]} stopOpacity={0.95} />
            <stop offset="100%" stopColor={SAHAY_CARETAKER.viz[0]} stopOpacity={0.55} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={SAHAY_CARETAKER.line} vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 12, fill: SAHAY_CARETAKER.axis }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: SAHAY_CARETAKER.axis }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: SAHAY_CARETAKER.tealWash }}
          contentStyle={sahayGlassTooltipStyle}
          labelStyle={sahayTooltipLabelStyle}
          formatter={(value: unknown, name: unknown) => {
            const numeric = typeof value === 'number' ? value : Number(value ?? 0);
            const key = String(name);
            const label = key === 'minutes' ? 'Session Time' : 'Accuracy';
            const unit = key === 'minutes' ? ' mins' : '%';
            return [`${numeric}${unit}`, label];
          }}
        />
        <Bar
          dataKey="minutes"
          fill="url(#engagementGradient)"
          radius={[6, 6, 0, 0]}
          maxBarSize={40}
          isAnimationActive={true}
          animationDuration={CHART_ANIMATION_MS}
              animationEasing="ease-in-out"
        />
      </BarChart>
    </ChartShell>
  );
}
