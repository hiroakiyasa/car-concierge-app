import React from 'react';
import { Platform } from 'react-native';
// Platform-specific import - will use .web.ts on web
import { MapView, Marker, Callout as NativeCallout } from './NativeMaps';

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface CrossPlatformMapProps {
  region?: Region;
  initialRegion?: Region;
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
  initialRegion,
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
  // Web版の場合は未対応（モバイルアプリ専用）
  if (Platform.OS === 'web') {
    return null;
  }

  // ネイティブ版（iOS/Android）
  // iOSはApple Maps、AndroidはGoogle Maps（デフォルト）
  return (
    <MapView
      ref={mapRef}
      style={style}
      initialRegion={initialRegion || region}
      onRegionChangeComplete={onRegionChangeComplete}
      onMapReady={onMapReady}
      onMarkerPress={onMarkerPress}
      onPress={onPress}
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
