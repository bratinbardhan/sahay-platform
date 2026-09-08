import { useEffect } from 'react';
import {
  BrainCircuit,
  Check,
  Map,
  Sparkles,
  TrendingUp,
  X,
  Zap,
  AudioLines,
} from 'lucide-react';

interface SubscriptionModalProps {
  onClose: () => void;
}

/** Features already included in the free Starter plan (greyed out). */
const STARTER_FEATURES = [
  'Daily therapeutic games (DDA-calibrated)',
  '7-day cognitive trend & session log',
  'Emergency SOS alerts to caregivers',
  'Offline-first memory vault & media sync',
];

/** Visual mockup of the Care Pro feature set (no billing backend touched). */
const CARE_PRO_FEATURES = [
  'Real-time spatial heatmaps',
  'Predictive AI trajectory engine',
  'Full 30-day behavioral analytics',
  'Bhashini voice synthesis (Hindi & Bengali)',
];

const VISITED_AREAS = [
  { label: 'Living Room', pct: 65, bar: 'w-[65%]' },
  { label: 'Garden', pct: 20, bar: 'w-[20%]' },
  { label: 'Kitchen', pct: 15, bar: 'w-[15%]' },
];

/** Mock Bhashini waveform block heights (plain utility strings so Tailwind sees them). */
const AUDIO_BLOCKS = [
  'h-[10px]', 'h-[22px]', 'h-[16px]', 'h-[30px]', 'h-[26px]', 'h-[40px]', 'h-[34px]',
  'h-[48px]', 'h-[38px]', 'h-[28px]', 'h-[44px]', 'h-[20px]', 'h-[34px]', 'h-[50px]',
  'h-[30px]', 'h-[42px]', 'h-[24px]', 'h-[36px]', 'h-[18px]', 'h-[12px]',
];

/**
 * Wide, centered subscription dialog: current Starter plan on the left and a
 * purely visual "Care Pro" preview on the right (sparkline, spatial heatmap
 * mockup, visited areas, AI trajectory alert, vernacular audio).
 */
export function SubscriptionModal({ onClose }: SubscriptionModalProps) {
  // Close on Escape for keyboard users (WCAG 2.1.2).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Subscription plans and Care Pro preview"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-4xl w-full p-6 md:p-8">
        {/* Dialog header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Plans &amp; Care Pro Preview</h2>
            <p className="text-sm text-slate-500 mt-1">
              Compare your current plan with the premium clinical intelligence suite.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close subscription dialog"
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
          {/* ── Left column: current plan ──────────────────────────────── */}
          <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-6">
            <span className="self-start bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-medium">
              Starter Plan
            </span>
            <h3 className="text-lg font-semibold text-slate-900 mt-3">Starter Plan (Active)</h3>
            <p className="text-sm text-slate-500 mt-1">Included free with every account.</p>
            <ul className="mt-4 space-y-2.5">
              {STARTER_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-slate-400">
                  <Check size={16} className="text-slate-300 mt-0.5 shrink-0" aria-hidden="true" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Right column: Care Pro preview mockups ────────────────── */}
          <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-6">
            <span className="self-start inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 rounded-full text-xs font-medium">
              <Sparkles size={13} aria-hidden="true" />
              Care Pro Preview
            </span>
            <h3 className="text-lg font-semibold text-slate-900 mt-3">Care Pro</h3>
            <ul className="mt-3 space-y-2">
              {CARE_PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-slate-600">
                  <Check size={15} className="text-amber-600 mt-0.5 shrink-0" aria-hidden="true" />
                  <span className="text-sm font-medium">{feature}</span>
                </li>
              ))}
            </ul>
                        {/* In-Depth Behavioral Analytics — mock sparkline */}
            <div className="mt-4 rounded-lg bg-slate-50 border border-slate-100 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                <TrendingUp size={14} className="text-emerald-500" aria-hidden="true" />
                Behavioral Analytics
              </div>
              <svg
                viewBox="0 0 200 56"
                className="w-full h-12"
                role="img"
                aria-label="Seven-day engagement sparkline trending upward"
              >
                <path
                  d="M0,44 C12,40 24,42 36,36 48,38 60,30 72,32 84,26 96,28 108,20 120,24 132,16 144,20 156,12 168,16 180,8 200,6"
                  fill="none"
                  stroke="#0f766e"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M0,44 C12,40 24,42 36,36 48,38 60,30 72,32 84,26 96,28 108,20 120,24 132,16 144,20 156,12 168,16 180,8 200,6 L200,56 L0,56 Z"
                  fill="#0f766e"
                  opacity="0.08"
                  stroke="none"
                />
                <circle cx="200" cy="6" r="3" fill="#0f766e" />
              </svg>
            </div>

            {/* Spatial Analytics & Heatmaps — structured floor-plan grid */}
            <div className="mt-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                <Map size={14} className="text-slate-400" aria-hidden="true" />
                Spatial Heatmap
              </div>
              <div className="grid grid-cols-6 grid-rows-4 gap-1 h-28 rounded-lg overflow-hidden border border-slate-200">
                {Array.from({ length: 24 }).map((_, i) => {
                  const isHotspot = [2, 3, 8, 9, 14, 15].includes(i);
                  const isWarm = [4, 5, 10, 11, 16, 17].includes(i);
                  return (
                    <div
                      key={i}
                      className={`${
                        isHotspot
                          ? 'bg-red-100'
                          : isWarm
                          ? 'bg-amber-50'
                          : 'bg-slate-50'
                      }`}
                    />
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-100 border border-red-200" /> High activity</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-50 border border-amber-200" /> Moderate</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-slate-50 border border-slate-200" /> Low</span>
              </div>
            </div>

            {/* Most Visited Areas — clean list with ratio bars */}
            <div className="mt-4 rounded-lg bg-slate-50 border border-slate-100 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                <Zap size={14} className="text-slate-400" aria-hidden="true" />
                Most Visited Areas
              </div>
              <ul className="space-y-2">
                {VISITED_AREAS.map((area) => (
                  <li key={area.label} className="flex items-center justify-between gap-2.5">
                    <span className="text-sm text-slate-600">{area.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-200">
                        <div
                          className={`h-1.5 rounded-full bg-slate-500 ${area.bar}`}
                          role="img"
                          aria-label={`${area.label} ${area.pct}% of visits`}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-500 w-8 text-right">{area.pct}%</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Predictive AI Location Engine — clean alert */}
            <div className="mt-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                <BrainCircuit size={14} className="text-slate-400" aria-hidden="true" />
                Predictive AI Location Engine
              </div>
              <div
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm font-medium"
                role="status"
              >
                AI Alert: Trajectory predicts patient heading towards Main Gate.
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                ETA to fence 4 min · Confidence 87% — caregivers can pre-empt with a voice nudge.
              </p>
            </div>

            {/* Vernacular Audio — mock Bhashini waveform */}
            <div className="mt-4 rounded-lg bg-slate-50 border border-slate-100 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                <AudioLines size={14} className="text-amber-500" aria-hidden="true" />
                Vernacular Audio
              </div>
              <div className="flex items-end gap-[3px] h-12" aria-hidden="true">
                {AUDIO_BLOCKS.map((height, index) => (
                  <span key={index} className={`w-1.5 rounded-sm bg-amber-400 ${height}`} />
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Bhashini AI Voice Synthesis (Hindi/Bengali)
              </p>
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            UI preview only — plan activation ships with billing integration. No charges today.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-900 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors"
          >
            Upgrade to Care Pro
          </button>
        </div>
      </div>
    </div>
  );
}
