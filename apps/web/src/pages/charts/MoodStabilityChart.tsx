import {
  Area,
  AreaChart,
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

interface MoodStabilityChartProps {
  data: { day: string; stability: number; mood: number }[];
}

/**
 * Smooth Mood & Stability trend line chart with SVG gradient fill
 * below the stroke and an expanding ActiveDot on hover.
 */
export function MoodStabilityChart({ data }: MoodStabilityChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="stabilityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SAHAY_CARETAKER.teal} stopOpacity={0.35} />
            <stop offset="100%" stopColor={SAHAY_CARETAKER.teal} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SAHAY_CARETAKER.mood} stopOpacity={0.25} />
            <stop offset="100%" stopColor={SAHAY_CARETAKER.mood} stopOpacity={0.02} />
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
          domain={[0, 100]}
        />
        <Tooltip
          contentStyle={sahayGlassTooltipStyle}
          labelStyle={sahayTooltipLabelStyle}
          formatter={(value: number, name: string) => {
            const label = name === 'stability' ? 'Stability' : 'Mood';
            return [`${value}%`, label];
          }}
        />
        <Area
          type="monotone"
          dataKey="stability"
          stroke={SAHAY_CARETAKER.teal}
          strokeWidth={2.5}
          fill="url(#stabilityGradient)"
          activeDot={{ r: 6, stroke: SAHAY_CARETAKER.teal, strokeWidth: 2, fill: SAHAY_CARETAKER.surfaceRaised }}
        />
        <Area
          type="monotone"
          dataKey="mood"
          stroke={SAHAY_CARETAKER.mood}
          strokeWidth={2}
          fill="url(#moodGradient)"
          activeDot={{ r: 5, stroke: SAHAY_CARETAKER.mood, strokeWidth: 2, fill: SAHAY_CARETAKER.surfaceRaised }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
