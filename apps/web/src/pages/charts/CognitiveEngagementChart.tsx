import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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
            <stop offset="0%" stopColor="#0d9488" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#0d9488" stopOpacity={0.55} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: 'rgba(13, 148, 136, 0.08)' }}
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
