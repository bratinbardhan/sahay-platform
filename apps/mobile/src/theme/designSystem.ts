import { colors as themeColors, MIN_TOUCH_DP, theme } from './theme';

export const colors = themeColors;
export { MIN_TOUCH_DP, theme };
export const flatSurface = {
  elevation: 0,
  shadowOpacity: 0,
  shadowRadius: 0,
  shadowOffset: { width: 0, height: 0 },
} as const;
