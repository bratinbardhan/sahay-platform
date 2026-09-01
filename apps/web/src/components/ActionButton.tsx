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
    'flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-base transition-all min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed';
  const styles =
    variant === 'primary'
      ? 'bg-[#E67E22] text-white hover:bg-[#D35400] border-2 border-[#2C3E50] disabled:hover:bg-[#E67E22]'
      : 'bg-[#F8F6F0] text-[#2C3E50] hover:bg-[#edeae3] border-2 border-[#2C3E50]';

  return (
    <button type={type} className={`${base} ${styles} ${className}`} onClick={onClick} disabled={disabled}>
      {icon}
      {label}
    </button>
  );
}
