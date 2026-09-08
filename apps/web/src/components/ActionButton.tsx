import type { ReactNode } from 'react';

interface ActionButtonProps {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}

export function ActionButton({
  label,
  icon,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
  type = 'button',
}: ActionButtonProps) {
  const base =
    'flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-base transition-all duration-300 ease-out min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 hover:shadow-lg active:scale-[0.98]';
  const styles =
    variant === 'primary'
      ? 'bg-teal-600 text-white hover:bg-teal-700 border-2 border-transparent'
      : 'bg-white text-slate-800 border-2 border-slate-200 hover:bg-slate-100';

  return (
    <button type={type} className={`${base} ${styles} ${className}`} onClick={onClick} disabled={disabled}>
      {icon}
      {label}
    </button>
  );
}
