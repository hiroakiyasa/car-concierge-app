import React from 'react';
import { Marker } from 'react-native-maps';
import { Spot } from '@/types';

interface CustomMarkerProps {
  spot: Spot;
  rank?: number | null;
  onPress?: () => void;
}

export const CustomMarker: React.FC<CustomMarkerProps> = ({ spot, rank, onPress }) => {
  const isParking = spot.category === 'コインパーキング';
  const title = isParking && rank ? `${rank}. ${spot.name}` : spot.name;
  
  // Simplified marker for Expo Go compatibility
  return (
    <Marker
      coordinate={{ latitude: spot.lat, longitude: spot.lng }}
      onPress={onPress}
      title={title}
      description={spot.address || ''}
    />
  );
};