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
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Subscription plans and Care Pro preview"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-8">
        {/* Dialog header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800">Plans &amp; Care Pro Preview</h2>
            <p className="text-sm text-slate-600 mt-1">
              Compare your current plan with the premium clinical intelligence suite.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close subscription dialog"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
          {/* ── Left column: current plan ──────────────────────────────── */}
          <div className="flex flex-col rounded-2xl border-2 border-slate-200 bg-slate-50 p-6">
            <span className="self-start bg-slate-200 text-slate-700 px-3 py-1 rounded-full text-xs font-semibold">
              Starter Plan
            </span>
            <h3 className="text-xl font-bold text-slate-800 mt-3">Starter Plan (Active)</h3>
            <p className="text-sm text-slate-600 mt-1">Included free with every account.</p>
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
          <div className="flex flex-col rounded-2xl border-2 border-teal-300 bg-white p-6">
            <span className="self-start inline-flex items-center gap-1.5 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
              <Sparkles size={13} aria-hidden="true" />
              Care Pro Preview
            </span>
            <h3 className="text-xl font-bold text-slate-800 mt-3">Care Pro</h3>
            <ul className="mt-3 space-y-2">
              {CARE_PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-slate-600">
                  <Check size={15} className="text-teal-600 mt-0.5 shrink-0" aria-hidden="true" />
                  <span className="text-sm font-medium">{feature}</span>
                </li>
              ))}
            </ul>
                        {/* In-Depth Behavioral Analytics — mock sparkline */}
            <div className="mt-3 rounded-xl bg-slate-100 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-1.5">
                <TrendingUp size={14} className="text-teal-600" aria-hidden="true" />
                In-Depth Behavioral Analytics
              </div>
              <svg
                viewBox="0 0 200 56"
                className="w-full h-14"
                role="img"
                aria-label="Seven-day engagement sparkline trending upward"
              >
                <path
                  d="M0,44 C12,40 24,42 36,36 48,38 60,30 72,32 84,26 96,28 108,20 120,24 132,16 144,20 156,12 168,16 180,8 200,6"
                  fill="none"
                  stroke="#0d9488"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M0,44 C12,40 24,42 36,36 48,38 60,30 72,32 84,26 96,28 108,20 120,24 132,16 144,20 156,12 168,16 180,8 200,6 L200,56 L0,56 Z"
                  fill="#0d9488"
                  opacity="0.12"
                  stroke="none"
                />
                <circle cx="200" cy="6" r="3.5" fill="#0d9488" />
              </svg>
            </div>

            {/* Spatial Analytics & Heatmaps — mock heatmap + geo-fence */}
            <div className="mt-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-1.5">
                <Map size={14} className="text-teal-600" aria-hidden="true" />
                Spatial Analytics &amp; Heatmaps
              </div>
              <div className="relative h-32 rounded-lg bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 opacity-80 overflow-hidden">
                <div
                  className="absolute inset-x-6 inset-y-4 rounded-[50%] border-2 border-dashed border-white/90"
                  aria-hidden="true"
                />
                <div className="absolute top-3 left-3 h-2.5 w-2.5 rounded-full bg-white border-2 border-black/60" aria-hidden="true" />
                <div className="absolute bottom-1.5 left-2 right-2 bg-black/55 text-white text-[11px] font-semibold px-2 py-1 rounded">
                                    Security Breach Frequency: High at Front Door
                </div>
              </div>
            </div>

            {/* Most Visited Areas — clean list with ratio bars */}
            <div className="mt-3 rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-1.5">
                <Zap size={14} className="text-teal-600" aria-hidden="true" />
                Most Visited Areas
              </div>
              <ul className="space-y-1.5">
                {VISITED_AREAS.map((area) => (
                  <li key={area.label} className="flex items-center justify-between gap-2.5">
                    <span className="text-sm font-medium text-slate-700">{area.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 rounded-full bg-slate-200">
                        <div
                          className={`h-2.5 rounded-full bg-teal-500 ${area.bar}`}
                          role="img"
                          aria-label={`${area.label} ${area.pct}% of visits`}
                        />
                      </div>
                      <span className="text-sm font-bold text-slate-600 w-10 text-right">{area.pct}%</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Predictive AI Location Engine — pulsing warning */}
            <div className="mt-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-1.5">
                <BrainCircuit size={14} className="text-teal-600" aria-hidden="true" />
                Predictive AI Location Engine
              </div>
              <div
                className="bg-red-100 text-red-700 animate-pulse px-4 py-2 rounded-lg mt-3 font-semibold text-sm"
                role="status"
              >
                AI Alert: Trajectory predicts patient heading towards Main Gate.
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                ETA to fence 4 min · Confidence 87% — caregivers can pre-empt with a voice nudge.
              </p>
            </div>

            {/* Vernacular Audio — mock Bhashini waveform */}
            <div className="mt-2.5 rounded-xl bg-slate-100 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-1.5">
                <AudioLines size={14} className="text-amber-500" aria-hidden="true" />
                Vernacular Audio
              </div>
              <div className="flex items-end gap-[3px] h-14" aria-hidden="true">
                {AUDIO_BLOCKS.map((height, index) => (
                  <span key={index} className={`w-1.5 rounded-sm bg-amber-500 ${height}`} />
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Bhashini AI Voice Synthesis (Hindi/Bengali)
              </p>
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            UI preview only — plan activation ships with billing integration. No charges today.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="bg-teal-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-teal-700 transition-colors"
          >
            Upgrade to Care Pro
          </button>
        </div>
      </div>
    </div>
  );
}
