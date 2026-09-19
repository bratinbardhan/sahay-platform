import type { UserTier } from '@sahay/types';

interface TierBadgeProps {
  tier: UserTier;
  className?: string;
}

/** Subtle "Premium" / "Free" pill shown in the dashboard navigation bar. */
export function TierBadge({ tier, className = '' }: TierBadgeProps) {
  const premium = tier === 'PREMIUM';
  return (
    <span
      className={`inline-flex items-center rounded-full border-2 px-3 py-1 text-xs font-bold tracking-wide ${
        premium
          ? 'bg-sahay-gold-soft border-sahay-gold text-sahay-gold-ink'
          : 'bg-sahay-panel border-sahay-border text-sahay-muted'
      } ${className}`}
    >
      {premium ? '✦ Premium' : 'Free'}
    </span>
  );
}