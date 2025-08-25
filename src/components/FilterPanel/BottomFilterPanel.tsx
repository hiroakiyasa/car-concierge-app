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
import { ParkingFeeCalculator } from '@/services/parking-fee.service';
import { ParkingTimeSelector } from './ParkingTimeSelector';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomFilterPanelProps {
  navigation?: any;
}

export const BottomFilterPanel: React.FC<BottomFilterPanelProps> = ({ navigation }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTimeSelector, setShowTimeSelector] = useState(false);
  const [showingEntryTime, setShowingEntryTime] = useState(true); // true: 入庫時間, false: 出庫時間
  const { 
    searchResults, 
    userLocation, 
    selectSpot, 
    setShowingSpotDetail,
    searchFilter,
    setSearchFilter
  } = useMainStore();
  
  // Filter and sort parking spots
  const parkingSpots = searchResults
    .filter(spot => spot.category === 'コインパーキング')
    .slice(0, 20) as CoinParking[];
  
  const handleSpotPress = (spot: Spot) => {
    selectSpot(spot);
    if (navigation) {
      navigation.navigate('SpotDetail');
    } else {
      setShowingSpotDetail(true);
    }
  };
  
  const formatPrice = (spot: CoinParking): string => {
    if (searchFilter.parkingTimeFilterEnabled) {
      const fee = ParkingFeeCalculator.calculateFee(spot, searchFilter.parkingDuration);
      return `¥${fee}`;
    }
    
    if (!spot.rates || spot.rates.length === 0) return '---';
    const baseRate = spot.rates.find(r => r.type === 'base');
    if (baseRate) {
      return `¥${baseRate.price}`;
    }
    return '¥0';
  };
  
  const formatTimeButton = (): string => {
    if (searchFilter.parkingTimeFilterEnabled) {
      return searchFilter.parkingDuration.formattedDuration;
    }
    return '入庫時間';
  };
  
  const formatEntryTime = (): string => {
    const date = searchFilter.parkingDuration.startDate;
    const day = date.getDate();
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}日 (${dayOfWeek}) ${hours}:${minutes}`;
  };
  
  const formatExitTime = (): string => {
    const date = searchFilter.parkingDuration.endDate;
    const day = date.getDate();
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}日 (${dayOfWeek}) ${hours}:${minutes}`;
  };
  
  const formatDistance = (spot: Spot): string => {
    if (!userLocation) return '';
    const distance = LocationService.calculateDistance(userLocation, spot);
    return LocationService.formatDistance(distance);
  };
  
  return (
    <View style={[styles.container, isExpanded && styles.containerExpanded]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>駐車料金ランキング</Text>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setIsExpanded(!isExpanded)}
        >
          <Text style={styles.toggleButtonText}>同期済み</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.timeSection}>
        <View style={styles.timeRow}>
          <TouchableOpacity 
            style={styles.timeLabelButton}
            onPress={() => setShowTimeSelector(true)}
          >
            <Ionicons name="car" size={16} color={Colors.success} />
            <Text style={styles.timeLabelText}>入庫時間</Text>
          </TouchableOpacity>
          <View style={styles.timeValueContainer}>
            <Text style={styles.timeValue}>{formatEntryTime()}</Text>
          </View>
        </View>
        
        <View style={styles.timeDurationRow}>
          <TouchableOpacity 
            style={styles.durationButton}
            onPress={() => setShowTimeSelector(true)}
          >
            <Ionicons name="chevron-down" size={16} color={Colors.primary} />
            <Text style={styles.durationText}>駐車時間</Text>
            <Text style={styles.durationValue}>{searchFilter.parkingDuration.formattedDuration || '1時間0分'}</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.timeRow}>
          <TouchableOpacity 
            style={styles.timeLabelButton}
            onPress={() => setShowTimeSelector(true)}
          >
            <Ionicons name="car" size={16} color={Colors.error} />
            <Text style={styles.timeLabelText}>出庫時間</Text>
          </TouchableOpacity>
          <View style={styles.timeValueContainer}>
            <Text style={styles.timeValue}>{formatExitTime()}</Text>
          </View>
        </View>
      </View>
      
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={isExpanded}
      >
        {parkingSpots.length > 0 ? (
          parkingSpots.map((spot, index) => (
            <TouchableOpacity
              key={spot.id}
              style={styles.spotItem}
              onPress={() => handleSpotPress(spot)}
              activeOpacity={0.7}
            >
              <Text style={styles.spotRankNumber}>{index + 1}</Text>
              <View style={styles.spotInfo}>
                <Text style={styles.spotName} numberOfLines={1}>
                  {spot.name}
                </Text>
              </View>
              <Text style={styles.spotPrice}>{formatPrice(spot)}</Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>地図上のエリアを検索してください</Text>
          </View>
        )}
      </ScrollView>
      
      <ParkingTimeSelector
        duration={searchFilter.parkingDuration}
        onDurationChange={(duration) => {
          setSearchFilter({
            ...searchFilter,
            parkingDuration: duration,
            parkingTimeFilterEnabled: true
          });
        }}
        visible={showTimeSelector}
        onClose={() => setShowTimeSelector(false)}
      />
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
    height: 280,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  containerExpanded: {
    height: SCREEN_HEIGHT * 0.6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.medium,
    paddingTop: Spacing.medium,
    paddingBottom: Spacing.small,
  },
  headerTitle: {
    fontSize: Typography.bodySmall,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  toggleButtonText: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
  },
  timeSection: {
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  timeDurationRow: {
    paddingLeft: 24,
    paddingVertical: 4,
  },
  timeLabelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 100,
  },
  timeLabelText: {
    fontSize: Typography.bodySmall,
    color: Colors.textPrimary,
  },
  timeValueContainer: {
    flex: 1,
  },
  timeValue: {
    fontSize: Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  durationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  durationText: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
  },
  durationValue: {
    fontSize: Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.medium,
  },
  spotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.divider,
  },
  spotRankNumber: {
    width: 20,
    fontSize: Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginRight: Spacing.small,
  },
  spotInfo: {
    flex: 1,
    marginRight: Spacing.small,
  },
  spotName: {
    fontSize: Typography.bodySmall,
    color: Colors.textPrimary,
  },
  spotPrice: {
    fontSize: Typography.bodySmall,
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyState: {
    padding: Spacing.large,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
  },
});