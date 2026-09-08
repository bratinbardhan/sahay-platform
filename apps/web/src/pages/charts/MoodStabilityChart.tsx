import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface MoodStabilityChartProps {
  data: { day: string; stability: number; mood: number }[];
}

/**
 * Smooth Mood & Stability trend line chart with subtle area fill
 * below the stroke and an expanding ActiveDot on hover.
 */
export function MoodStabilityChart({ data }: MoodStabilityChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="stabilityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0284c7" stopOpacity={0.12} />
            <stop offset="100%" stopColor="#0284c7" stopOpacity={0.00} />
          </linearGradient>
          <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.08} />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.00} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
        <Tooltip
          contentStyle={{
            background: '#0f172a',
            border: 0,
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            padding: '8px 12px',
          }}
          labelStyle={{ fontWeight: 600, color: '#fff', marginBottom: 4, fontSize: 12 }}
          itemStyle={{ color: '#e2e8f0', fontSize: 11 }}
          formatter={(value: number, name: string) => {
            const label = name === 'stability' ? 'Stability' : 'Mood';
            return [`${value}%`, label];
          }}
        />
        <Area
          type="monotone"
          dataKey="stability"
          stroke="#0284c7"
          strokeWidth={2}
          fill="url(#stabilityGradient)"
          activeDot={{ r: 5, stroke: '#0284c7', strokeWidth: 2, fill: '#fff' }}
        />
        <Area
          type="monotone"
          dataKey="mood"
          stroke="#f59e0b"
          strokeWidth={2}
          fill="url(#moodGradient)"
          activeDot={{ r: 4, stroke: '#f59e0b', strokeWidth: 2, fill: '#fff' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
