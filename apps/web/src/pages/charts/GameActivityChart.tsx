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
import {
  SAHAY_CARETAKER,
  SAHAY_VIZ_SERIES,
  sahayGridProps,
  sahayTooltipStyle,
} from '@/lib/palette';

interface GameActivityChartProps {
  data: Record<string, number>;
}

/** Game activity is a caretaker-only view — amber-led categorical series. */
const PALETTE = SAHAY_VIZ_SERIES;

function formatLabel(moduleId: string): string {
  return moduleId
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function GameActivityChart({ data }: GameActivityChartProps) {
  const entries = Object.entries(data);

  if (entries.length === 0) {
    return (
      <p className="text-sm text-sahay-ink/60 text-center py-8">
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
        <CartesianGrid {...sahayGridProps} opacity={0.6} />
        <XAxis type="number" allowDecimals={false} stroke={SAHAY_CARETAKER.axis} fontSize={11} />
        <YAxis type="category" dataKey="game" stroke={SAHAY_CARETAKER.axis} fontSize={11} width={120} />
        <Tooltip
          contentStyle={sahayTooltipStyle}
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
