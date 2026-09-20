import { useEffect, useState } from 'react';
import type { User } from '@sahay/types';
import {
  Activity,
  AlertTriangle,
  Brain,
  Camera,
  Clock,
  Coins,
  Images,
  MessageSquare,
  Flame,
  LogOut,
  MapPin,
  Phone,
  Shield,
} from 'lucide-react';
import { ActionButton } from '@/components/ActionButton';
import { Card } from '@/components/Card';
import { StatBox } from '@/components/StatBox';
import { TierBadge } from '@/components/TierBadge';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { SubscriptionModal } from '@/components/SubscriptionModal';

import { useCaretakerPatient } from '@/lib/useCaretakerPatient';
import { usePatientAnalytics } from '@/lib/usePatientAnalytics';
import { useGameplaySessions } from '@/lib/useGameplaySessions';
import { GDS_STAGE_LABELS, getGdsStageColor } from '@/lib/gdsUtils';
import { sendHeartbeat } from '@/lib/adminApi';
import {
  DEMO_CAREGIVER_CONTACT,
  getDemoPatientTimestamps,
} from '@/lib/demoSeed';


interface DashboardProps {
  user: User;
  token: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

interface EmergencySosPayload {
  event: string;
  alert_id: string;
  trigger_reason: string;
  latitude: number;
  longitude: number;
}

function isEmergencySos(value: unknown): value is EmergencySosPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.event === 'EMERGENCY_SOS' &&
    typeof record.alert_id === 'string' &&
    typeof record.trigger_reason === 'string' &&
    typeof record.latitude === 'number' &&
    typeof record.longitude === 'number'
  );
}

export function Dashboard({ user, token, onNavigate, onLogout }: DashboardProps) {
  const [activeAlert, setActiveAlert] = useState<EmergencySosPayload | null>(null);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://localhost:8000/api/v1/emergency/ws?token=${token}`);
    ws.onmessage = (event) => {
      try {
        const data: unknown = JSON.parse(event.data);
        if (isEmergencySos(data)) {
          setActiveAlert(data);
        }
      } catch {
        // Ignore malformed frames from a prototype gateway.
      }
    };
    return () => ws.close();
  }, [token]);

  const handleResolve = async (status: 'ACKNOWLEDGED' | 'RESOLVED') => {
    if (!activeAlert) {
      return;
    }
    await fetch(`http://localhost:8000/api/v1/emergency/${activeAlert.alert_id}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pin: '0000', resolved_by: `caretaker:${status.toLowerCase()}` }),
    });
    setActiveAlert(null);
  };

  const { patient, isDemo: patientIsDemo } = useCaretakerPatient(token);
  const { cognitiveSummary, isDemo: analyticsIsDemo } = usePatientAnalytics(
    token,
    patient?.id ?? null
  );
  const { sessions, isDemo: sessionsIsDemo } = useGameplaySessions(token, patient?.id ?? null, 14);

  const isDemo = patientIsDemo || analyticsIsDemo || sessionsIsDemo;
  const timestamps = getDemoPatientTimestamps();

  useEffect(() => {
    void sendHeartbeat(token);
    const interval = window.setInterval(() => {
      void sendHeartbeat(token);
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [token]);

  if (!patient) {
    return (
      <div className="flex min-h-screen bg-sahay-bg items-center justify-center" data-palette="caretaker">
        <p className="text-sahay-ink text-lg">Loading patient portal…</p>
      </div>
    );
  }

  const stage = patient.assigned_gds_stage;
  const stageLabel = GDS_STAGE_LABELS[stage] || 'Unknown';
  const stageColor = getGdsStageColor(stage);
  const stability = cognitiveSummary?.stability_score ?? 88;
  const avgLatency =
    sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + s.avg_latency_ms, 0) / sessions.length)
      : 420;
  const pendingQueue = isDemo ? 3 : 0;
  const latencyTrend = avgLatency <= 420 ? 'improving' : 'watch';

  return (
    <div className="min-h-screen bg-sahay-bg p-4 sm:p-6 md:p-8 animate-fade-in" data-palette="caretaker">
      {activeAlert ? (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-sahay-alert text-white p-8 rounded-xl max-w-lg w-full shadow-caretaker-card">
            <h2 className="text-3xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 md:w-6 md:h-6" /> EMERGENCY SOS
            </h2>
            <p className="text-xl mt-2">Patient {patient.name} has triggered an SOS.</p>
            <p>Reason: {activeAlert.trigger_reason}</p>
            <p>
              Coordinates: {activeAlert.latitude}, {activeAlert.longitude}
            </p>
            <div className="mt-6 flex gap-4">
              <button
                type="button"
                onClick={() => void handleResolve('ACKNOWLEDGED')}
                className="bg-sahay-surface-raised text-sahay-alert px-4 py-2 rounded"
              >
                Acknowledge
              </button>
              <button
                type="button"
                onClick={() => void handleResolve('RESOLVED')}
                className="bg-sahay-ink text-white px-4 py-2 rounded"
              >
                Resolve
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <nav className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none text-sahay-accent">✦</span>
          <span className="font-semibold text-lg text-slate-900">Sahāy Caregiver Command Center</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SyncStatusIndicator
            lastSyncTimestamp={timestamps.last_sync_at}
            pendingQueueCount={pendingQueue}
            connected={!isDemo}
          />
          <span className="hidden sm:inline text-sm text-sahay-ink/80">{user.full_name}</span>
          <TierBadge tier={user.tier} onClick={() => setSubscriptionOpen(true)} />
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <LogOut className="w-5 h-5 md:w-6 md:h-6" />
            Sign out
          </button>
        </div>
      </nav>

      {cognitiveSummary ? (
        <Card title="Cognitive Summary — 7 Day Trend" className="mt-6 mb-6 bg-white border border-slate-200 shadow-sm animate-slide-up">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div><div className="text-2xl font-bold text-slate-900">{cognitiveSummary.trend_direction.replace('_', ' ')}</div><div className="text-sm text-slate-600">{cognitiveSummary.accuracy_delta_pct >= 0 ? '+' : ''}{cognitiveSummary.accuracy_delta_pct}% accuracy</div></div>
            <div><div className="text-2xl font-bold text-slate-900">{cognitiveSummary.stability_score.toFixed(0)}%</div><div className="text-sm text-slate-600">Stability Score</div></div>
            <div><div className="text-2xl font-bold text-teal-700">{cognitiveSummary.recommended_difficulty}</div><div className="text-sm text-slate-600">Recommended Difficulty</div></div>
            <div><div className="text-2xl font-bold text-slate-900">{Math.round(cognitiveSummary.last_7_days.avg_latency_ms)}ms</div><div className="text-sm text-slate-600">Avg Latency (7 Days)</div></div>
          </div>
        </Card>
      ) : null}

      <div className="mb-6 mt-6 flex flex-wrap items-end justify-between gap-3 animate-slide-up">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Medical Overview</h1>
          <p className="text-slate-600 text-base sm:text-lg mt-1">
            {patient.name}, {patient.age} · last session{' '}
            {new Date(timestamps.last_session_at).toLocaleString('en-IN')}
          </p>
          <p className="text-sm text-sahay-muted mt-1 flex items-center gap-2">
            <Phone className="w-5 h-5 md:w-6 md:h-6" />
            {DEMO_CAREGIVER_CONTACT.relation}: {DEMO_CAREGIVER_CONTACT.name} ·{' '}
            {DEMO_CAREGIVER_CONTACT.phone}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center gap-2 rounded-full border-2 border-sahay-ink px-4 py-2 text-sm font-bold text-white shadow-caretaker-card"
            style={{ backgroundColor: stageColor }}
          >
            <Shield className="w-5 h-5 md:w-6 md:h-6" />
            GDS {stage} · {stageLabel}
          </span>
          {isDemo ? (
            <span className="rounded-full border-2 border-sahay-accent bg-sahay-surface px-3 py-1 text-xs font-semibold text-sahay-accent">
              Demo seed — 14-day GDS 3 telemetry
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          {
            label: 'GDS Stage',
            value: stage,
            icon: <Brain className="w-5 h-5 md:w-6 md:h-6" />,
            subtitle: stageLabel,
            delay: 0,
          },
          {
            label: 'Demitoken Balance',
            value: patient.demitoken_balance,
            icon: <Coins className="w-5 h-5 md:w-6 md:h-6" />,
            subtitle: 'Wallet',
            delay: 80,
          },
          {
            label: 'Stability Score',
            value: `${Math.round(stability)}%`,
            icon: <Flame className="w-5 h-5 md:w-6 md:h-6" />,
            subtitle: '14-day mood / load',
            delay: 160,
          },
          {
            label: 'Touch Latency',
            value: `${avgLatency}ms`,
            icon: <Clock className="w-5 h-5 md:w-6 md:h-6" />,
            subtitle: `${latencyTrend === 'improving' ? '↓' : '↑'} vs 14-day target`,
            delay: 240,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="animate-slide-up"
            style={{ animationDelay: `${card.delay}ms` }}
          >
            <StatBox
              label={card.label}
              value={card.value}
              icon={card.icon}
              accent
              subtitle={card.subtitle}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 animate-slide-up" style={{ animationDelay: '280ms' }}>
        <Card title="Emergency Help" className="bg-sahay-surface shadow-caretaker-card">
          <div className="space-y-3 text-sm text-sahay-ink">
            {[
              ['Ram Sharma', 'Primary Caregiver / Son', '+91 98620 44110'],
              ['Dr. S. K. Sen', 'Consultant Neurologist', '+91 94340 12345'],
              ['NEIGRIHMS Hospital Emergency / Cardiology', 'Shillong, Meghalaya', '+91 364 253 8025'],
              ['Shillong Civil Hospital Emergency Desk', 'Shillong, Meghalaya', '+91 364 222 2395'],
              ['Police Control Room Shillong', 'Shillong emergency response', '112'],
            ].map(([name, relation, phone]) => (
              <div key={phone} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="font-semibold">{name}</p>
                  <p className="text-slate-600">{relation}</p>
                  <a href={`tel:${phone.replace(/\s/g, '')}`} className="font-medium text-teal-700">{phone}</a>
                </div>
                <div className="flex gap-1">
                  <a href={`tel:${phone.replace(/\s/g, '')}`} aria-label={`Call ${name}`} className="rounded-md p-2 text-teal-700 hover:bg-teal-50"><Phone className="h-4 w-4" /></a>
                  <a href={`sms:${phone.replace(/\s/g, '')}`} aria-label={`SMS ${name}`} className="rounded-md p-2 text-teal-700 hover:bg-teal-50"><MessageSquare className="h-4 w-4" /></a>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {subscriptionOpen ? <SubscriptionModal onClose={() => setSubscriptionOpen(false)} /> : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-slide-up" style={{ animationDelay: '520ms' }}>
        <ActionButton
          label="Analytics Dashboard"
          icon={<Activity className="w-5 h-5 md:w-6 md:h-6" />}
          onClick={() => onNavigate('analytics')}
        />
        <ActionButton
          label="Media Manager"
          icon={<Camera className="w-5 h-5 md:w-6 md:h-6" />}
          onClick={() => onNavigate('media')}
        />
        <ActionButton
          label="Memory Album"
          icon={<Images className="w-5 h-5 md:w-6 md:h-6" />}
          onClick={() => onNavigate('reminiscence')}
        />
        <ActionButton
          label="Geofence Map"
          icon={<MapPin className="w-5 h-5 md:w-6 md:h-6" />}
          onClick={() => onNavigate('geofence')}
        />
      </div>
    </div>
  );
}
