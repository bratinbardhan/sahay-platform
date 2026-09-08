import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface ActionButtonProps {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  showChevron?: boolean;
}

export function ActionButton({
  label,
  icon,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
  type = 'button',
  showChevron = true,
}: ActionButtonProps) {
  const base =
    'group flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-medium text-sm transition-colors duration-150 min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed';
  const styles =
    variant === 'primary'
      ? 'bg-slate-900 text-white hover:bg-slate-800 border border-transparent'
      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50';

  return (
    <button type={type} className={`${base} ${styles} ${className}`} onClick={onClick} disabled={disabled}>
      {icon}
      {label}
      {showChevron && (
        <ChevronRight size={16} className="ml-1 transition-transform duration-150 group-hover:translate-x-0.5" />
      )}
    </button>
  );
}
