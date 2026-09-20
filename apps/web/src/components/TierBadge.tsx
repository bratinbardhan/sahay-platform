import type { UserTier } from '@sahay/types';

interface TierBadgeProps {
  tier: UserTier;
  className?: string;
  onClick?: () => void;
}

/** Subtle "Premium" / "Free" pill shown in the dashboard navigation bar. */
export function TierBadge({ className = '', onClick }: TierBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center rounded-full border border-teal-300 bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800 transition-colors hover:bg-teal-200 ${className}`}
    >
      Pro
    </button>
  );
}