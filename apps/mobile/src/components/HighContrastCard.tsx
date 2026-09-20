import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, MIN_TOUCH_DP } from '@/theme/theme';

type HighContrastCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  highlighted?: boolean;
};

export function HighContrastCard({ children, style, highlighted = false }: HighContrastCardProps) {
  return (
    <View style={[styles.card, highlighted ? styles.highlighted : null, styles.minTouch, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 2,
    borderRadius: 16,
    padding: 20,
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  minTouch: {
    minHeight: MIN_TOUCH_DP,
  },
  highlighted: {
    borderColor: colors.primary,
    backgroundColor: '#FFF6EA',
  },
});
