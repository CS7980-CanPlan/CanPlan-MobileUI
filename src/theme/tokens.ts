/**
 * Design tokens for the CanPlan 2.0 Mobile UI.
 *
 * Mirrors the CSS variables defined in the Supporter Web Portal's
 * `styles/global.css` so both clients share one visual language. Components
 * must read from these tokens rather than hard-coding colors or spacing.
 */

export const colors = {
  bg: '#f5f7fa',
  surface: '#ffffff',
  border: '#d8dee9',
  text: '#1c2433',
  textMuted: '#5a6577',
  primary: '#1f6feb',
  primaryDark: '#1858c4',
  success: '#1a7f4b',
  warning: '#b5680b',
  danger: '#c23030',
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
  md: 10,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  heading: { fontSize: 20, fontWeight: '700' as const, lineHeight: 26 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
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
} as const;
