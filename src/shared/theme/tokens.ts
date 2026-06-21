/**
 * Design tokens for the CanPlan 2.0 Mobile UI.
 *
 * Warm orange brand palette shared across iOS, Android, and iPad. Components
 * must read from these tokens rather than hard-coding colors or spacing.
 */

export const colors = {
  bg: '#FBF5EE',
  surface: '#FFFFFF',
  surfaceWarm: '#F0E7DA',
  border: '#E5DBCB',
  text: '#1B2230',
  textMuted: '#6B6258',
  primary: '#E07744',
  primaryDark: '#C45F2E',
  onPrimary: '#FFFFFF',
  success: '#1A7F4B',
  warning: '#B5680B',
  danger: '#C23030',
  disabled: '#B5AFA5',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 36, fontWeight: '800' as const, lineHeight: 42 },
  title: { fontSize: 28, fontWeight: '800' as const, lineHeight: 34 },
  heading: { fontSize: 20, fontWeight: '700' as const, lineHeight: 26 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22 },
  bodyStrong: { fontSize: 16, fontWeight: '700' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  button: { fontSize: 18, fontWeight: '700' as const, lineHeight: 22 },
  metric: { fontSize: 36, fontWeight: '700' as const, lineHeight: 40 },
} as const;

export const shadow = {
  card: {
    shadowColor: '#141e32',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardStrong: {
    shadowColor: '#7a3a14',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
} as const;
