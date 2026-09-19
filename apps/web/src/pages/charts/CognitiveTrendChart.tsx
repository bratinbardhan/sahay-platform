import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { DdaHistoryPoint } from '@sahay/types';

import { SAHAY_CARETAKER } from '@/lib/palette';

interface CognitiveTrendChartProps {
  points: DdaHistoryPoint[];
  /** Which cognitive metric to plot on the Y axis. */
  metric?: 'load' | 'latency';
}

const WIDTH = 560;
const HEIGHT = 240;
const MARGIN = { top: 16, right: 18, bottom: 30, left: 46 };
const INNER_W = WIDTH - MARGIN.left - MARGIN.right;
const INNER_H = HEIGHT - MARGIN.top - MARGIN.bottom;
/** Caretaker action amber — the primary series colour (palette token). */
const AMBER = SAHAY_CARETAKER.accent;
/** Ink rule for axis/hover guides and the secondary series. */
const CHARCOAL = SAHAY_CARETAKER.ink;

export function CognitiveTrendChart({ points, metric = 'load' }: CognitiveTrendChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const xAxisRef = useRef<SVGGElement>(null);
  const yAxisRef = useRef<SVGGElement>(null);

  const ordered = useMemo(
    () =>
      [...points].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ),
    [points]
  );

  const valueOf = useCallback(
    (p: DdaHistoryPoint) => (metric === 'latency' ? p.reaction_latency_ms : p.cognitive_load_index),
    [metric]
  );

  const { x, y, linePath, areaPath, xs, ys } = useMemo(() => {
    const x = d3
      .scaleTime()
      .domain(d3.extent(ordered, (p) => new Date(p.timestamp)) as [Date, Date])
      .range([0, INNER_W]);
    const yMax = metric === 'latency' ? (d3.max(ordered, valueOf) ?? 2000) : 100;
    const y = d3.scaleLinear().domain([0, yMax]).nice().range([INNER_H, 0]);

    const lineGen = d3
      .line<DdaHistoryPoint>()
      .x((p) => x(new Date(p.timestamp)))
      .y((p) => y(valueOf(p)))
      .curve(d3.curveMonotoneX);
    const areaGen = d3
      .area<DdaHistoryPoint>()
      .x((p) => x(new Date(p.timestamp)))
      .y0(INNER_H)
      .y1((p) => y(valueOf(p)))
      .curve(d3.curveMonotoneX);

    return {
      x,
      y,
      linePath: lineGen(ordered) ?? '',
      areaPath: areaGen(ordered) ?? '',
      xs: ordered.map((p) => x(new Date(p.timestamp))),
      ys: ordered.map((p) => y(valueOf(p))),
    };
  }, [ordered, valueOf, metric]);

  // Draw the axes imperatively — d3-axis is a DOM generator.
  useEffect(() => {
    if (xAxisRef.current) {
      d3.select(xAxisRef.current)
        .call(
          d3
            .axisBottom(x)
            .ticks(5)
            .tickFormat((domainValue) => d3.timeFormat('%d %b')(domainValue as Date))
        )
        .selectAll('text, line')
        .attr('stroke', CHARCOAL)
        .attr('fill', CHARCOAL);
    }
  }, [x, ordered]);
  useEffect(() => {
    if (yAxisRef.current) {
      d3.select(yAxisRef.current)
        .call(d3.axisLeft(y).ticks(5))
        .selectAll('text, line')
        .attr('stroke', CHARCOAL)
        .attr('fill', CHARCOAL);
    }
  }, [y]);

  if (ordered.length === 0) {
    return (
      <p className="text-sm text-sahay-ink/60 text-center py-8">
        No cognitive telemetry recorded yet — charts appear after the first gameplay sync.
      </p>
    );
  }

  const handleMove = (event: React.MouseEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * INNER_W;
    let nearest = 0;
    for (let i = 1; i < xs.length; i += 1) {
      if (Math.abs(xs[i] - px) < Math.abs(xs[nearest] - px)) {
        nearest = i;
      }
    }
    setHover(nearest);
  };

  const hoveredPoint = hover !== null ? ordered[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Cognitive trend chart"
      >
        <defs>
          <linearGradient id="cognitiveTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={AMBER} stopOpacity={0.35} />
            <stop offset="100%" stopColor={AMBER} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          <g ref={yAxisRef} />
          <g ref={xAxisRef} transform={`translate(0, ${INNER_H})`} />
          <path d={areaPath} fill="url(#cognitiveTrendFill)" />
          <path d={linePath} fill="none" stroke={AMBER} strokeWidth={3} strokeLinecap="round" />
          {ordered.map((p, i) => (
            <circle
              key={`${p.timestamp}-${i}`}
              cx={xs[i]}
              cy={ys[i]}
              r={hover === i ? 5.5 : 3.5}
              fill={hover === i ? AMBER : SAHAY_CARETAKER.surface}
              stroke={AMBER}
              strokeWidth={2}
            />
          ))}
          {hover !== null && (
            <line
              x1={xs[hover]}
              y1={0}
              x2={xs[hover]}
              y2={INNER_H}
              stroke={CHARCOAL}
              strokeOpacity={0.35}
              strokeDasharray="4 3"
            />
          )}
          <rect
            x={0}
            y={0}
            width={INNER_W}
            height={INNER_H}
            fill="transparent"
            onMouseMove={handleMove}
            onMouseLeave={() => setHover(null)}
          />
        </g>
      </svg>
      {hoveredPoint && hover !== null && (
        <div
          className="pointer-events-none absolute z-10 rounded-xl border-2 border-sahay-ink bg-sahay-surface px-3 py-2 text-xs shadow-md"
          style={{
            left: `${((MARGIN.left + xs[hover]) / WIDTH) * 100}%`,
            top: `${((MARGIN.top + ys[hover]) / HEIGHT) * 100}%`,
            transform: 'translate(-50%, -115%)',
          }}
        >
          <p className="font-semibold text-sahay-ink">
            {new Date(hoveredPoint.timestamp).toLocaleDateString()}
          </p>
          <p className="text-sahay-accent font-bold">
            {metric === 'latency'
              ? `Reaction: ${Math.round(hoveredPoint.reaction_latency_ms)} ms`
              : `Cognitive load: ${hoveredPoint.cognitive_load_index.toFixed(1)} / 100`}
          </p>
          <p className="text-sahay-ink/70">Difficulty: {hoveredPoint.difficulty_level.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}
