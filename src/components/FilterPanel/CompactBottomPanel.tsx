import React, { useState, useEffect } from 'react';
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
import { ParkingFeeCalculator } from '@/services/parking-fee.service';
import { ParkingTimeSelector } from './ParkingTimeSelector';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// パネルの高さの状態（2パターンのみ）
const PANEL_COLLAPSED_HEIGHT = 100; // 最小時: 入出庫時間のみ
const PANEL_EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.33; // 展開時: 画面の1/3

interface CompactBottomPanelProps {
  navigation?: any;
  onHeightChange?: (height: number, isExpanded: boolean) => void;
  onSearch?: (isExpanded: boolean) => void;
}

export const CompactBottomPanel: React.FC<CompactBottomPanelProps> = ({ 
  navigation, 
  onHeightChange, 
  onSearch 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTimeSelector, setShowTimeSelector] = useState(false);
  
  const { 
    searchResults, 
    selectSpot,
    searchFilter,
    setSearchFilter
  } = useMainStore();
  
  // パネル高さが変更されたらコールバック
  useEffect(() => {
    const height = isExpanded ? PANEL_EXPANDED_HEIGHT : PANEL_COLLAPSED_HEIGHT;
    if (onHeightChange) {
      onHeightChange(height, isExpanded);
    }
  }, [isExpanded, onHeightChange]);
  
  // searchResultsに既に含まれている料金でソート
  const parkingSpots = searchResults
    .filter(spot => spot.category === 'コインパーキング')
    .map(spot => {
      const fee = (spot as any).calculatedFee || 0;
      return {
        ...spot,
        currentFee: fee
      };
    })
    .sort((a, b) => a.currentFee - b.currentFee)
    .slice(0, 20)
    .map((spot, index) => ({
      ...spot,
      displayRank: index + 1
    })) as (CoinParking & { currentFee: number; displayRank: number })[];
  
  const handleSpotPress = (spot: Spot) => {
    selectSpot(spot);
    if (navigation) {
      navigation.navigate('SpotDetail');
    }
  };
  
  const formatPrice = (spot: CoinParking & { currentFee?: number }): string => {
    if (spot.currentFee !== undefined) {
      return `¥${spot.currentFee}`;
    }
    return '¥0';
  };
  
  const formatEntryTime = (): string => {
    const date = searchFilter.parkingDuration.startDate;
    const month = (date.getMonth() + 1).toString();
    const day = date.getDate().toString();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
  };
  
  const formatExitTime = (): string => {
    const date = searchFilter.parkingDuration.endDate;
    const month = (date.getMonth() + 1).toString();
    const day = date.getDate().toString();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
  };
  
  const togglePanel = () => {
    setIsExpanded(!isExpanded);
  };
  
  const handleSearch = () => {
    if (onSearch) {
      onSearch(isExpanded);
    }
  };
  
  return (
    <View style={[
      styles.container, 
      isExpanded ? styles.containerExpanded : styles.containerCollapsed
    ]}>
      {/* ドラッグハンドル */}
      <TouchableOpacity 
        style={styles.dragHandle} 
        onPress={togglePanel}
        activeOpacity={0.9}
      >
        <View style={styles.dragIndicator} />
      </TouchableOpacity>
      
      {/* 時間表示部分（常に表示） */}
      <View style={styles.timeSection}>
        <TouchableOpacity 
          style={styles.timeEntry}
          onPress={() => setShowTimeSelector(true)}
        >
          <Ionicons name="log-in-outline" size={16} color={Colors.success} />
          <Text style={styles.timeLabel}>入庫</Text>
          <Text style={styles.timeValue}>{formatEntryTime()}</Text>
        </TouchableOpacity>
        
        <View style={styles.durationContainer}>
          <Ionicons name="time-outline" size={14} color={Colors.primary} />
          <Text style={styles.durationText}>
            {searchFilter.parkingDuration.formattedDuration || '1時間'}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.timeEntry}
          onPress={() => setShowTimeSelector(true)}
        >
          <Ionicons name="log-out-outline" size={16} color={Colors.error} />
          <Text style={styles.timeLabel}>出庫</Text>
          <Text style={styles.timeValue}>{formatExitTime()}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
        >
          <Ionicons name="search" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>
      
      {/* ランキングリスト（展開時のみ表示） */}
      {isExpanded && (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={true}
          scrollEnabled={true}
        >
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>駐車料金ランキング</Text>
            <Text style={styles.listSubtitle}>
              {parkingSpots.length}件の駐車場
            </Text>
          </View>
          
          {parkingSpots.length > 0 ? (
            parkingSpots.map((spot) => (
              <TouchableOpacity
                key={spot.id}
                style={styles.spotItem}
                onPress={() => handleSpotPress(spot)}
                activeOpacity={0.7}
              >
                <View style={styles.rankBadge}>
                  <Text style={styles.rankNumber}>{spot.displayRank}</Text>
                </View>
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
              <Ionicons name="car-outline" size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyText}>検索ボタンを押して</Text>
              <Text style={styles.emptyText}>駐車場を検索してください</Text>
            </View>
          )}
        </ScrollView>
      )}
      
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
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  containerCollapsed: {
    height: PANEL_COLLAPSED_HEIGHT,
  },
  containerExpanded: {
    height: PANEL_EXPANDED_HEIGHT,
  },
  dragHandle: {
    width: '100%',
    paddingVertical: 8,
    alignItems: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: Colors.divider,
    borderRadius: 2,
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
    gap: 8,
  },
  timeEntry: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeLabel: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
  },
  timeValue: {
    fontSize: Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.background,
    borderRadius: 12,
  },
  durationText: {
    fontSize: Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  searchButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
    backgroundColor: Colors.background,
  },
  listTitle: {
    fontSize: Typography.bodySmall,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  listSubtitle: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
  },
  spotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.medium,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.divider,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.small,
  },
  rankNumber: {
    fontSize: Typography.caption,
    color: Colors.white,
    fontWeight: 'bold',
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
    fontSize: Typography.body,
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyState: {
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: Spacing.small,
  },
});