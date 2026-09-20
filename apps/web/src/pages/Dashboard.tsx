import { useEffect, useState, useRef } from 'react';
import type { User } from '@sahay/types';
import {
  Activity,
  AlertTriangle,
  Brain,
  Camera,
  Check,
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
  ShieldAlert,
  X,
  Zap,
  Droplets,
  HeartPulse,
  CupSoda,
  Phone,
  PhoneCall,
  MessageSquare,
  Coins,
  Flame,
  Clock,

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedImages(prev => [...prev, URL.createObjectURL(e.target.files![0])]);
    }
  };

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
            <div className="relative inline-block">
              <Bell onClick={() => { setIsAlertOpen(!isAlertOpen); setIsProfileOpen(false); }} className="w-6 h-6 text-[#1F2937] cursor-pointer" />
              {isAlertOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-[360px] bg-white rounded-2xl border border-slate-200/80 shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 bg-[#FAF8F5] border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1E293B] tracking-tight">Notifications</span>
                      <span className="text-[10px] font-semibold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-md">3 unread</span>
                    </div>
                    <button onClick={() => { }} className="text-[11px] font-medium text-slate-400 hover:text-slate-700 transition-colors">Mark all as read</button>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[340px] overflow-y-auto">
                    <div className="p-3.5 hover:bg-slate-50/70 transition-colors flex gap-3 items-start cursor-pointer">
                      <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5 border border-rose-100/60"><ShieldAlert className="w-3.5 h-3.5 stroke-[2]" /></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between w-full mb-0.5"><span className="text-[12px] font-bold text-[#1E293B]">Security Breach Blocked</span><span className="text-[10px] text-slate-400 font-medium">02:15 AM</span></div>
                        <p className="text-[11px] text-slate-500 leading-snug">Unrecognized device login attempt blocked from external IP.</p>
                      </div>
                    </div>
                    <div className="p-3.5 hover:bg-slate-50/70 transition-colors flex gap-3 items-start cursor-pointer">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5 border border-amber-100/60"><Pill className="w-3.5 h-3.5 stroke-[2]" /></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between w-full mb-0.5"><span className="text-[12px] font-bold text-[#1E293B]">Missed Medication Dose</span><span className="text-[10px] text-slate-400 font-medium">Yesterday</span></div>
                        <p className="text-[11px] text-slate-500 leading-snug">Scheduled 12:00 PM dose was not marked as taken by patient.</p>
                      </div>
                    </div>
                    <div className="p-3.5 hover:bg-slate-50/70 transition-colors flex gap-3 items-start cursor-pointer">
                      <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0 mt-0.5 border border-teal-100/60"><Activity className="w-3.5 h-3.5 stroke-[2]" /></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between w-full mb-0.5"><span className="text-[12px] font-bold text-[#1E293B]">Hydration Target Met</span><span className="text-[10px] text-slate-400 font-medium">01:30 AM</span></div>
                        <p className="text-[11px] text-slate-500 leading-snug">Nightly intake generated: target reached at 100% capacity.</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#FAF8F5] border-t border-slate-100 text-center">
                    <button className="text-[11px] font-semibold text-slate-600 hover:text-[#1E293B] transition-colors">View all audit logs &rarr;</button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <div onClick={() => { setIsProfileOpen(!isProfileOpen); setIsAlertOpen(false); }} className="w-10 h-10 bg-slate-300 rounded-full overflow-hidden flex items-center justify-center shadow-sm cursor-pointer">
                <UserIcon className="w-6 h-6 text-slate-500" />
              </div>
              {isProfileOpen && (
                <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 shadow-xl rounded-xl p-5 z-50">
                  <div className="mb-4">
                    <p className="font-bold text-sm text-[#1F2937]">Caretaker: Bratin Bardhan</p>
                    <p className="text-xs text-slate-500 mt-0.5">Phone: +91 98765 43210</p>
                  </div>
                  <div className="mb-4">
                    <p className="font-bold text-sm text-[#1F2937]">Patient: Robert Jenkins</p>
                    <p className="text-xs text-slate-500 mt-0.5">Age: 78, Condition: Hypertension</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Current Plan: <span className="font-bold text-[#1E293B]">Basic (Free)</span></p>
                  </div>
                  <hr className="my-4 border-slate-100" />
                  <div>
                    <div className="flex items-center text-indigo-600 font-bold mb-2">
                      <Zap className="w-4 h-4 mr-1 fill-indigo-600" /> UPGRADE TO PRO
                    </div>
                    <ul className="space-y-2 mb-3">
                      <li className="flex items-start text-xs text-slate-600"><Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" /> Real-time vital anomaly streaming</li>
                      <li className="flex items-start text-xs text-slate-600"><Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" /> 24/7 Priority Emergency Dispatch</li>
                      <li className="flex items-start text-xs text-slate-600"><Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" /> Advanced AI Health Trend Insights</li>
                      <li className="flex items-start text-xs text-slate-600"><Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" /> Multi-caretaker account syncing</li>
                    </ul>
                    <p className="text-[10px] italic text-slate-400 mb-3">...and many more exclusive features.</p>
                    <button className="w-full bg-[#1E293B] text-white py-2 rounded-lg mt-3 text-sm font-medium hover:bg-[#334155] transition-colors">Upgrade Now</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Area */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          {/* Dashboard Title Area */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-[#1F2937]">Dashboard</h1>
            <button onClick={() => setIsEmergencyOpen(true)} className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-xl font-medium text-[13px] flex items-center transition-colors">
              <Phone className="w-4 h-4 mr-2" /> Emergency Contact
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

          {isEmergencyOpen ? (
            <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
              <div className="bg-white w-[600px] rounded-2xl p-6 shadow-xl relative">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-[#1E293B]">Care Circle & Emergency Help</h3>
                  <button onClick={() => setIsEmergencyOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="border border-slate-200 bg-white hover:border-slate-300 rounded-xl p-4 mb-3 flex justify-between items-center transition-all">
                  <div>
                    <p className="text-[15px] font-bold text-[#1E293B]">Ram Sharma</p>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5">Primary Caregiver / Son</p>
                    <p className="text-sm font-bold text-teal-800 tracking-wide mt-1">+91 98620 44110</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <a href="tel:+919862044110" className="w-10 h-10 rounded-full bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm" title="Call">
                      <PhoneCall className="w-4 h-4" />
                    </a>
                    <button className="w-10 h-10 rounded-full bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm" title="Message">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="border border-slate-200 bg-white hover:border-slate-300 rounded-xl p-4 mb-3 flex justify-between items-center transition-all">
                  <div>
                    <p className="text-[15px] font-bold text-[#1E293B]">Dr. S. K. Sen</p>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5">Consultant Neurologist</p>
                    <p className="text-sm font-bold text-teal-800 tracking-wide mt-1">+91 94340 12345</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <a href="tel:+919434012345" className="w-10 h-10 rounded-full bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm" title="Call">
                      <PhoneCall className="w-4 h-4" />
                    </a>
                    <button className="w-10 h-10 rounded-full bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm" title="Message">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="border border-slate-200 bg-white hover:border-slate-300 rounded-xl p-4 mb-3 flex justify-between items-center transition-all">
                  <div>
                    <p className="text-[15px] font-bold text-[#1E293B]">NEIGRIHMS Hospital Emergency / Cardiology</p>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5">Shillong, Meghalaya</p>
                    <p className="text-sm font-bold text-teal-800 tracking-wide mt-1">+91 364 253 8025</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <a href="tel:+913642538025" className="w-10 h-10 rounded-full bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm" title="Call">
                      <PhoneCall className="w-4 h-4" />
                    </a>
                    <button className="w-10 h-10 rounded-full bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm" title="Message">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="border border-slate-200 bg-white hover:border-slate-300 rounded-xl p-4 mb-3 flex justify-between items-center transition-all">
                  <div>
                    <p className="text-[15px] font-bold text-[#1E293B]">Shillong Civil Hospital Emergency Desk</p>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5">Shillong, Meghalaya</p>
                    <p className="text-sm font-bold text-teal-800 tracking-wide mt-1">+91 364 222 2395</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <a href="tel:+913642222395" className="w-10 h-10 rounded-full bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm" title="Call">
                      <PhoneCall className="w-4 h-4" />
                    </a>
                    <button className="w-10 h-10 rounded-full bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm" title="Message">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="border border-slate-200 bg-white hover:border-slate-300 rounded-xl p-4 mb-3 flex justify-between items-center transition-all">
                  <div>
                    <p className="text-[15px] font-bold text-[#1E293B]">Police Control Room Shillong</p>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5">Shillong emergency response</p>
                    <p className="text-sm font-bold text-teal-800 tracking-wide mt-1">112</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <a href="tel:112" className="w-10 h-10 rounded-full bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm" title="Call">
                      <PhoneCall className="w-4 h-4" />
                    </a>
                    <button className="w-10 h-10 rounded-full bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm" title="Message">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
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
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
                <div onClick={() => fileInputRef.current?.click()} className="aspect-square bg-[#F5E6D3] rounded-[16px] flex items-center justify-center text-[#1E293B] cursor-pointer transition-transform active:scale-95 hover:shadow-sm"><Images className="w-6 h-6" /></div>
                <div onClick={() => setIsRecording(!isRecording)} className={`aspect-square rounded-[16px] flex items-center justify-center cursor-pointer transition-transform active:scale-95 hover:shadow-sm ${isRecording ? 'bg-red-50 text-red-600 animate-pulse ring-2 ring-red-400' : 'bg-[#F5E6D3] text-[#1E293B]'}`}><Mic className="w-6 h-6" /></div>
                <div onClick={() => onNavigate('reminiscence')} className="aspect-square bg-[#F5E6D3] rounded-[16px] flex items-center justify-center text-[#1E293B] cursor-pointer transition-transform active:scale-95 hover:shadow-sm"><Play className="w-6 h-6" /></div>

                <div className="aspect-square rounded-[16px] overflow-hidden flex items-center justify-center bg-[#F5E6D3]/60 cursor-pointer transition-transform active:scale-95 hover:shadow-sm">
                  {uploadedImages[0] ? <img src={uploadedImages[0]} alt="thumb0" className="w-full h-full object-cover" /> : <img src="https://api.dicebear.com/9.x/micah/svg?seed=Aneka&backgroundColor=f5e6d3" alt="Family member" className="w-full h-full object-cover" />}
                </div>
                <div className="aspect-square rounded-[16px] overflow-hidden flex items-center justify-center bg-[#F5E6D3]/60 cursor-pointer transition-transform active:scale-95 hover:shadow-sm">
                  {uploadedImages[1] ? <img src={uploadedImages[1]} alt="thumb1" className="w-full h-full object-cover" /> : <img src="https://api.dicebear.com/9.x/micah/svg?seed=Felix&backgroundColor=f5e6d3" alt="Family member" className="w-full h-full object-cover" />}
                </div>

                <div onClick={() => fileInputRef.current?.click()} className="aspect-square bg-[#F5E6D3] rounded-[16px] flex flex-col items-center justify-center text-[#1E293B] font-medium text-xs cursor-pointer transition-transform active:scale-95 hover:shadow-sm"><Plus className="w-5 h-5 mb-1" /> Add</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-[#D1F2EB]/60 hover:bg-[#D1F2EB]/80 transition-colors border border-[#BCE7DE] rounded-[18px] p-5 flex flex-col items-center justify-center text-center shadow-sm">
              <Brain className="w-6 h-6 text-[#0E7490] mb-2" />
              <div className="text-3xl font-bold text-[#0E7490]">3</div>
              <div className="text-[11px] font-bold tracking-wider text-[#155E75] uppercase">GDS STAGE</div>
              <div className="text-xs font-medium text-[#475569] mt-1">Mild</div>
            </div>
            <div className="bg-[#D1F2EB]/60 hover:bg-[#D1F2EB]/80 transition-colors border border-[#BCE7DE] rounded-[18px] p-5 flex flex-col items-center justify-center text-center shadow-sm">
              <Coins className="w-6 h-6 text-[#0E7490] mb-2" />
              <div className="text-3xl font-bold text-[#0E7490]">186</div>
              <div className="text-[11px] font-bold tracking-wider text-[#155E75] uppercase">DEMITOKEN BALANCE</div>
              <div className="text-xs font-medium text-[#475569] mt-1">Local Wallet Balance</div>
            </div>
            <div className="bg-[#D1F2EB]/60 hover:bg-[#D1F2EB]/80 transition-colors border border-[#BCE7DE] rounded-[18px] p-5 flex flex-col items-center justify-center text-center shadow-sm">
              <Flame className="w-6 h-6 text-[#0E7490] mb-2" />
              <div className="text-3xl font-bold text-[#0E7490]">88%</div>
              <div className="text-[11px] font-bold tracking-wider text-[#155E75] uppercase">STABILITY SCORE</div>
              <div className="text-xs font-medium text-[#475569] mt-1">14-day mood / load</div>
            </div>
            <div className="bg-[#D1F2EB]/60 hover:bg-[#D1F2EB]/80 transition-colors border border-[#BCE7DE] rounded-[18px] p-5 flex flex-col items-center justify-center text-center shadow-sm">
              <Clock className="w-6 h-6 text-[#0E7490] mb-2" />
              <div className="text-3xl font-bold text-[#0E7490]">427ms</div>
              <div className="text-[11px] font-bold tracking-wider text-[#155E75] uppercase">TOUCH LATENCY</div>
              <div className="text-xs font-medium text-[#475569] mt-1">↑ vs 14-day target</div>
            </div>
          </div>

          <div className="bg-[#FDFBF7] border border-[#F1E8DC] shadow-sm rounded-[18px] p-6 mt-4 mb-8">
            <h3 className="text-base font-bold text-[#1E293B] mb-4">Cognitive Summary — 7 Day Trend</h3>
            <div className="flex justify-between items-center text-center">
              <div>
                <div className="text-2xl font-extrabold text-[#1E293B]">STABLE</div>
                <div className="text-xs text-slate-500">-1.79% accuracy</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[#0E7490]">88%</div>
                <div className="text-xs text-slate-500">Stability Score</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[#0E7490]">3</div>
                <div className="text-xs text-slate-500">Recommended Difficulty</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[#1E293B]">420ms</div>
                <div className="text-xs text-slate-500">Avg Latency (7 Days)</div>
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
      </main >
    </div >
  );
}
