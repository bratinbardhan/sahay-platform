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

interface GameActivityChartProps {
  data: Record<string, number>;
}

const PALETTE = ['#E67E22', '#2C3E50', '#27AE60', '#C4A35A', '#5DA600', '#5B6673'];

function formatLabel(moduleId: string): string {
  return moduleId
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function GameActivityChart({ data }: GameActivityChartProps) {
  const entries = Object.entries(data);

  if (entries.length === 0) {
    return (
      <p className="text-sm text-[#2C3E50]/60 text-center py-8">
        No gameplay sessions recorded yet.
      </p>
    );
  }

  const chartData = entries
    .map(([moduleId, count]) => ({
      game: formatLabel(moduleId),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2C3E50" opacity={0.2} />
        <XAxis type="number" allowDecimals={false} stroke="#2C3E50" fontSize={11} />
        <YAxis type="category" dataKey="game" stroke="#2C3E50" fontSize={11} width={120} />
        <Tooltip
          contentStyle={{ backgroundColor: '#FFFCF6', border: '2px solid #2C3E50', borderRadius: 12 }}
          formatter={(value: number) => [`${value} sessions`, 'Play count']}
        />
        <Bar dataKey="count" radius={[0, 8, 8, 0]} isAnimationActive={false}>
          {chartData.map((entry, index) => (
            <Cell key={entry.game} fill={PALETTE[index % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
