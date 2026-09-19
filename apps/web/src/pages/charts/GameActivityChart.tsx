import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { CHART_ANIMATION_MS, ChartShell } from './ChartShell';

interface GameActivityChartProps {
  data: Record<string, number>;
}

function formatLabel(moduleId: string): string {
  return moduleId.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function GameActivityChart({ data }: GameActivityChartProps) {
  const entries = Object.entries(data);

  if (entries.length === 0) {
    return (
      <p className="text-sm text-sahay-ink/60 text-center py-8">No gameplay sessions recorded yet.</p>
    );
  }

  const chartData = entries
    .map(([moduleId, count]) => ({
      game: formatLabel(moduleId),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <ChartShell>
      <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
        <CartesianGrid {...sahayGridProps} opacity={0.6} />
        <XAxis type="number" allowDecimals={false} stroke={SAHAY_CARETAKER.axis} fontSize={11} />
        <YAxis type="category" dataKey="game" stroke={SAHAY_CARETAKER.axis} fontSize={11} width={120} />
        <Tooltip
          contentStyle={sahayTooltipStyle}
          formatter={(value: unknown) => {
            const numeric = typeof value === 'number' ? value : Number(value ?? 0);
            return [`${numeric} sessions`, 'Play count'];
          }}
        />
        <Bar
          dataKey="count"
          radius={[0, 8, 8, 0]}
          isAnimationActive={true}
          animationDuration={CHART_ANIMATION_MS}
        >
          {chartData.map((entry, index) => (
            <Cell key={entry.game} fill={SAHAY_VIZ_SERIES[index % SAHAY_VIZ_SERIES.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartShell>
  );
}
