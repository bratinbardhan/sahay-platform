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
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
        premium
          ? 'bg-amber-50 border-amber-200 text-amber-700'
          : 'bg-slate-100 border-slate-200 text-slate-700'
      } ${className}`}
    >
      {premium ? 'Premium' : 'Free'}
    </span>
  );
}