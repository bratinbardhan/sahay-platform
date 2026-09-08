import type { ReactNode } from 'react';

interface StatBoxProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  accent?: boolean;
  subtitle?: string;
}

export function StatBox({ label, value, icon, accent = false, subtitle }: StatBoxProps) {
  const accentClass = accent ? 'text-emerald-700' : 'text-slate-900';

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 text-center min-h-[120px] flex flex-col items-center justify-center transition-shadow duration-150 hover:shadow-sm">
      {icon && <div className={`mb-2 ${accent ? 'text-emerald-600' : 'text-slate-400'}`}>{icon}</div>}
      <div className={`text-3xl font-bold tracking-tight ${accentClass}`}>{value}</div>
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">{label}</div>
      {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
    </div>
  );
}
