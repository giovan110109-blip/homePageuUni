export interface DesignTokens {
  colors: {
    primary: string
    primaryHover: string
    primaryLight: string
    secondary: string
    secondaryHover: string
    accent: string
    success: string
    warning: string
    error: string
  }
  bg: {
    primary: string
    secondary: string
    tertiary: string
    card: string
    elevated: string
  }
  text: {
    primary: string
    secondary: string
    tertiary: string
    muted: string
    inverse: string
  }
  border: {
    DEFAULT: string
    light: string
    dark: string
  }
}

export const lightTokens: DesignTokens = {
  colors: {
    primary: '#6366f1',
    primaryHover: '#4f46e5',
    primaryLight: '#a5b4fc',
    secondary: '#8b5cf6',
    secondaryHover: '#7c3aed',
    accent: '#06b6d4',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  bg: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#f1f5f9',
    card: '#ffffff',
    elevated: '#ffffff',
  },
  text: {
    primary: '#0f172a',
    secondary: '#334155',
    tertiary: '#64748b',
    muted: '#94a3b8',
    inverse: '#ffffff',
  },
  border: {
    DEFAULT: '#e2e8f0',
    light: '#f1f5f9',
    dark: '#cbd5e1',
  },
}

export const darkTokens: DesignTokens = {
  colors: {
    primary: '#818cf8',
    primaryHover: '#a5b4fc',
    primaryLight: '#6366f1',
    secondary: '#a78bfa',
    secondaryHover: '#c4b5fd',
    accent: '#22d3ee',
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
  },
  bg: {
    primary: '#0f172a',
    secondary: '#1e293b',
    tertiary: '#334155',
    card: '#1e293b',
    elevated: '#334155',
  },
  text: {
    primary: '#f8fafc',
    secondary: '#e2e8f0',
    tertiary: '#cbd5e1',
    muted: '#64748b',
    inverse: '#0f172a',
  },
  border: {
    DEFAULT: '#334155',
    light: '#1e293b',
    dark: '#475569',
  },
}

export const fontSize = {
  'xs': '12px',
  'sm': '14px',
  'base': '16px',
  'lg': '18px',
  'xl': '20px',
  '2xl': '24px',
  '3xl': '30px',
  '4xl': '36px',
  '5xl': '48px',
} as const

export const lineHeight = {
  none: '1',
  tight: '1.25',
  snug: '1.375',
  normal: '1.5',
  relaxed: '1.625',
  loose: '2',
} as const

export const fontWeight = {
  thin: '100',
  extralight: '200',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
} as const

export const borderRadius = {
  'none': '0',
  'sm': '4px',
  'DEFAULT': '8px',
  'md': '12px',
  'lg': '16px',
  'xl': '20px',
  '2xl': '24px',
  '3xl': '32px',
  'full': '9999px',
} as const

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  11: '44px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  28: '112px',
  32: '128px',
} as const

export const boxShadow = {
  'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  'none': 'none',
} as const

export const transitionDuration = {
  DEFAULT: '150ms',
  fast: '75ms',
  normal: '300ms',
  slow: '500ms',
} as const

export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const
