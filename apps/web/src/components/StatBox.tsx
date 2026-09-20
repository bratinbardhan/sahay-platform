import type { ReactNode } from 'react';

interface StatBoxProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  accent?: boolean;
  subtitle?: string;
}

export function StatBox({ label, value, icon, accent = false, subtitle }: StatBoxProps) {
  const accentClass = accent ? 'text-sahay-accent' : 'text-sahay-ink';
  const bgClass = accent ? 'bg-sahay-accent-soft' : 'bg-sahay-bg';

  return (
    <div className={`sahay-surface p-5 text-center min-h-[120px] flex flex-col items-center justify-center ${bgClass}`}>
      {icon && <div className="mb-2 text-3xl text-sahay-ink">{icon}</div>}
      <div className={`text-3xl font-extrabold font-mono tabular-nums ${accentClass}`}>{value}</div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-1">{label}</div>
      {subtitle && <div className="text-xs text-sahay-ink/60 mt-1">{subtitle}</div>}
    </div>
  );
}
