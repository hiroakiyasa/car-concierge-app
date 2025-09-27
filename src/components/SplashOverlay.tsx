import React from 'react';
import { View, Image, StyleSheet, ActivityIndicator, Platform } from 'react-native';

export const SplashOverlay: React.FC = () => {
  return (
    <View style={styles.container} pointerEvents="none">
      <Image
        source={require('../../assets/splash-icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size={Platform.OS === 'ios' ? 'large' : 40} color="#FFFFFF" style={styles.spinner} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0B1220',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '56%',
    height: undefined,
    aspectRatio: 1,
  },
  spinner: {
    marginTop: 24,
  },
});

