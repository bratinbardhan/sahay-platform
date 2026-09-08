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
 * Smooth Mood & Stability trend line chart with SVG gradient fill
 * below the stroke and an expanding ActiveDot on hover.
 */
export function MoodStabilityChart({ data }: MoodStabilityChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="stabilityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d9488" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#0d9488" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} domain={[0, 100]} />
        <Tooltip
          contentStyle={{
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
            padding: '10px 14px',
          }}
          labelStyle={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}
          formatter={(value: number, name: string) => {
            const label = name === 'stability' ? 'Stability' : 'Mood';
            return [`${value}%`, label];
          }}
        />
        <Area
          type="monotone"
          dataKey="stability"
          stroke="#0d9488"
          strokeWidth={2.5}
          fill="url(#stabilityGradient)"
          activeDot={{ r: 6, stroke: '#0d9488', strokeWidth: 2, fill: '#fff' }}
        />
        <Area
          type="monotone"
          dataKey="mood"
          stroke="#f59e0b"
          strokeWidth={2}
          fill="url(#moodGradient)"
          activeDot={{ r: 5, stroke: '#f59e0b', strokeWidth: 2, fill: '#fff' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
