import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Spot } from '@/types';

interface CustomMarkerProps {
  spot: Spot;
  rank?: number | null;
  onPress?: () => void;
}

const getMarkerColor = (category: string): string => {
  switch (category) {
    case 'コインパーキング': return '#007AFF'; // iOSブルー
    case 'コンビニ': return '#FF9500'; // オレンジ
    case '温泉': return '#FF3B30'; // 赤
    case 'ガソリンスタンド': return '#FF3B30'; // 赤
    case 'お祭り・花火大会': return '#AF52DE'; // 紫
    default: return '#8E8E93';
  }
};

const getMarkerIcon = (category: string): string => {
  switch (category) {
    case 'コインパーキング': return 'P';
    case 'コンビニ': return '🏪';
    case '温泉': return '♨️';
    case 'ガソリンスタンド': return '⛽';
    case 'お祭り・花火大会': return '🎆';
    default: return '📍';
  }
};

export const CustomMarker: React.FC<CustomMarkerProps> = ({ spot, rank, onPress }) => {
  // For parking spots with ranking, show custom blue marker with number
  if (spot.category === 'コインパーキング' && rank && rank <= 20) {
    return (
      <Marker
        coordinate={{
          latitude: spot.lat,
          longitude: spot.lng,
        }}
        onPress={onPress}
        tracksViewChanges={false}
        anchor={{ x: 0.5, y: 1 }}
      >
        <View style={styles.parkingMarker}>
          <Text style={styles.parkingMarkerText}>{rank}</Text>
        </View>
      </Marker>
    );
  }

  // For other categories, show colored marker with icon
  return (
    <Marker
      coordinate={{
        latitude: spot.lat,
        longitude: spot.lng,
      }}
      onPress={onPress}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View style={[styles.categoryMarker, { backgroundColor: getMarkerColor(spot.category) }]}>
        <Text style={styles.categoryMarkerIcon}>{getMarkerIcon(spot.category)}</Text>
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  parkingMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  parkingMarkerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  categoryMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  categoryMarkerIcon: {
    fontSize: 18,
  },
});