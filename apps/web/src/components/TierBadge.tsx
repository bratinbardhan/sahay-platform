import type { UserTier } from '@sahay/types';

interface TierBadgeProps {
  tier: UserTier;
  className?: string;
}

/** Subtle "Premium" / "Free" pill shown in the navigation bar and admin tables. */
export function TierBadge({ tier, className = '' }: TierBadgeProps) {
  const premium = tier === 'PREMIUM';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${
        premium
          ? 'bg-amber-100 border-amber-500 text-amber-800'
          : 'bg-slate-200 border-slate-300 text-slate-700'
      } ${className}`}
    >
      {premium ? '✦ Premium' : 'Free'}
    </span>
  );
}