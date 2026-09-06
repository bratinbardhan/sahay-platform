import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { GameplaySessionLog } from '@sahay/types';

interface CognitiveTrendChartProps {
  sessions: GameplaySessionLog[];
}

interface TrendPoint {
  session: string;
  accuracy: number;
  latency: number;
}

export function CognitiveTrendChart({ sessions }: CognitiveTrendChartProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 60);
    return () => window.clearTimeout(timer);
  }, []);

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-[#2C3E50]/60 text-center py-8">
        No sessions recorded yet.
      </p>
    );
  }

  const ordered = [...sessions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const data: TrendPoint[] = ordered.map((session, index) => ({
    session: `S${index + 1}`,
    accuracy:
      session.tasks_presented > 0
        ? Math.round((session.tasks_completed_cleanly / session.tasks_presented) * 100)
        : 0,
    latency: Math.round(session.avg_latency_ms),
  }));

  return (
    <div
      className={`transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2C3E50" opacity={0.2} />
          <XAxis dataKey="session" stroke="#2C3E50" fontSize={11} />
          <YAxis stroke="#2C3E50" fontSize={11} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFCF6',
              border: '2px solid #2C3E50',
              borderRadius: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="accuracy"
            stroke="#E67E22"
            strokeWidth={3}
            name="Accuracy %"
            dot={{ r: 4, fill: '#FFFCF6', stroke: '#E67E22', strokeWidth: 2 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="latency"
            stroke="#2C3E50"
            strokeWidth={2}
            name="Latency (ms)"
            dot={{ r: 3, fill: '#F8F6F0', stroke: '#2C3E50', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
