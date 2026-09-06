import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface StageBarChartProps {
  distribution: Record<string, number>;
  colors: string[];
}

const STAGE_LABELS: Record<string, string> = {
  '1': 'No Dementia',
  '2': 'Very Mild',
  '3': 'Mild',
  '4': 'Moderate',
  '5': 'Mod. Severe',
  '6': 'Severe',
  '7': 'Very Severe',
};

export function StageBarChart({ distribution, colors }: StageBarChartProps) {
  const data = Object.entries(distribution)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([stage, count]) => ({
      stage: `Stage ${stage}`,
      label: STAGE_LABELS[stage] ?? stage,
      count,
    }));

  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <p className="text-sm text-[#2C3E50]/60 text-center py-8">
        No patient data yet.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2C3E50" opacity={0.2} />
        <XAxis dataKey="stage" stroke="#2C3E50" fontSize={11} />
        <YAxis allowDecimals={false} stroke="#2C3E50" fontSize={11} />
        <Tooltip
          contentStyle={{ backgroundColor: '#FFFCF6', border: '2px solid #2C3E50', borderRadius: 12 }}
          formatter={(value: number) => [`${value} patients`, 'Count']}
        />
        <Bar dataKey="count" radius={[8, 8, 0, 0]} isAnimationActive={false}>
          {data.map((entry, index) => (
            <Cell key={entry.stage} fill={colors[index % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
