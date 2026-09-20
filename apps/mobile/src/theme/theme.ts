/**
 * Sahāy patient UI — glare-reducing clinical palette.
 * Never use red or alarming alert colors on this surface.
 */
export const theme = {
  colors: {
    background: '#F8F6F0',
    text: '#2C3E50',
    primary: '#E67E22',
    reinforcementPeach: '#F8B890',
    reinforcementGreen: '#BDE0AF',
    card: '#FFFFFF',
    border: '#E2E8F0',
    guide: '#F8B890',
    icon: '#2C3E50',
    landscapeSky: '#BDE0AF',
    landscapeHill: '#BDE0AF',
    landscapeHillDark: '#2C3E50',
    leaf: '#E67E22',
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
    card: 16,
    button: 16,
  },
  flat: {
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
} as const;

export const colors = theme.colors;
export const MIN_TOUCH_DP = theme.touch.minDp;
