import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '@/utils/constants';
import { useMainStore } from '@/stores/useMainStore';
import { Spot, CoinParking } from '@/types';
import { LocationService } from '@/services/location.service';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const BottomFilterPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { searchResults, userLocation, selectSpot, setShowingSpotDetail } = useMainStore();
  
  // Filter and sort parking spots
  const parkingSpots = searchResults
    .filter(spot => spot.category === 'コインパーキング')
    .slice(0, 20) as CoinParking[];
  
  const handleSpotPress = (spot: Spot) => {
    selectSpot(spot);
    setShowingSpotDetail(true);
  };
  
  const formatPrice = (spot: CoinParking): string => {
    if (!spot.rates || spot.rates.length === 0) return '---';
    const baseRate = spot.rates.find(r => r.type === 'base');
    if (baseRate) {
      return `¥${baseRate.price}`;
    }
    return '¥0';
  };
  
  const formatDistance = (spot: Spot): string => {
    if (!userLocation) return '';
    const distance = LocationService.calculateDistance(userLocation, spot);
    return LocationService.formatDistance(distance);
  };
  
  return (
    <View style={[styles.container, isExpanded && styles.containerExpanded]}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.9}
      >
        <Text style={styles.headerTitle}>駐車料金ランキング</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.timeButton}>
            <Ionicons name="time-outline" size={16} color={Colors.primary} />
            <Text style={styles.timeButtonText}>入庫時間</Text>
          </TouchableOpacity>
          <Ionicons
            name={isExpanded ? 'chevron-down' : 'chevron-up'}
            size={20}
            color={Colors.textSecondary}
          />
        </View>
      </TouchableOpacity>
      
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={isExpanded}
      >
        {parkingSpots.map((spot, index) => (
          <TouchableOpacity
            key={spot.id}
            style={styles.spotItem}
            onPress={() => handleSpotPress(spot)}
            activeOpacity={0.7}
          >
            <View style={styles.spotRank}>
              <Text style={styles.spotRankText}>{index + 1}</Text>
            </View>
            <View style={styles.spotInfo}>
              <Text style={styles.spotName} numberOfLines={1}>
                {spot.name}
              </Text>
              <Text style={styles.spotDistance}>
                {formatDistance(spot)}
              </Text>
            </View>
            <Text style={styles.spotPrice}>{formatPrice(spot)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: 120,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  containerExpanded: {
    height: SCREEN_HEIGHT * 0.4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerTitle: {
    fontSize: Typography.h6,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  timeButtonText: {
    fontSize: Typography.caption,
    color: Colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.medium,
  },
  spotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  spotRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.small,
  },
  spotRankText: {
    color: Colors.white,
    fontSize: Typography.caption,
    fontWeight: 'bold',
  },
  spotInfo: {
    flex: 1,
    marginRight: Spacing.small,
  },
  spotName: {
    fontSize: Typography.bodySmall,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  spotDistance: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
  },
  spotPrice: {
    fontSize: Typography.body,
    fontWeight: '600',
    color: Colors.primary,
  },
});