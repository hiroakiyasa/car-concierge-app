import React from 'react';
import { Image, Text, View, StyleSheet } from 'react-native';
import { getConvenienceStoreLogo } from '@/utils/brandLogos';

interface ConvenienceBrandLogoProps {
  brand?: string;
  size?: number; // image size in px
  label?: boolean; // show brand text label under icon
}

export const ConvenienceBrandLogo: React.FC<ConvenienceBrandLogoProps> = ({
  brand = '',
  size = 20,
  label = true,
}) => {
  const src = brand ? getConvenienceStoreLogo(brand) : null;

  if (!src) {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={{ fontSize: Math.max(14, Math.min(24, size)) }}>🏪</Text>
        {label && !!brand && <Text style={styles.labelText} numberOfLines={1}>{brand}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image source={src} style={{ width: size, height: size }} resizeMode="contain" />
      {label && !!brand && <Text style={styles.labelText} numberOfLines={1}>{brand}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    marginTop: 2,
    fontSize: 10,
    color: '#444',
    maxWidth: 64,
  },
});

export default ConvenienceBrandLogo;

