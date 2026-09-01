import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, MIN_TOUCH_DP } from '@/theme/theme';

type LargeTouchButtonProps = {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function LargeTouchButton({
  label,
  onPress,
  icon,
  variant = 'primary',
  style,
  disabled = false,
}: LargeTouchButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
        styles.minTouch,
      ]}
    >
      {icon}
      <Text style={[styles.label, isPrimary ? styles.labelOnPrimary : styles.labelOnSecondary]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  minTouch: {
    minHeight: MIN_TOUCH_DP,
    minWidth: MIN_TOUCH_DP,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.card,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  labelOnPrimary: {
    color: colors.card,
  },
  labelOnSecondary: {
    color: colors.text,
  },
});
