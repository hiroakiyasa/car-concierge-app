import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface WebMapViewProps {
  region?: any;
  onRegionChangeComplete?: (region: any) => void;
  onMapReady?: () => void;
  children?: React.ReactNode;
  style?: any;
}

export const WebMapView: React.FC<WebMapViewProps> = ({ 
  onMapReady, 
  children, 
  style 
}) => {
  React.useEffect(() => {
    if (onMapReady) {
      onMapReady();
    }
  }, [onMapReady]);

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.text}>地図はモバイルアプリでのみ利用可能です</Text>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  text: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
});

// Web用のダミーMarkerコンポーネント
export const WebMarker: React.FC<any> = ({ children }) => {
  return <>{children}</>;
};

// Web用のダミーCalloutコンポーネント
export const WebCallout: React.FC<any> = ({ children }) => {
  return <>{children}</>;
};

