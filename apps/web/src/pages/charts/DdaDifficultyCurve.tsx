import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { DdaHistoryPoint } from '@sahay/types';

interface DdaDifficultyCurveProps {
  points: DdaHistoryPoint[];
  /** Recommended next difficulty from the cognitive summary (dashed guide). */
  recommendedDifficulty?: number | null;
  /** Max rounds to display (Achaotic DDA calibration window). */
  lastRounds?: number;
}

const WIDTH = 560;
const HEIGHT = 250;
const MARGIN = { top: 16, right: 18, bottom: 30, left: 46 };
const INNER_W = WIDTH - MARGIN.left - MARGIN.right;
const INNER_H = HEIGHT - MARGIN.top - MARGIN.bottom;
const AMBER = '#E67E22';
const CHARCOAL = '#2C3E50';
const MAX_DIFFICULTY = 10;

/**
 * DDA Difficulty Curve — the Achaotic dynamic-difficulty level over the
 * patient's last N rounds, with a dashed guide at the recommended next level.
 */
export function DdaDifficultyCurve({
  points,
  recommendedDifficulty = null,
  lastRounds = 10,
}: DdaDifficultyCurveProps) {
  const [hover, setHover] = useState<number | null>(null);
  const xAxisRef = useRef<SVGGElement>(null);
  const yAxisRef = useRef<SVGGElement>(null);

  const ordered = useMemo(
    () =>
      [...points]
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(-lastRounds),
    [points, lastRounds]
  );

  const { x, y, linePath, areaPath, xs, ys } = useMemo(() => {
    const x = d3
      .scaleLinear()
      .domain([0, Math.max(1, ordered.length - 1)])
      .range([0, INNER_W]);
    const y = d3.scaleLinear().domain([0, MAX_DIFFICULTY]).nice().range([INNER_H, 0]);

    const lineGen = d3
      .line<DdaHistoryPoint>()
      .x((_, i) => x(i))
      .y((p) => y(Math.min(MAX_DIFFICULTY, p.difficulty_level)))
      .curve(d3.curveMonotoneX);
    const areaGen = d3
      .area<DdaHistoryPoint>()
      .x((_, i) => x(i))
      .y0(INNER_H)
      .y1((p) => y(Math.min(MAX_DIFFICULTY, p.difficulty_level)))
      .curve(d3.curveMonotoneX);

    return {
      x,
      y,
      linePath: lineGen(ordered) ?? '',
      areaPath: areaGen(ordered) ?? '',
      xs: ordered.map((_, i) => x(i)),
      ys: ordered.map((p) => y(Math.min(MAX_DIFFICULTY, p.difficulty_level))),
    };
  }, [ordered]);

  useEffect(() => {
    if (xAxisRef.current) {
      d3.select(xAxisRef.current)
        .call(
          d3
            .axisBottom(x)
            .ticks(Math.min(10, ordered.length))
            .tickFormat((_, i) => `R${i + 1}`)
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
      <p className="text-sm text-[#2C3E50]/60 text-center py-8">
        No DDA difficulty data yet — the curve calibrates after the first sessions sync.
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
  const roundNumber = hover !== null ? ordered.length - hover : 0;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="DDA difficulty curve"
      >
        <defs>
          <linearGradient id="ddaCurveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHARCOAL} stopOpacity={0.25} />
            <stop offset="100%" stopColor={CHARCOAL} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          <g ref={yAxisRef} />
          <g ref={xAxisRef} transform={`translate(0, ${INNER_H})`} />
          {recommendedDifficulty !== null && (
            <g>
              <line
                x1={0}
                x2={INNER_W}
                y1={y(recommendedDifficulty)}
                y2={y(recommendedDifficulty)}
                stroke={AMBER}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                opacity={0.8}
              />
              <text
                x={INNER_W - 4}
                y={y(recommendedDifficulty) - 5}
                textAnchor="end"
                fontSize={10}
                fill={AMBER}
              >
                Recommended: {recommendedDifficulty}
              </text>
            </g>
          )}
          <path d={areaPath} fill="url(#ddaCurveFill)" />
          <path d={linePath} fill="none" stroke={CHARCOAL} strokeWidth={3} strokeLinecap="round" />
          {ordered.map((p, i) => (
            <circle
              key={`${p.timestamp}-${i}`}
              cx={xs[i]}
              cy={ys[i]}
              r={hover === i ? 5.5 : 3.5}
              fill={hover === i ? CHARCOAL : '#FFFCF6'}
              stroke={CHARCOAL}
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
          className="pointer-events-none absolute z-10 rounded-xl border-2 border-[#2C3E50] bg-[#FFFCF6] px-3 py-2 text-xs shadow-md"
          style={{
            left: `${((MARGIN.left + xs[hover]) / WIDTH) * 100}%`,
            top: `${((MARGIN.top + ys[hover]) / HEIGHT) * 100}%`,
            transform: 'translate(-50%, -115%)',
          }}
        >
          <p className="font-semibold text-[#2C3E50]">Round {roundNumber}</p>
          <p className="text-[#E67E22] font-bold">
            Difficulty: {hoveredPoint.difficulty_level.toFixed(2)}
          </p>
          <p className="text-[#2C3E50]/70">Reaction: {Math.round(hoveredPoint.reaction_latency_ms)} ms</p>
        </div>
      )}
    </div>
  );
}

// Added a comment to ensure the file is considered 'changed' for the commit.
