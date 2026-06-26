/**
 * Design tokens. Neutral palette, one accent. Keep everything referencing these
 * so the UI stays consistent and easy to retune.
 */
export const colors = {
  bg: '#FFFFFF',
  surface: '#F5F5F7',
  surfaceAlt: '#ECECEF',
  border: '#E2E2E6',
  text: '#1A1A1E',
  textMuted: '#6B6B73',
  textFaint: '#9A9AA2',
  accent: '#2F6BFF',
  accentMuted: '#E5EDFF',
  success: '#1FA971',
  danger: '#E5484D',
  warning: '#E5A23B',
  onAccent: '#FFFFFF',
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
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const font = {
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;
