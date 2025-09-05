import { FigmaColors, FigmaTypography, FigmaSpacing, FigmaBorderRadius, FigmaShadows } from '@/styles/figmaTokens';

// アプリ全体のテーマ設定
export const Theme = {
  colors: FigmaColors,
  typography: FigmaTypography,
  spacing: FigmaSpacing,
  borderRadius: FigmaBorderRadius,
  shadows: FigmaShadows,
  
  // カスタムテーマ設定
  navigation: {
    headerBackground: FigmaColors.primary,
    headerText: FigmaColors.white,
    tabBarBackground: FigmaColors.white,
    tabBarActive: FigmaColors.primary,
    tabBarInactive: FigmaColors.gray[500],
  },
  
  map: {
    markerColors: {
      gold: '#FFD700',
      silver: '#C0C0C0',
      bronze: '#CD7F32',
      parking: FigmaColors.info,
      convenience: FigmaColors.success,
      hotspring: FigmaColors.error,
      gasstation: FigmaColors.warning,
      festival: '#E91E63',
    },
  },
  
  components: {
    bottomSheet: {
      backgroundColor: FigmaColors.white,
      handleColor: FigmaColors.gray[300],
      borderRadius: FigmaBorderRadius['2xl'],
      ...FigmaShadows.xl,
    },
    
    filterPanel: {
      backgroundColor: FigmaColors.white,
      borderRadius: FigmaBorderRadius.lg,
      padding: FigmaSpacing.lg,
      ...FigmaShadows.md,
    },
    
    marker: {
      default: {
        backgroundColor: FigmaColors.white,
        borderColor: FigmaColors.primary,
        borderWidth: 2,
        ...FigmaShadows.md,
      },
      selected: {
        backgroundColor: FigmaColors.primary,
        borderColor: FigmaColors.white,
        borderWidth: 3,
        transform: [{ scale: 1.2 }],
        ...FigmaShadows.lg,
      },
    },
  },
};

// テーマヘルパー関数
export const getColor = (path: string) => {
  const keys = path.split('.');
  let value: any = Theme.colors;
  for (const key of keys) {
    value = value[key];
  }
  return value;
};

export const getSpacing = (size: keyof typeof FigmaSpacing) => {
  return FigmaSpacing[size];
};

export const getBorderRadius = (size: keyof typeof FigmaBorderRadius) => {
  return FigmaBorderRadius[size];
};

export const getShadow = (size: keyof typeof FigmaShadows) => {
  return FigmaShadows[size];
};

export default Theme;