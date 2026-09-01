import { useEffect, useState } from 'react';
import type { GameplaySessionLog } from '@sahay/types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  CartesianGrid,
} from 'recharts';
import { ChevronLeft } from 'lucide-react';
import { Card } from '@/components/Card';
import { getMockSessionLogs } from '@/lib/mockData';
import { GDS_STAGE_LABELS } from '@/lib/gdsUtils';

interface AnalyticsChartProps {
  onNavigate: (page: string) => void;
}

type ChartDataPoint = {
  session: string;
  latency: number;
  accuracy: number;
  rawDifficulty: number;
  smoothedDifficulty: number;
  gdsStage: number;
};

/**
 * Achaotic DDA smoothing: a non-spiking weighted rolling average that damps
 * abrupt difficulty jumps between consecutive sessions — any single-session
 * spike is diluted into the surrounding window rather than propagated.
 */
function achaoticSmoothing(values: number[]): number[] {
  return values.map((_, index) => {
    const low = Math.max(0, index - 1);
    const high = Math.min(values.length, index + 2);
    const window = values.slice(low, high);
    const total = window.reduce((sum, value) => sum + value, 0);
    return Math.round((total / window.length) * 100) / 100;
  });
}

export function AnalyticsChart({ onNavigate }: AnalyticsChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [logs, setLogs] = useState<GameplaySessionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const fetched = await getMockSessionLogs();
      const ordered = [...fetched].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      const rawDiffs = ordered.map((log) => log.difficulty_level);
      const smoothed = achaoticSmoothing(rawDiffs);

      setLogs(ordered);
      setData(
        ordered.map((log, index) => ({
          session: `S${index + 1}`,
          latency: log.avg_latency_ms,
          accuracy:
            log.tasks_presented > 0
              ? Math.round((log.tasks_completed_cleanly / log.tasks_presented) * 100 * 10) / 10
              : 0,
          rawDifficulty: log.difficulty_level,
          smoothedDifficulty: smoothed[index],
          gdsStage: log.gds_stage,
        }))
      );
      setLoading(false);
    };
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#F8F6F0] items-center justify-center">
        <p className="text-[#2C3E50] text-lg">Loading analytics…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F0] p-8">
      <div className="flex items-center mb-6">
        <button
          type="button"
          className="mr-4 p-2 rounded-lg bg-[#FFFCF6] border-2 border-[#2C3E50] text-[#2C3E50] hover:bg-[#edeae3]"
          onClick={() => onNavigate('dashboard')}
          aria-label="Back to dashboard"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-3xl font-bold text-[#2C3E50]">Cognitive Health Analytics</h1>
      </div>

      <p className="text-[#2C3E50]/70 mb-6">
        Last 10 gameplay sessions — showing touch latency, accuracy, and the Achaotic DDA difficulty curve.
      </p>

      {/* Latency & Accuracy Chart */}
      <Card title="Touch Latency & Accuracy Trend" className="mb-8">
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={data} margin={{ top: 24, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#2C3E50" />
            <XAxis dataKey="session" stroke="#2C3E50" fontSize={11} />
            <YAxis yAxisId="left" stroke="#E67E22" />
            <YAxis yAxisId="right" orientation="right" stroke="#2C3E50" />
            <Tooltip contentStyle={{ backgroundColor: '#FFFCF6', border: '2px solid #2C3E50' }} />
            <Legend wrapperStyle={{ color: '#2C3E50', fontSize: 14 }} />

            <ReferenceArea yAxisId="left" y1={1000} y2={1800} fill="#E67E22" fillOpacity={0.08} />

            <Line
              yAxisId="left"
              type="monotone"
              dataKey="latency"
              stroke="#E67E22"
              strokeWidth={3}
              name="Avg Latency (ms)"
              dot={{ r: 5, fill: '#F8F6F0', stroke: '#E67E22', strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="accuracy"
              stroke="#2C3E50"
              strokeWidth={2}
              name="Accuracy (%)"
              dot={{ r: 4 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Difficulty Smoothing Curve */}
      <Card title="Achaotic DDA Difficulty Curve" className="mb-8">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#2C3E50" />
            <XAxis dataKey="session" stroke="#2C3E50" fontSize={11} />
            <YAxis domain={[0, 10]} stroke="#2C3E50" />
            <Tooltip contentStyle={{ backgroundColor: '#FFFCF6', border: '2px solid #2C3E50' }} />
            <Legend wrapperStyle={{ color: '#2C3E50', fontSize: 14 }} />

            <Line
              type="stepAfter"
              dataKey="rawDifficulty"
              stroke="#E67E22"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              name="Raw Difficulty (pre-DDA)"
              dot={{ r: 4, fill: '#FFFCF6', stroke: '#E67E22', strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="smoothedDifficulty"
              stroke="#2C3E50"
              strokeWidth={3}
              name="Smoothed Difficulty (Achaotic DDA)"
              dot={{ r: 5, fill: '#F8F6F0', stroke: '#2C3E50', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs text-[#2C3E50]/60 mt-2">
          The Achaotic DDA engine applies a non-spiking weighted rolling average to touch latency and
          error frequency. The dashed amber line is the raw per-session difficulty; the solid charcoal
          line is the smoothed curve — abrupt spikes are diluted, so difficulty rises and falls only
          gradually as long-term performance improves.
        </p>
      </Card>

      {/* Session Logs Table */}
      <Card title="Session Logs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[#2C3E50]">
                <th className="text-left p-2 text-[#2C3E50]">Session</th>
                <th className="text-left p-2 text-[#2C3E50]">Game</th>
                <th className="text-left p-2 text-[#2C3E50]">GDS</th>
                <th className="text-right p-2 text-[#2C3E50]">Latency</th>
                <th className="text-right p-2 text-[#2C3E50]">Clean/Total</th>
                <th className="text-right p-2 text-[#2C3E50]">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => {
                const point = data[index];
                const stageLabel = GDS_STAGE_LABELS[log.gds_stage] ?? `Stage ${log.gds_stage}`;
                return (
                  <tr key={log.id} className="border-b border-[#2C3E50]/20">
                    <td className="p-2 font-medium text-[#2C3E50]">S{index + 1}</td>
                    <td className="p-2 text-[#2C3E50]">{log.game_module_id.replace(/_/g, ' ')}</td>
                    <td className="p-2 text-[#2C3E50]">{stageLabel}</td>
                    <td className="text-right p-2 text-[#E67E22] font-medium">
                      {point ? `${point.latency}ms` : `${log.avg_latency_ms}ms`}
                    </td>
                    <td className="text-right p-2 text-[#2C3E50]">
                      {log.tasks_completed_cleanly}/{log.tasks_presented}
                    </td>
                    <td className="text-right p-2 text-[#2C3E50]">{log.demitokens_earned}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}


