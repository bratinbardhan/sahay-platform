import { StyleSheet, Text, View } from 'react-native';
import type { UserTier } from '@sahay/types';

import { colors, theme } from '@/theme/theme';

type TierBadgeProps = {
  tier: UserTier;
};

/** Subtle "Premium" / "Free" pill shown on the dashboard header. */
export function TierBadge({ tier }: TierBadgeProps) {
  const isPremium = tier === 'PREMIUM';
  return (
    <View style={[styles.badge, isPremium ? styles.premium : styles.free]}>
      <Text style={[styles.text, isPremium ? styles.premiumText : styles.freeText]}>
        {isPremium ? '\u2726 Premium' : 'Free'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
  },
  premium: {
    backgroundColor: colors.actionSoft,
    borderColor: colors.primary,
  },
  free: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  premiumText: {
    color: colors.actionStrong,
  },
  freeText: {
    color: colors.muted,
  },
});