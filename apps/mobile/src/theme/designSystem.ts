import { colors as themeColors, MIN_TOUCH_DP, theme } from './theme';

export const colors = themeColors;
export { MIN_TOUCH_DP, theme };

/** Shared clinical surface rules: containers are intentionally flat. */
export const flatSurface = {
  elevation: 0,
  shadowOpacity: 0,
  shadowRadius: 0,
  shadowOffset: { width: 0, height: 0 },
} as const;

export const clinicalBorder = {
  borderColor: colors.border,
  borderWidth: 1,
} as const;

export const flatContainer = {
  ...flatSurface,
  ...clinicalBorder,
  backgroundColor: colors.card,
  borderRadius: theme.radius.card,
} as const;

export const touchTarget = {
  minHeight: MIN_TOUCH_DP,
  minWidth: MIN_TOUCH_DP,
} as const;
