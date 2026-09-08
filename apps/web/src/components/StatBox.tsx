import type { ReactNode } from 'react';

interface StatBoxProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  accent?: boolean;
  subtitle?: string;
}

export function StatBox({ label, value, icon, accent = false, subtitle }: StatBoxProps) {
  const accentClass = accent ? 'text-teal-600' : 'text-slate-800';

  return (
    <div className="bg-white border border-transparent rounded-2xl p-5 text-center min-h-[120px] flex flex-col items-center justify-center transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:border-teal-200">
      {icon && <div className={`mb-2 text-3xl ${accent ? 'text-teal-600' : 'text-slate-700'}`}>{icon}</div>}
      <div className={`text-3xl font-extrabold ${accentClass}`}>{value}</div>
      <div className="text-sm font-semibold text-slate-800 mt-1">{label}</div>
      {subtitle && <div className="text-xs text-slate-600 mt-1">{subtitle}</div>}
    </div>
  );
}
