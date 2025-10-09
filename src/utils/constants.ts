// Color palette
export const Colors = {
  // Primary Colors
  primary: '#1976d2',
  primaryLight: '#63a4ff',
  primaryDark: '#004ba0',
  
  // Secondary Colors
  secondary: '#dc004e',
  secondaryLight: '#ff5983',
  secondaryDark: '#9a0036',
  
  // Background Colors
  background: '#fafafa',
  surface: '#ffffff',
  
  // Status Colors
  error: '#f44336',
  success: '#4caf50',
  warning: '#ff9800',
  warningLight: '#fff3e0',
  info: '#2196f3',
  
  // Text Colors
  textPrimary: 'rgba(0, 0, 0, 0.87)',
  textSecondary: 'rgba(0, 0, 0, 0.6)',
  textDisabled: 'rgba(0, 0, 0, 0.38)',
  textWhite: '#ffffff',
  
  // Category Colors
  categoryParking: '#1976d2',
  categoryConvenience: '#4CAF50',
  categoryHotSpring: '#E91E63',
  categoryFestival: '#9C27B0',
  categoryGasStation: '#FF9800',
  
  // UI Colors
  disabled: '#e0e0e0',
  divider: '#e0e0e0',
  overlay: 'rgba(0, 0, 0, 0.5)',
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

// Typography
export const Typography = {
  // Font Sizes
  h1: 28,
  h2: 24,
  h3: 20,
  h4: 18,
  h5: 16,
  h6: 14,
  
  body: 16,
  bodySmall: 14,
  caption: 12,
  overline: 10,
  
  // Font Weights
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
  
  // Line Heights
  lineHeightTight: 1.2,
  lineHeightNormal: 1.4,
  lineHeightRelaxed: 1.6,
} as const;

// Spacing
export const Spacing = {
  // Base spacing unit (8px)
  unit: 8,
  
  // Padding/Margin sizes
  xs: 4,
  small: 8,
  medium: 16,
  large: 24,
  xl: 32,
  xxl: 48,
  
  // Border radius
  cornerRadius: 8,
  cornerRadiusSmall: 4,
  cornerRadiusLarge: 12,
  
  // Elevations (Android)
  elevation1: 1,
  elevation2: 2,
  elevation3: 4,
  elevation4: 6,
  elevation5: 8,
} as const;

// Default Shadow
export const DefaultShadow = {
  // iOS Shadow
  shadowColor: Colors.black,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  
  // Android Elevation
  elevation: Spacing.elevation2,
} as const;

// UI Elements
export const UIElements = {
  // Animation Durations
  animationFast: 200,
  animationNormal: 350,
  animationSlow: 500,
  
  // Layout Constants
  headerHeight: 56,
  tabBarHeight: 60,
  buttonHeight: 48,
  inputHeight: 48,
  
  // Icon Sizes
  iconSmall: 16,
  iconMedium: 24,
  iconLarge: 32,
  iconXLarge: 48,
} as const;

// Default region (Tokyo Station) - 上下5km範囲
export const DEFAULT_REGION = {
  latitude: 35.6812,
  longitude: 139.7671,
  latitudeDelta: 0.045,  // 上下約5km (5km / 111km/度 ≈ 0.045)
  longitudeDelta: 0.045,
};