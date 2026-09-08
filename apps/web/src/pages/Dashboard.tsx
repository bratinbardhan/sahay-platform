import { useEffect, useState } from 'react';
import type { User } from '@sahay/types';
import { Activity, Brain, Camera, Coins, Flame, Images, LogOut, MapPin, Target, AlertTriangle } from 'lucide-react';
import { ActionButton } from '@/components/ActionButton';
import { Card } from '@/components/Card';
import { StatBox } from '@/components/StatBox';
import { TierBadge } from '@/components/TierBadge';
import { SyncStatusIndicator } from '../components/SyncStatusIndicator';


import { useCaretakerPatient } from '@/lib/useCaretakerPatient';
import { usePatientAnalytics } from '@/lib/usePatientAnalytics';
import { useGameplaySessions } from '@/lib/useGameplaySessions';
import { GDS_STAGE_LABELS, getGdsStageColor } from '@/lib/gdsUtils';
import { sendHeartbeat } from '@/lib/adminApi';

import { CognitiveTrendChart } from './charts/CognitiveTrendChart';
import { SessionPerformanceChart } from './charts/SessionPerformanceChart';

interface DashboardProps {
  user: User;
  token: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function Dashboard({ user, token, onNavigate, onLogout }: DashboardProps) {


  const [activeAlert, setActiveAlert] = useState<any | null>(null);

  // WebSocket for emergency alerts
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/api/v1/emergency/ws?token=${token}`);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "EMERGENCY_SOS") {
          setActiveAlert(data);
          new Audio('/siren.mp3').play().catch(() => {});
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };
    return () => ws.close();
  }, [token]);

  const handleResolve = async (status: 'ACKNOWLEDGED' | 'RESOLVED') => {
    if (!activeAlert) return;
    // Call API to resolve
    await fetch(`http://localhost:8000/api/v1/emergency/${activeAlert.alert_id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ pin: '0000', resolved_by: `caretaker:${status.toLowerCase()}` })
    });
    setActiveAlert(null);
  };

  // Live telemetry: caretaker's patient + DDA history + paginated session logs.
  const { patient, isDemo: patientIsDemo } = useCaretakerPatient(token);
  const { ddaHistory, cognitiveSummary, isDemo: analyticsIsDemo } = usePatientAnalytics(
    token,
    patient?.id ?? null
  );
  const { sessions, isDemo: sessionsIsDemo } = useGameplaySessions(token, patient?.id ?? null);

  const isDemo = patientIsDemo || analyticsIsDemo || sessionsIsDemo;

  // Telemetry: heartbeat on mount + every 60s so the admin console sees this
  // caretaker as "online". Failures are silent (offline / server unreachable).
  useEffect(() => {
    void sendHeartbeat(token);
    const interval = window.setInterval(() => {
      void sendHeartbeat(token);
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [token]);

      <div className="flex justify-end mb-4">
        <SyncStatusIndicator lastSyncTimestamp={new Date()} />
      </div>

  if (!patient) {
    return (
      <div className="flex min-h-screen bg-[#F8F6F0] items-center justify-center">
        <p className="text-[#2C3E50] text-lg">Loading patient portal…</p>
      {activeAlert && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-red-600 text-white p-8 rounded-xl max-w-lg w-full">
            <h2 className="text-3xl font-bold flex items-center gap-2"><AlertTriangle /> EMERGENCY SOS</h2>
            {patient && <p className="text-xl">Patient {(patient as any).name} has triggered an SOS!</p>}
            <p>Reason: {activeAlert.trigger_reason}</p>
            <p>Coordinates: {activeAlert.latitude}, {activeAlert.longitude}</p>
            <div className="mt-6 flex gap-4">
              <button onClick={() => handleResolve('ACKNOWLEDGED')} className="bg-white text-red-600 px-4 py-2 rounded">Acknowledge</button>
              <button onClick={() => handleResolve('RESOLVED')} className="bg-black text-white px-4 py-2 rounded">Resolve</button>
            </div>
          </div>
        </div>
      )}

      </div>
    );
  }

  const stage = patient.assigned_gds_stage;
  const stageLabel = GDS_STAGE_LABELS[stage] || 'Unknown';
  const stageColor = getGdsStageColor(stage);

  // Session records arrive newest-first (page 1 of the live endpoint).
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

  const recentSessions = sessions.slice(0, 5);

  return (
    <div className="min-h-screen bg-[#F8F6F0] p-4 sm:p-6 md:p-8 animate-fade-in">
      {/* Navigation bar with account role + tier status */}
      <nav className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#2C3E50] bg-[#FFFCF6] px-4 py-3 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none text-[#E67E22]">✦</span>
          <span className="font-bold text-xl text-[#2C3E50]">Sahāy Caregiver Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-sm text-[#2C3E50]/80">{user.full_name}</span>
          <TierBadge tier={user.tier} />
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2 rounded-xl border-2 border-[#2C3E50] bg-[#F8F6F0] px-3 py-1.5 text-sm font-semibold text-[#2C3E50] hover:bg-[#edeae3] transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </nav>

      {/* Header */}
      <div className="mb-6 mt-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#2C3E50]">Patient Overview</h1>
          <p className="text-[#2C3E50]/80 text-base sm:text-lg mt-1">Patient: {patient.name}</p>
        </div>
        {isDemo && (
          <span className="rounded-full border-2 border-[#E67E22] bg-[#FFFCF6] px-3 py-1 text-xs font-semibold text-[#E67E22]">
            Demo data — live telemetry unavailable
          </span>
        )}
      </div>

      {/* Vital Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 animate-fade-up">
        <StatBox label="GDS Stage" value={stage} icon={<Brain size={26} />} accent subtitle={stageLabel} />
        <StatBox label="Demitokens" value={patient.demitoken_balance} icon={<Coins size={26} />} accent subtitle="Balance" />
        <StatBox label="Active Streak" value={patient.streak_days} icon={<Flame size={26} />} accent subtitle="Days" />
        <StatBox label="Accuracy" value={`${Math.round(accuracyRate)}%`} icon={<Target size={26} />} subtitle="Last 10 sessions" />
      </div>

      {/* Cognitive Trend + Daily Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 animate-fade-up">
        <Card title="Cognitive Trend" className="lg:col-span-2">
          <CognitiveTrendChart points={ddaHistory?.points ?? []} />
        </Card>
        <Card title="Daily Activity Log">
          <ul className="divide-y divide-[#2C3E50]/20">
            {recentSessions.map((session) => (
              <li key={session.session_log_id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#2C3E50] truncate">
                    {session.game_module_id.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-[#2C3E50]/60">
                    {new Date(session.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-bold text-[#E67E22]">
                  {Math.round(session.accuracy_pct)}%
                </span>
              </li>
            ))}
            {recentSessions.length === 0 && (
              <li className="py-2.5 text-sm text-[#2C3E50]/60">No sessions recorded yet.</li>
            )}
          </ul>
        </Card>
      </div>

      {/* Session Performance Breakdown across game modules */}
      <Card title="Session Performance Breakdown" className="mb-6 animate-fade-up">
        <SessionPerformanceChart sessions={sessions} />
      </Card>

      {/* Cognitive Summary (last 7 days vs previous 7 days) */}
      {cognitiveSummary && (
        <Card title="Cognitive Summary — 7 Day Trend" className="mb-6 animate-fade-up">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div
                className={`text-2xl font-bold ${
                  cognitiveSummary.trend_direction === 'IMPROVING'
                    ? 'text-[#27AE60]'
                    : cognitiveSummary.trend_direction === 'DECLINING'
                      ? 'text-[#E67E22]'
                      : 'text-[#2C3E50]'
                }`}
              >
                {cognitiveSummary.trend_direction.replace('_', ' ')}
              </div>
              <div className="text-sm text-[#2C3E50]/70">
                {cognitiveSummary.accuracy_delta_pct >= 0 ? '+' : ''}
                {cognitiveSummary.accuracy_delta_pct}% accuracy
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#2C3E50]">
                {cognitiveSummary.stability_score.toFixed(0)}
              </div>
              <div className="text-sm text-[#2C3E50]/70">Stability Score</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#E67E22]">
                {cognitiveSummary.recommended_difficulty}
              </div>
              <div className="text-sm text-[#2C3E50]/70">Recommended Difficulty</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#2C3E50]">
                {cognitiveSummary.last_7_days.sessions}
              </div>
              <div className="text-sm text-[#2C3E50]/70">Sessions (Last 7 Days)</div>
            </div>
          </div>
        </Card>
      )}

      {/* Overview Metrics */}
      <Card title="Cognitive Health Overview" className="mb-6 animate-fade-up">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-up">
        <ActionButton label="Analytics Dashboard" icon={<Activity size={20} />} onClick={() => onNavigate('analytics')} />
        <ActionButton label="Media Manager" icon={<Camera size={20} />} onClick={() => onNavigate('media')} />
        <ActionButton label="Memory Album" icon={<Images size={20} />} onClick={() => onNavigate('reminiscence')} />
        <ActionButton label="Geofence Map" icon={<MapPin size={20} />} onClick={() => onNavigate('geofence')} />
      </div>
    </div>
  );
}
