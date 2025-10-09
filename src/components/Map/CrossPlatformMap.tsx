import React, { useEffect } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
// Platform-specific import - will use .web.ts on web
import { MapView, Marker, PROVIDER_GOOGLE, Callout as NativeCallout } from './NativeMaps';

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface CrossPlatformMapProps {
  region: Region;
  onRegionChangeComplete?: (region: Region) => void;
  children?: React.ReactNode;
  style?: any;
  showsUserLocation?: boolean;
  followsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  mapRef?: React.RefObject<any>;
  onMapReady?: () => void;
  onMarkerPress?: (event: any) => void;
  onPress?: (event: any) => void;
  showsCompass?: boolean;
  showsScale?: boolean;
  rotateEnabled?: boolean;
}

export const CrossPlatformMap: React.FC<CrossPlatformMapProps> = ({
  region,
  onRegionChangeComplete,
  children,
  style,
  showsUserLocation = false,
  followsUserLocation = false,
  showsMyLocationButton = false,
  mapRef,
  onMapReady,
  onMarkerPress,
  onPress,
  showsCompass = true,
  showsScale = true,
  rotateEnabled = true,
}) => {
  // Web版の場合は簡易的なプレースホルダーを表示し、onMapReadyを即座に呼ぶ
  useEffect(() => {
    if (Platform.OS === 'web' && onMapReady) {
      // Webの場合、マウント後すぐにonMapReadyを呼び出す
      const timer = setTimeout(() => {
        onMapReady();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [onMapReady]);

  if (Platform.OS === 'web') {
    return (
      <View style={[style, styles.webMapPlaceholder]}>
        <Text style={styles.webMapText}>
          🗺️ Web版地図
          {'\n\n'}
          緯度: {region.latitude.toFixed(4)}
          {'\n'}
          経度: {region.longitude.toFixed(4)}
          {'\n\n'}
          ※ Web版では地図機能は開発中です
          {'\n'}
          モバイルアプリをご利用ください
        </Text>
      </View>
    );
  }

  // ネイティブ版（iOS/Android）
  return (
    <MapView
      ref={mapRef}
      style={style}
      region={region}
      onRegionChangeComplete={onRegionChangeComplete}
      onMapReady={onMapReady}
      onMarkerPress={onMarkerPress}
      onPress={onPress}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      showsUserLocation={showsUserLocation}
      followsUserLocation={followsUserLocation}
      showsMyLocationButton={showsMyLocationButton}
      showsCompass={showsCompass}
      showsScale={showsScale}
      rotateEnabled={rotateEnabled}
    >
      {children}
    </MapView>
  );
};

// MapViewとMarkerを再エクスポート（既存コードとの互換性のため）
export { Marker };

// Calloutを再エクスポート
const Callout = Platform.OS === 'web' ? ({ children }: any) => null : NativeCallout;
export { Callout };

const styles = StyleSheet.create({
  webMapPlaceholder: {
    backgroundColor: '#0B1220',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webMapText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
