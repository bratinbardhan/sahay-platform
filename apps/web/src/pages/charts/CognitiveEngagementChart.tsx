import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  SAHAY_CARETAKER,
  sahayGlassTooltipStyle,
  sahayTooltipLabelStyle,
} from '@/lib/palette';

interface CognitiveEngagementChartProps {
  data: { day: string; minutes: number; accuracy: number }[];
}

/**
 * Interactive 7-day Cognitive Engagement bar chart.
 * Hover tooltips show session time (mins) and accuracy (%).
 */
export function CognitiveEngagementChart({ data }: CognitiveEngagementChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SAHAY_CARETAKER.teal} stopOpacity={0.95} />
            <stop offset="100%" stopColor={SAHAY_CARETAKER.teal} stopOpacity={0.55} />
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
          formatter={(value: number, name: string) => {
            const label = name === 'minutes' ? 'Session Time' : 'Accuracy';
            const unit = name === 'minutes' ? ' mins' : '%';
            return [`${value}${unit}`, label];
          }}
        />
        <Bar
          dataKey="minutes"
          fill="url(#engagementGradient)"
          radius={[6, 6, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
