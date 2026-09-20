/**
 * Sahāy patient UI — glare-reducing clinical palette.
 * Never use red or alarming alert colors on this surface.
 */
export const theme = {
  colors: {
    background: '#F8FAFC',
    text: '#0F172A',
    ink: '#0F172A',
    primary: '#0D9488',
    action: '#0D9488',
    reinforcementPeach: '#FFF1E0',
    reinforcementGreen: '#D1FAE5',
    card: '#FFFFFF',
    surface: '#FFFFFF',
    border: '#E2E8F0',
    guide: '#CCFBF1',
    icon: '#0F172A',
    landscapeSky: '#CCFBF1',
    landscapeHill: '#D1FAE5',
    landscapeHillDark: '#0F766E',
    leaf: '#0D9488',
    surfaceSunken: '#F1F5F9',
    muted: '#475569',
    actionStrong: '#0F766E',
    actionSoft: '#CCFBF1',
    calm: '#10B981',
    alertSoft: '#FFF1E0',
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
    card: 12,
    button: 12,
    control: 10,
    pill: 999,
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
