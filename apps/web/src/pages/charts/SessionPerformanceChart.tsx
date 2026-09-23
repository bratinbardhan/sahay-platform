import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts';
import type { SessionRecord } from '@sahay/types';

import { SAHAY_CARETAKER, sahayTooltipLabelStyle, sahayTooltipStyle } from '@/lib/palette';
import { CHART_ANIMATION_MS, ChartShell } from './ChartShell';

interface SessionPerformanceChartProps {
  sessions: SessionRecord[];
}

interface DailyBars {
  day: string;
  attempts: number;
  completed: number;
  durationMin: number;
  sortAccuracy: number;
  avgLatencyMs: number;
}

function formatDay(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function aggregateDaily(sessions: SessionRecord[]): DailyBars[] {
  const buckets = new Map<string, DailyBars>();
  const ordered = [...sessions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  for (const session of ordered) {
    const day = formatDay(session.timestamp);
    const current = buckets.get(day) ?? {
      day,
      attempts: 0,
      completed: 0,
      durationMin: 0,
      sortAccuracy: 0,
      avgLatencyMs: 0,
    };
    const priorAttempts = current.attempts;
    current.attempts += session.tasks_presented;
    current.completed += session.tasks_completed_cleanly;
    current.durationMin += session.duration_seconds / 60;
    current.sortAccuracy =
      current.attempts > 0
        ? Math.round((current.completed / current.attempts) * 1000) / 10
        : 0;
    current.avgLatencyMs =
      priorAttempts + session.tasks_presented > 0
        ? Math.round(
          (current.avgLatencyMs * priorAttempts +
            session.avg_latency_ms * session.tasks_presented) /
          (priorAttempts + session.tasks_presented)
        )
        : session.avg_latency_ms;
    buckets.set(day, current);
  }
  return Array.from(buckets.values());
}

export function SessionPerformanceChart({ sessions }: SessionPerformanceChartProps) {
  const data = useMemo(() => aggregateDaily(sessions), [sessions]);

  if (data.length === 0) {
    return (
      <p className="text-sm text-sahay-ink/60 text-center py-8">No gameplay sessions recorded yet.</p>
    );
  }

  const attemptsColor = SAHAY_CARETAKER.viz[1];
  const completedColor = SAHAY_CARETAKER.viz[0];

  return (
    <ChartShell>
      <BarChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={SAHAY_CARETAKER.grid} vertical={false} />
        <XAxis dataKey="day" stroke={SAHAY_CARETAKER.axis} tick={{ fontWeight: 700, fontSize: 11 }} />
        <YAxis allowDecimals={false} stroke={SAHAY_CARETAKER.axis} tick={{ fontWeight: 700, fontSize: 11 }} />
        <Tooltip
          contentStyle={sahayTooltipStyle}
          labelStyle={sahayTooltipLabelStyle}
          itemStyle={{ fontWeight: 700 }}
          formatter={(value: unknown, name: unknown) => {
            const numeric = typeof value === 'number' ? value : Number(value ?? 0);
            return [`${numeric}`, String(name)];
          }}
          labelFormatter={(label, payload) => {
            const row = Array.isArray(payload) ? payload[0]?.payload : undefined;
            if (!row) {
              return String(label);
            }
            return `${row.day} · ${row.durationMin.toFixed(1)} min · ${row.sortAccuracy}% sort · ${row.avgLatencyMs}ms`;
          }}
        />
        <Legend formatter={(value) => <span className="font-bold text-xs">{value}</span>} />
        <Bar
          dataKey="attempts"
          name="Attempts"
          fill={attemptsColor}
          radius={[6, 6, 0, 0]}
          maxBarSize={22}
          isAnimationActive={true}
          animationDuration={CHART_ANIMATION_MS}
          animationEasing="ease-in-out"
        />
        <Bar
          dataKey="completed"
          name="Completed"
          fill={completedColor}
          radius={[6, 6, 0, 0]}
          maxBarSize={22}
          isAnimationActive={true}
          animationDuration={CHART_ANIMATION_MS}
          animationEasing="ease-in-out"
        />
      </BarChart>
    </ChartShell>
  );
}
