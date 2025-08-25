import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '@/utils/constants';
import { useMainStore } from '@/stores/useMainStore';

interface MapControlsProps {
  onSearch: () => void;
  onLocationPress: () => void;
  isLoading?: boolean;
}

export const MapControls: React.FC<MapControlsProps> = ({
  onSearch,
  onLocationPress,
  isLoading = false,
}) => {
  const { searchFilter, setSearchFilter } = useMainStore();
  
  const ParkingTypeButton: React.FC<{
    label: string;
    filterKey: 'showFlatParking' | 'showMultiStoryParking' | 'showMechanicalParking';
  }> = ({ label, filterKey }) => {
    const isActive = searchFilter[filterKey];
    
    return (
      <TouchableOpacity
        style={[styles.typeButton, isActive && styles.typeButtonActive]}
        onPress={() => setSearchFilter({ [filterKey]: !isActive })}
      >
        <Text style={[styles.typeButtonText, isActive && styles.typeButtonTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.leftControls}>
        <ParkingTypeButton label="平面" filterKey="showFlatParking" />
        <ParkingTypeButton label="立体" filterKey="showMultiStoryParking" />
        <ParkingTypeButton label="機械" filterKey="showMechanicalParking" />
      </View>
      
      <TouchableOpacity
        style={styles.searchButton}
        onPress={onSearch}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Text style={styles.searchButtonText}>この範囲を検索</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.locationButton}
        onPress={onLocationPress}
        activeOpacity={0.7}
      >
        <Ionicons name="location" size={20} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 300,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftControls: {
    flexDirection: 'row',
    gap: 4,
  },
  typeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  typeButtonActive: {
    backgroundColor: Colors.primary,
  },
  typeButtonText: {
    fontSize: 11,
    color: Colors.primary,
  },
  typeButtonTextActive: {
    color: Colors.white,
  },
  searchButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  searchButtonText: {
    color: Colors.white,
    fontSize: Typography.bodySmall,
    fontWeight: '600',
  },
  locationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
});