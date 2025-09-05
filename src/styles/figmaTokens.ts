// Figma Design Tokens
// このファイルはFigmaのデザインシステムと同期します

export const FigmaColors = {
  // Primary Colors
  primary: '#667eea',
  primaryDark: '#764ba2',
  primaryLight: '#f0f4ff',
  
  // Secondary Colors
  secondary: '#f093fb',
  secondaryDark: '#f5576c',
  
  // Accent Colors
  accent: '#fa709a',
  accentLight: '#fee140',
  
  // Neutral Colors
  white: '#ffffff',
  black: '#000000',
  gray: {
    50: '#f8f9fa',
    100: '#f1f3f5',
    200: '#e9ecef',
    300: '#dee2e6',
    400: '#ced4da',
    500: '#adb5bd',
    600: '#868e96',
    700: '#495057',
    800: '#343a40',
    900: '#212529',
  },
  
  // Status Colors
  success: '#00C851',
  warning: '#FFD93D',
  error: '#FF6B35',
  info: '#007AFF',
};

export const FigmaTypography = {
  // Font Families
  fontFamily: {
    primary: 'System',
    secondary: 'SF Pro Display',
  },
  
  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  
  // Font Weights
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const FigmaSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

export const FigmaBorderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
};

export const FigmaShadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Component Styles
export const FigmaComponents = {
  button: {
    primary: {
      backgroundColor: FigmaColors.primary,
      color: FigmaColors.white,
      paddingVertical: FigmaSpacing.md,
      paddingHorizontal: FigmaSpacing.xl,
      borderRadius: FigmaBorderRadius.full,
      ...FigmaShadows.md,
    },
    secondary: {
      backgroundColor: FigmaColors.white,
      color: FigmaColors.primary,
      borderWidth: 1,
      borderColor: FigmaColors.primary,
      paddingVertical: FigmaSpacing.md,
      paddingHorizontal: FigmaSpacing.xl,
      borderRadius: FigmaBorderRadius.full,
    },
  },
  card: {
    backgroundColor: FigmaColors.white,
    borderRadius: FigmaBorderRadius.lg,
    padding: FigmaSpacing.lg,
    ...FigmaShadows.md,
  },
  input: {
    backgroundColor: FigmaColors.gray[50],
    borderWidth: 1,
    borderColor: FigmaColors.gray[200],
    borderRadius: FigmaBorderRadius.md,
    paddingVertical: FigmaSpacing.md,
    paddingHorizontal: FigmaSpacing.lg,
    fontSize: FigmaTypography.fontSize.base,
  },
};