/**
 * 現在位置マーカーコンポーネント
 * リアルタイムでGPS位置を追跡し、青色の点滅するマーカーを表示
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';
import { Marker } from 'react-native-maps';

interface CurrentLocationMarkerProps {
  latitude: number;
  longitude: number;
  isTracking: boolean; // GPS信号受信中かどうか
}

export const CurrentLocationMarker: React.FC<CurrentLocationMarkerProps> = ({
  latitude,
  longitude,
  isTracking,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isTracking) {
      // GPS信号がない場合は点滅を停止
      pulseAnim.setValue(1);
      return;
    }

    // GPS信号受信中は点滅アニメーション（濃い青⇔薄い青）
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3, // 薄い青（透明度30%）
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1, // 濃い青（透明度100%）
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [isTracking, pulseAnim]);

  return (
    <Marker
      coordinate={{
        latitude,
        longitude,
      }}
      anchor={{ x: 0.5, y: 0.5 }}
      flat={Platform.OS === 'android'}
      tracksViewChanges={false} // パフォーマンス最適化
    >
      <View style={styles.markerContainer}>
        {/* 外側の薄い円（精度範囲を表現） */}
        <View style={styles.outerCircle} />

        {/* 中央の青い点滅する円 */}
        <Animated.View
          style={[
            styles.innerCircle,
            {
              opacity: pulseAnim,
            },
          ]}
        />

        {/* 中心の小さな白い点 */}
        <View style={styles.centerDot} />
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCircle: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(66, 133, 244, 0.15)', // 薄い青（Google Maps風）
    borderWidth: 1,
    borderColor: 'rgba(66, 133, 244, 0.3)',
  },
  innerCircle: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4285F4', // 濃い青（Google Maps Blue）
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  centerDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
});
