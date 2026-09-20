import { useEffect, useState } from 'react';
import type { User } from '@sahay/types';
import {
  Activity,
  AlertTriangle,
  Brain,
  Camera,
  Images,
  LogOut,
  Bell,
  LayoutDashboard,
  Mic,
  Play,
  Plus,
  User as UserIcon,
  Pill,
  CheckCircle2,
  CalendarDays,
  X,
  Droplets,
  HeartPulse,
  CupSoda,
} from 'lucide-react';
import { DdaDifficultyCurve } from './charts/DdaDifficultyCurve';
import { ActivityHeatmap } from './charts/ActivityHeatmap';

import { useCaretakerPatient } from '@/lib/useCaretakerPatient';
import { usePatientAnalytics } from '@/lib/usePatientAnalytics';
import { useGameplaySessions } from '@/lib/useGameplaySessions';
import { sendHeartbeat } from '@/lib/adminApi';
import {
  getDemoActivityHeatmap,
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

export function Dashboard({ user: _user, token, onNavigate, onLogout }: DashboardProps) {
  const [activeAlert, setActiveAlert] = useState<EmergencySosPayload | null>(null);
  const [isMedModalOpen, setMedModalOpen] = useState(false);
  const [hydrationStats, setHydrationStats] = useState({ medication: 100, hydration: 75, water: 90, participation: 60 });

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
  const { cognitiveSummary, ddaHistory, isDemo: analyticsIsDemo } = usePatientAnalytics(
    token,
    patient?.id ?? null
  );
  const { isDemo: sessionsIsDemo } = useGameplaySessions(token, patient?.id ?? null, 14);

  const isDemo = patientIsDemo || analyticsIsDemo || sessionsIsDemo;

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

  return (
    <div className="flex bg-[#FDFBF7]" style={{ height: '100vh', overflow: 'hidden' }} data-palette="caretaker">
      {/* Sidebar */}
      <aside className="w-20 bg-white shadow-sm flex flex-col items-center py-6 border-r border-[#E2E8F0]/30 shrink-0 z-20">
        <div className="w-12 h-12 bg-[#1E293B] rounded-xl flex items-center justify-center mb-8">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 flex flex-col items-center space-y-4">
          <button className="w-12 h-12 bg-[#F5E6D3] rounded-xl flex items-center justify-center text-[#1E293B] transition-colors shadow-sm">
            <LayoutDashboard className="w-6 h-6" />
          </button>
          <button className="w-12 h-12 bg-transparent hover:bg-slate-50 rounded-xl flex items-center justify-center text-[#1F2937] transition-colors" onClick={() => onNavigate('analytics')}>
            <Activity className="w-6 h-6" />
          </button>
          <button className="w-12 h-12 bg-transparent hover:bg-slate-50 rounded-xl flex items-center justify-center text-[#1F2937] transition-colors" onClick={() => onNavigate('media')}>
            <Images className="w-6 h-6" />
          </button>
          <button className="w-12 h-12 bg-transparent hover:bg-slate-50 rounded-xl flex items-center justify-center text-[#1F2937] transition-colors" onClick={() => onNavigate('reminiscence')}>
            <Camera className="w-6 h-6" />
          </button>
        </div>
        <button onClick={onLogout} className="w-12 h-12 hover:bg-slate-50 rounded-xl flex items-center justify-center text-slate-500 transition-colors mt-auto">
          <LogOut className="w-6 h-6" />
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className="flex items-center justify-between px-8 py-6 shrink-0">
          <div className="text-[#1F2937] font-medium text-lg">Caretaker</div>
          <div className="flex items-center space-x-6">
            <Bell className="w-6 h-6 text-[#1F2937]" />
            <div className="w-10 h-10 bg-slate-300 rounded-full overflow-hidden flex items-center justify-center shadow-sm">
              <UserIcon className="w-6 h-6 text-slate-500" />
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Area */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          {/* Dashboard Title Area */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-[#1F2937]">Dashboard</h1>
            <button className="bg-[#1E293B] text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-transform active:scale-95 flex items-center space-x-2">
              <span>Go Dashboard</span>
            </button>
          </div>

          {activeAlert ? (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-sahay-alert text-white p-8 rounded-xl max-w-lg w-full shadow-caretaker-card">
                <h2 className="text-3xl font-bold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 md:w-6 md:h-6" /> EMERGENCY SOS
                </h2>
                <p className="text-xl mt-2">Patient {patient.name} has triggered an SOS.</p>
                <p>Reason: {activeAlert.trigger_reason}</p>
                <p>Coordinates: {activeAlert.latitude}, {activeAlert.longitude}</p>
                <div className="mt-6 flex gap-4">
                  <button type="button" onClick={() => void handleResolve('ACKNOWLEDGED')} className="bg-sahay-surface-raised text-sahay-alert px-4 py-2 rounded">Acknowledge</button>
                  <button type="button" onClick={() => void handleResolve('RESOLVED')} className="bg-sahay-ink text-white px-4 py-2 rounded">Resolve</button>
                </div>
              </div>
            </div>
          ) : null}

          {isMedModalOpen ? (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg text-[#1F2937]">Schedule Medication</h3>
                  <button onClick={() => setMedModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Medication Name</label>
                    <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1E293B]" placeholder="e.g. Donepezil" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                    <input type="time" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1E293B]" />
                  </div>
                </div>
                <button onClick={() => setMedModalOpen(false)} className="w-full bg-[#1E293B] text-white py-2.5 rounded-lg font-medium text-sm hover:bg-[#334155] transition-colors">Save Schedule</button>
              </div>
            </div>
          ) : null}

          {/* Exactly Replicated Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Card 1: Medication Scheduling */}
            <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              <h3 className="font-semibold text-lg text-[#1F2937] mb-8">Medication Scheduling</h3>
              <div className="flex justify-between items-center mb-8 px-4 relative w-full">
                <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-[#F5E6D3] -z-0 -translate-y-1/2"></div>
                <div className="w-10 h-10 bg-[#1E293B] rounded-full flex items-center justify-center text-white shrink-0 shadow-sm z-10"><Pill className="w-5 h-5" /></div>
                <div className="w-10 h-10 bg-[#F5E6D3] rounded-full flex items-center justify-center text-[#1E293B] shrink-0 z-10"><CheckCircle2 className="w-5 h-5" /></div>
                <div className="w-10 h-10 bg-[#F5E6D3] rounded-full flex items-center justify-center text-[#1E293B] shrink-0 z-10"><CalendarDays className="w-5 h-5" /></div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#1E293B]"></div>
                    <span className="text-sm font-medium text-slate-700">Medication A</span>
                  </div>
                  <span className="text-sm text-slate-500 font-medium">12:08 AM</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#F5E6D3]"></div>
                    <span className="text-sm font-medium text-slate-700">Medication B</span>
                  </div>
                  <span className="text-sm text-slate-500 font-medium">7:30 PM</span>
                </div>
              </div>
              <button onClick={() => setMedModalOpen(true)} className="w-full mt-5 bg-[#1E293B] text-white py-3 rounded-xl font-medium text-sm hover:bg-[#334155] transition-colors">Schedule Medication</button>
            </div>

            {/* Card 2: Hydration Monitoring */}
            <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col">
              <h3 className="font-semibold text-lg text-[#1F2937] mb-8">Hydration Monitoring</h3>
              <div className="flex justify-between items-center mb-8 px-4 relative">
                <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-[#F5E6D3] -z-0 -translate-y-1/2"></div>
                <div className="w-10 h-10 bg-[#F5E6D3] rounded-full flex items-center justify-center text-[#1E293B] z-10">
                  <Droplets className="w-5 h-5" />
                </div>
                <div className="w-10 h-10 bg-[#F5E6D3] rounded-full flex items-center justify-center text-[#1E293B] z-10">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div className="w-10 h-10 bg-[#F5E6D3] rounded-full flex items-center justify-center text-[#1E293B] z-10">
                  <CupSoda className="w-5 h-5" />
                </div>
              </div>
              <div className="space-y-4 mt-auto">
                {[
                  { key: 'medication', label: "Medication" },
                  { key: 'hydration', label: "Hydration" },
                  { key: 'water', label: "Water intake" },
                  { key: 'participation', label: "Participations" }
                ].map((row) => (
                  <div key={row.key} className="flex items-center justify-between text-sm">
                    <span className="w-28 text-[#1F2937] font-medium text-xs">{row.label}</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={hydrationStats[row.key as keyof typeof hydrationStats]}
                      onChange={(e) => setHydrationStats(prev => ({ ...prev, [row.key]: parseInt(e.target.value) }))}
                      className="flex-1 ml-4 h-2 rounded-full appearance-none cursor-pointer accent-[#1E293B]"
                      style={{
                        background: `linear-gradient(to right, #1E293B 0%, #1E293B ${hydrationStats[row.key as keyof typeof hydrationStats]}%, #E2E8F0 ${hydrationStats[row.key as keyof typeof hydrationStats]}%, #E2E8F0 100%)`
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3: Family Media Uploads */}
            <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              <h3 className="font-semibold text-lg text-[#1F2937] mb-6">Family Media Uploads</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="aspect-square bg-[#F5E6D3] rounded-[16px] flex items-center justify-center text-[#1E293B]"><Images className="w-6 h-6" /></div>
                <div className="aspect-square bg-[#F5E6D3] rounded-[16px] flex items-center justify-center text-[#1E293B]"><Mic className="w-6 h-6" /></div>
                <div className="aspect-square bg-[#F5E6D3] rounded-[16px] flex items-center justify-center text-[#1E293B]"><Play className="w-6 h-6" /></div>
                <div className="aspect-square bg-slate-200 rounded-[16px] flex items-center justify-center overflow-hidden"><img src="https://i.pravatar.cc/150?u=1" alt="thumb1" className="w-full h-full object-cover" /></div>
                <div className="aspect-square bg-slate-200 rounded-[16px] flex items-center justify-center overflow-hidden"><img src="https://i.pravatar.cc/150?u=2" alt="thumb2" className="w-full h-full object-cover" /></div>
                <div className="aspect-square bg-[#F5E6D3] rounded-[16px] flex flex-col items-center justify-center text-[#1E293B] font-medium text-xs"><Plus className="w-5 h-5 mb-1" /> Add</div>
              </div>
            </div>
          </div>

          {/* Preserve original charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              <h3 className="font-semibold text-lg text-[#1F2937] mb-4">Activity rhythm</h3>
              <ActivityHeatmap cells={isDemo ? getDemoActivityHeatmap() : []} />
            </div>
            <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              <h3 className="font-semibold text-lg text-[#1F2937] mb-4">DDA Difficulty & Reaction Curve</h3>
              <DdaDifficultyCurve points={ddaHistory?.points ?? []} recommendedDifficulty={cognitiveSummary?.recommended_difficulty ?? null} />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
