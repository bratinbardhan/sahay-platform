import { useMemo } from 'react';
import { scaleLinear } from 'd3';
import {
  CartesianGrid,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { ReactElement } from 'react';

import type { HeatmapCell } from '@/lib/demoSeed';
import { SAHAY_CARETAKER, sahayTooltipLabelStyle, sahayTooltipStyle } from '@/lib/palette';
import { CHART_ANIMATION_MS, ChartShell } from './ChartShell';

interface ActivityHeatmapProps {
  cells: HeatmapCell[];
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const latencyScale = scaleLinear<string>()
  .domain([360, 420, 490])
  .range([SAHAY_CARETAKER.viz[0], SAHAY_CARETAKER.viz[2], SAHAY_CARETAKER.viz[5]])
  .clamp(true);

function cellFill(cell: HeatmapCell): string {
  if (cell.density < 0.08) {
    return SAHAY_CARETAKER.surfaceSunken;
  }
  return latencyScale(cell.latencyMs);
}

// Typing props as unknown matches Recharts' ScatterCustomizedShape '(props: unknown) => Element'
function HeatShape(props: unknown): ReactElement {
  if (typeof props !== 'object' || props === null) {
    return <g />;
  }

  const record = props as Record<string, unknown>;
  const cx = typeof record.cx === 'number' ? record.cx : undefined;
  const cy = typeof record.cy === 'number' ? record.cy : undefined;
  const payload = record.payload as HeatmapCell | undefined;

  if (cx === undefined || cy === undefined || !payload) {
    return <g />;
  }

  const size = 16;
  return (
    <rect
      x={cx - size / 2}
      y={cy - size / 2}
      width={size}
      height={size}
      rx={3}
      fill={cellFill(payload)}
      opacity={0.32 + payload.density * 0.68}
    />
  );
}

export function ActivityHeatmap({ cells }: ActivityHeatmapProps) {
  const data = useMemo(
    () =>
      cells.map((cell) => ({
        ...cell,
        hour: cell.hour,
        dayIndex: cell.dayIndex,
      })),
    [cells]
  );

  if (data.length === 0) {
    return (
      <p className="text-sm text-sahay-ink/60 text-center py-8">
        No interaction density recorded yet.
      </p>
    );
  }

  return (
    <ChartShell>
      <ScatterChart margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={SAHAY_CARETAKER.grid} />
        <XAxis
          type="number"
          dataKey="hour"
          name="Hour"
          domain={[-0.5, 23.5]}
          ticks={HOURS}
          stroke={SAHAY_CARETAKER.axis}
          fontSize={10}
        />
        <YAxis
          type="number"
          dataKey="dayIndex"
          name="Day"
          domain={[-0.5, 6.5]}
          ticks={[0, 1, 2, 3, 4, 5, 6]}
          tickFormatter={(value: number) => DAYS[value] ?? String(value)}
          reversed
          stroke={SAHAY_CARETAKER.axis}
          fontSize={11}
          width={42}
        />
        <ZAxis type="number" dataKey="density" range={[40, 160]} />
        <Tooltip
          cursor={{ stroke: SAHAY_CARETAKER.ink }}
          contentStyle={sahayTooltipStyle}
          labelStyle={sahayTooltipLabelStyle}
          content={({ active, payload }) => {
            if (!active || !payload || payload.length === 0) {
              return null;
            }
            const cell = payload[0].payload as HeatmapCell;
            return (
              <div className="sahay-viz-tooltip text-sahay-ink">
                <p className="font-bold">
                  {cell.dayLabel} {String(cell.hour).padStart(2, '0')}:00
                </p>
                <p>
                  Density {Math.round(cell.density * 100)}% · latency {cell.latencyMs} ms
                </p>
              </div>
            );
          }}
        />
        <Scatter
          data={data}
          shape={HeatShape}
          isAnimationActive={true}
          animationDuration={CHART_ANIMATION_MS}
        />
      </ScatterChart>
    </ChartShell>
  );
}

export default ActivityHeatmap;