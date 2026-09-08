import type { ReactNode } from 'react';

interface StatBoxProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  accent?: boolean;
  subtitle?: string;
}

export function StatBox({ label, value, icon, accent = false, subtitle }: StatBoxProps) {
  const accentClass = accent ? 'text-[#E67E22]' : 'text-[#2C3E50]';
  const bgClass = accent ? 'bg-[#FFF6EA]' : 'bg-[#F8F6F0]';

  return (
    <div className={`border-2 border-[#2C3E50] rounded-2xl p-5 text-center min-h-[120px] flex flex-col items-center justify-center ${bgClass}`}>
      {icon && <div className="mb-2 text-3xl text-[#2C3E50]">{icon}</div>}
      <div className={`text-3xl font-extrabold ${accentClass}`}>{value}</div>
      <div className="text-sm font-semibold text-[#2C3E50] mt-1">{label}</div>
      {subtitle && <div className="text-xs text-[#2C3E50]/60 mt-1">{subtitle}</div>}
    </div>
  );
}
