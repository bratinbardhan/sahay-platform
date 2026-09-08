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
          ? 'bg-[#FFF8E6] border-[#C4A35A] text-[#8A6C1D]'
          : 'bg-[#F1F2F4] border-[#C9CFD6] text-[#5B6673]'
      } ${className}`}
    >
      {premium ? '✦ Premium' : 'Free'}
    </span>
  );
}