import { useMemo, useState } from 'react';
import * as d3 from 'd3';
import type { SessionRecord } from '@sahay/types';

interface SessionPerformanceChartProps {
  sessions: SessionRecord[];
}

interface GameAggregate {
  game: string;
  label: string;
  accuracyPct: number;
  latencyMs: number;
  sessionCount: number;
}

const WIDTH = 560;
const HEIGHT = 260;
const MARGIN = { top: 16, right: 18, bottom: 44, left: 46 };
const INNER_W = WIDTH - MARGIN.left - MARGIN.right;
const INNER_H = HEIGHT - MARGIN.top - MARGIN.bottom;
const AMBER = '#E67E22';
const CHARCOAL = '#2C3E50';
/** Reaction-latency axis ceiling (ms) — matches the backend's cognitive-load cap. */
const LATENCY_AXIS_MAX = 2000;

function formatLabel(moduleId: string): string {
  return moduleId.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Aggregate sessions per game module: mean accuracy + mean reaction latency. */
function aggregate(sessions: SessionRecord[]): GameAggregate[] {
  const groups = new Map<string, SessionRecord[]>();
  for (const session of sessions) {
    const bucket = groups.get(session.game_module_id) ?? [];
    bucket.push(session);
    groups.set(session.game_module_id, bucket);
  }
  return Array.from(groups.entries())
    .map(([game, rows]) => ({
      game,
      label: formatLabel(game),
      accuracyPct: rows.reduce((sum, r) => sum + r.accuracy_pct, 0) / Math.max(1, rows.length),
      latencyMs: rows.reduce((sum, r) => sum + r.avg_latency_ms, 0) / Math.max(1, rows.length),
      sessionCount: rows.length,
    }))
    .sort((a, b) => b.sessionCount - a.sessionCount);
}

/**
 * Session Performance Breakdown — grouped D3 bar chart comparing accuracy
 * (amber, left axis, %) and reaction speed (charcoal, right axis, ms) across
 * game modules, e.g. Rapid-Fire Sorting vs Serial Number Scatter.
 */
export function SessionPerformanceChart({ sessions }: SessionPerformanceChartProps) {
  const [hover, setHover] = useState<{ game: string; series: 'accuracy' | 'latency' } | null>(null);

  const data = useMemo(() => aggregate(sessions), [sessions]);

  const { gameScale, accuracyY, latencyY, bars } = useMemo(() => {
    const gameScale = d3
      .scaleBand<string>()
      .domain(data.map((d) => d.game))
      .range([0, INNER_W])
      .paddingInner(0.25)
      .paddingOuter(0.15);
    const innerScale = d3
      .scaleBand<string>()
      .domain(['accuracy', 'latency'])
      .range([0, gameScale.bandwidth()])
      .padding(0.08);
    const accuracyY = d3.scaleLinear().domain([0, 100]).nice().range([INNER_H, 0]);
    const latencyY = d3.scaleLinear().domain([0, LATENCY_AXIS_MAX]).nice().range([INNER_H, 0]);
    const bars = data.flatMap((d) => [
      {
        game: d.game,
        series: 'accuracy' as const,
        x: (gameScale(d.game) ?? 0) + (innerScale('accuracy') ?? 0),
        y: accuracyY(d.accuracyPct),
        width: innerScale.bandwidth(),
        height: INNER_H - accuracyY(d.accuracyPct),
        fill: AMBER,
      },
      {
        game: d.game,
        series: 'latency' as const,
        x: (gameScale(d.game) ?? 0) + (innerScale('latency') ?? 0),
        y: latencyY(d.latencyMs),
        width: innerScale.bandwidth(),
        height: INNER_H - latencyY(d.latencyMs),
        fill: CHARCOAL,
      },
    ]);
    return { gameScale, accuracyY, latencyY, bars };
  }, [data]);

  if (data.length === 0) {
    return (
      <p className="text-sm text-[#2C3E50]/60 text-center py-8">
        No gameplay sessions recorded yet.
      </p>
    );
  }

  const hovered = hover ? data.find((d) => d.game === hover.game) : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Session performance breakdown by game"
      >
        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          <g
            ref={(el) => {
              if (el) {
                d3.select(el)
                  .call(d3.axisLeft(accuracyY).ticks(5).tickFormat((v) => `${v}%`))
                  .selectAll('text, line')
                  .attr('stroke', CHARCOAL)
                  .attr('fill', CHARCOAL);
              }
            }}
          />
          <g
            ref={(el) => {
              if (el) {
                d3.select(el)
                  .call(d3.axisRight(latencyY).ticks(5))
                  .selectAll('text, line')
                  .attr('stroke', CHARCOAL)
                  .attr('fill', CHARCOAL);
              }
            }}
            transform={`translate(${INNER_W}, 0)`}
          />
          <g
            ref={(el) => {
              if (el) {
                d3.select(el)
                  .call(d3.axisBottom(gameScale).tickSize(0).tickFormat((d) => d as string))
                  .selectAll('text')
                  .attr('fill', CHARCOAL)
                  .attr('dy', '1.1em')
                  .style('font-size', '10px');
              }
            }}
            transform={`translate(0, ${INNER_H})`}
          />
          {bars.map((bar) => {
            const isHovered = hover?.game === bar.game && hover?.series === bar.series;
            return (
              <rect
                key={`${bar.game}-${bar.series}`}
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={Math.max(0, bar.height)}
                fill={bar.fill}
                opacity={hover && !isHovered ? 0.55 : 1}
                rx={4}
                onMouseEnter={() => setHover({ game: bar.game, series: bar.series })}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-1 text-xs text-[#2C3E50]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: AMBER }} />
          Accuracy %
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: CHARCOAL }} />
          Reaction speed (ms, right axis)
        </span>
      </div>

      {hovered && hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-xl border-2 border-[#2C3E50] bg-[#FFFCF6] px-3 py-2 text-xs shadow-md"
          style={{ left: '50%', bottom: 48, transform: 'translateX(-50%)' }}
        >
          <p className="font-semibold text-[#2C3E50]">{hovered.label}</p>
          {hover.series === 'accuracy' ? (
            <p className="text-[#E67E22] font-bold">Accuracy: {hovered.accuracyPct.toFixed(1)}%</p>
          ) : (
            <p className="font-bold text-[#2C3E50]">Reaction: {Math.round(hovered.latencyMs)} ms</p>
          )}
          <p className="text-[#2C3E50]/70">{hovered.sessionCount} session(s)</p>
        </div>
      )}
    </div>
  );
}