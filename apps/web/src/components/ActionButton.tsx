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
    'sahay-interactive flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-base min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed';
  const styles =
    variant === 'primary'
      ? 'bg-sahay-accent text-white hover:bg-sahay-accent-strong border-2 border-sahay-ink disabled:hover:bg-sahay-accent'
      : 'bg-sahay-bg text-sahay-ink hover:bg-sahay-surface-sunken border-2 border-sahay-ink';

  return (
    <button type={type} className={`${base} ${styles} ${className}`} onClick={onClick} disabled={disabled}>
      {icon}
      {label}
    </button>
  );
}
