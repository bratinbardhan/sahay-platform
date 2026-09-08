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
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: 'rgba(15, 118, 110, 0.06)' }}
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
            const label = name === 'minutes' ? 'Session Time' : 'Accuracy';
            const unit = name === 'minutes' ? ' mins' : '%';
            return [`${value}${unit}`, label];
          }}
        />
        <Bar
          dataKey="minutes"
          fill="#0f766e"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
