import { useEffect, useState } from 'react';
import type { PatientProfile, GameplaySessionLog } from '@sahay/types';
import { Activity, Brain, Camera, Coins, Flame, MapPin, Target } from 'lucide-react';
import { ActionButton } from '@/components/ActionButton';
import { Card } from '@/components/Card';
import { StatBox } from '@/components/StatBox';

import { getMockPatient, getMockSessionLogs } from '@/lib/mockData';
import { GDS_STAGE_LABELS, getGdsStageColor } from '@/lib/gdsUtils';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [sessions, setSessions] = useState<GameplaySessionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const p = await getMockPatient();
      const s = await getMockSessionLogs();
      setPatient(p);
      setSessions(s);
      setLoading(false);
    };
    void load();
  }, []);

  if (loading || !patient) {
    return (
      <div className="flex min-h-screen bg-[#F8F6F0] items-center justify-center">
        <p className="text-[#2C3E50] text-lg">Loading patient portal…</p>
      </div>
    );
  }

  const stage = patient.assigned_gds_stage;
  const stageLabel = GDS_STAGE_LABELS[stage] || 'Unknown';
  const stageColor = getGdsStageColor(stage);

  const latestSession = sessions[0];
  const accuracyRate =
    sessions.length > 0
      ? (sessions.reduce((sum, s) => sum + s.tasks_completed_cleanly, 0) /
          sessions.reduce((sum, s) => sum + s.tasks_presented, 0)) *
        100
      : 0;
  const avgLatency =
    sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + s.avg_latency_ms, 0) / sessions.length)
      : 0;

  return (
    <div className="min-h-screen bg-[#F8F6F0] p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[#2C3E50]">Sahāy Caregiver Portal</h1>
        <p className="text-[#2C3E50]/80 text-lg mt-1">Patient: {patient.name}</p>
      </div>

      {/* Vital Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatBox label="GDS Stage" value={stage} icon={<Brain size={26} />} accent subtitle={stageLabel} />
        <StatBox label="Demitokens" value={patient.demitoken_balance} icon={<Coins size={26} />} accent subtitle="Balance" />
        <StatBox label="Active Streak" value={patient.streak_days} icon={<Flame size={26} />} accent subtitle="Days" />
        <StatBox label="Accuracy" value={`${Math.round(accuracyRate)}%`} icon={<Target size={26} />} subtitle="Last 10 sessions" />
      </div>

      {/* Overview Metrics */}
      <Card title="Cognitive Health Overview" className="mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-[#2C3E50]">{sessions.length}</div>
            <div className="text-sm text-[#2C3E50]/70">Sessions Recorded</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#E67E22]">{Math.round(avgLatency)}ms</div>
            <div className="text-sm text-[#2C3E50]/70">Avg Touch Latency</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#2C3E50]">{latestSession?.difficulty_level || 0}</div>
            <div className="text-sm text-[#2C3E50]/70">Current Difficulty</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${stageColor}`}>{latestSession?.tasks_completed_cleanly || 0}/{latestSession?.tasks_presented || 0}</div>
            <div className="text-sm text-[#2C3E50]/70">Clean Tasks (Latest)</div>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ActionButton label="Analytics Dashboard" icon={<Activity size={20} />} onClick={() => onNavigate('analytics')} />
        <ActionButton label="Media Manager" icon={<Camera size={20} />} onClick={() => onNavigate('media')} />
        <ActionButton label="Geofence Map" icon={<MapPin size={20} />} onClick={() => onNavigate('geofence')} />
      </div>
    </div>
  );
}
