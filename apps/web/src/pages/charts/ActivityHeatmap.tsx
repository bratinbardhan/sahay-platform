import { useMemo, useState } from 'react';
import type { HeatmapCell } from '@/lib/demoSeed';

interface ActivityHeatmapProps {
  cells: HeatmapCell[];
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const X_LABELS = ['12 AM', '3 AM', '6 AM', '9 AM', '12 PM', '3 PM', '6 PM', '9 PM'];

function getCellColor(density: number) {
  if (density < 0.08) return 'bg-slate-100'; // Inactive
  if (density < 0.4) return 'bg-teal-200';  // Baseline
  if (density < 0.7) return 'bg-teal-500';  // Moderate
  return 'bg-amber-400';                    // High Focus
}

export function ActivityHeatmap({ cells }: ActivityHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

  const grid = useMemo(() => {
    const matrix: (HeatmapCell | null)[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => null)
    );
    for (const cell of cells) {
      if (cell.dayIndex >= 0 && cell.dayIndex < 7 && cell.hour >= 0 && cell.hour < 24) {
        matrix[cell.dayIndex][cell.hour] = cell;
      }
    }
    return matrix;
  }, [cells]);

  if (cells.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-8">
        No interaction density recorded yet.
      </p>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-8">
        <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-100 shadow-sm">
          <div className="text-xl font-extrabold text-amber-950">10:00 AM</div>
          <div className="text-xs font-semibold text-amber-800/80">Peak Focus</div>
        </div>
        <div className="bg-teal-50/80 rounded-xl p-4 border border-teal-100 shadow-sm">
          <div className="text-xl font-extrabold text-teal-950">6.4 hrs</div>
          <div className="text-xs font-semibold text-teal-800/80">Active Hours</div>
        </div>
        <div className="bg-indigo-50/60 rounded-xl p-4 border border-indigo-100 shadow-sm">
          <div className="text-xl font-extrabold text-indigo-950">4 intervals</div>
          <div className="text-xs font-semibold text-indigo-900/80">Rest Gaps</div>
        </div>
        <div className="bg-emerald-50/80 rounded-xl p-4 border border-emerald-100 shadow-sm">
          <div className="text-xl font-extrabold text-emerald-950">94%</div>
          <div className="text-xs font-semibold text-emerald-800/80">Consistency</div>
        </div>
      </div>

      <div className="relative flex flex-col items-center bg-white p-6 rounded-2xl border border-slate-200">
        <div className="flex w-full">
          <div className="flex flex-col gap-1.5 mr-4 mt-8 pb-6">
            {DAYS.map((day) => (
              <div key={day} className="h-6 flex items-center justify-end">
                <span className="text-xs font-semibold text-slate-500">{day}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col flex-1 overflow-x-auto pb-2">
            <div className="flex justify-between w-[588px] px-3 mb-2 text-xs font-semibold text-slate-500">
              {X_LABELS.map((label, i) => (
                <span key={i} className="text-center">{label}</span>
              ))}
            </div>

            <div className="flex flex-col gap-1.5 w-[588px]">
              {grid.map((row, r) => (
                <div key={r} className="flex gap-1.5">
                  {row.map((cell, c) => (
                    <div
                      key={c}
                      className={`w-6 h-6 rounded-md transition-colors cursor-crosshair ${cell ? getCellColor(cell.density) : 'bg-slate-50'
                        }`}
                      onMouseEnter={() => setHoveredCell(cell)}
                      onMouseLeave={() => setHoveredCell(null)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 mt-6 justify-center w-full">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-slate-100"></div>
            <span className="text-xs font-bold text-slate-500">Inactive</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-teal-200"></div>
            <span className="text-xs font-bold text-slate-500">Baseline</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-teal-500"></div>
            <span className="text-xs font-bold text-slate-500">Moderate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-amber-400"></div>
            <span className="text-xs font-bold text-slate-500">High Focus</span>
          </div>
        </div>

        {hoveredCell ? (
          <div className="absolute top-2 right-4 bg-slate-800 text-white text-xs p-3 rounded-lg shadow-xl shadow-slate-200/50 pointer-events-none z-10 text-center animate-in fade-in duration-200">
            <p className="font-bold mb-1">
              {hoveredCell.dayLabel} {String(hoveredCell.hour).padStart(2, '0')}:00
            </p>
            <p className="text-slate-300">
              Density: {Math.round(hoveredCell.density * 100)}%
            </p>
            <p className="text-slate-300">
              Latency: <span className="text-amber-300 font-semibold">{hoveredCell.latencyMs}ms</span>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default ActivityHeatmap;