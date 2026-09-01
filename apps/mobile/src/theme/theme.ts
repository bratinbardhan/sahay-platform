/**
 * Sahāy patient UI — glare-reducing clinical palette.
 * Never use red or alarming alert colors on this surface.
 */
export const theme = {
  colors: {
    background: '#F8F6F0',
    text: '#2C3E50',
    primary: '#E67E22',
    border: '#2C3E50',
    card: '#FFFCF6',
    guide: '#E8C48A',
    landscapeSky: '#D9E6D4',
    landscapeHill: '#8FA67A',
    landscapeHillDark: '#6B8F71',
    leaf: '#C4A35A',
  },
  touch: {
    minDp: 64,
  },
  typography: {
    title: 32,
    body: 22,
    label: 28,
  },
  radius: {
    card: 24,
    button: 20,
  },
} as const;

export const colors = theme.colors;
export const MIN_TOUCH_DP = theme.touch.minDp;
