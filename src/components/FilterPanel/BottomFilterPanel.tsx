import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '@/utils/constants';
import { useMainStore } from '@/stores/useMainStore';
import { Spot, CoinParking } from '@/types';
import { LocationService } from '@/services/location.service';
import { ParkingFeeCalculator } from '@/services/parking-fee.service';
import { ParkingTimeSelector } from './ParkingTimeSelector';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// パネルの高さの状態
const PANEL_MIN_HEIGHT = 280;
const PANEL_MAX_HEIGHT = SCREEN_HEIGHT * 0.65;
const PANEL_COLLAPSED_HEIGHT = 160;

interface BottomFilterPanelProps {
  navigation?: any;
  onHeightChange?: (height: number) => void;
  onSearch?: () => void;
}

export const BottomFilterPanel: React.FC<BottomFilterPanelProps> = ({ navigation, onHeightChange, onSearch }) => {
  const [panelHeight, setPanelHeight] = useState(PANEL_MIN_HEIGHT);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showTimeSelector, setShowTimeSelector] = useState(false);
  const [showingEntryTime, setShowingEntryTime] = useState(true); // true: 入庫時間, false: 出庫時間
  const panY = useRef(new Animated.Value(0)).current;
  const { 
    searchResults, 
    userLocation, 
    selectSpot, 
    setShowingSpotDetail,
    searchFilter,
    setSearchFilter
  } = useMainStore();
  
  // searchResultsに既に含まれている料金でソート（MapScreenで計算済み）
  const parkingSpots = searchResults
    .filter(spot => spot.category === 'コインパーキング')
    .map(spot => {
      // MapScreenで計算された料金を使用
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
    } else {
      setShowingSpotDetail(true);
    }
  };
  
  const formatPrice = (spot: CoinParking & { currentFee?: number }): string => {
    if (spot.currentFee !== undefined) {
      return `¥${spot.currentFee}`;
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
  
  // ドラッグハンドラーの設定
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const newHeight = panelHeight - gestureState.dy;
        if (newHeight >= PANEL_COLLAPSED_HEIGHT && newHeight <= PANEL_MAX_HEIGHT) {
          setPanelHeight(newHeight);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const newHeight = panelHeight - gestureState.dy;
        let finalHeight = panelHeight;
        
        if (gestureState.vy > 0.5) {
          // 下向きに速いスワイプ
          if (panelHeight > PANEL_MIN_HEIGHT) {
            finalHeight = PANEL_MIN_HEIGHT;
          } else {
            finalHeight = PANEL_COLLAPSED_HEIGHT;
            setIsCollapsed(true);
          }
        } else if (gestureState.vy < -0.5) {
          // 上向きに速いスワイプ
          finalHeight = PANEL_MAX_HEIGHT;
          setIsCollapsed(false);
        } else {
          // スナップポイントに合わせる
          if (newHeight < PANEL_COLLAPSED_HEIGHT + 50) {
            finalHeight = PANEL_COLLAPSED_HEIGHT;
            setIsCollapsed(true);
          } else if (newHeight < PANEL_MIN_HEIGHT + 50) {
            finalHeight = PANEL_MIN_HEIGHT;
            setIsCollapsed(false);
          } else {
            finalHeight = PANEL_MAX_HEIGHT;
            setIsCollapsed(false);
          }
        }
        
        setPanelHeight(finalHeight);
        if (onHeightChange) {
          onHeightChange(finalHeight);
        }
        
        // パネルの高さが変わったら再検索
        if (onSearch) {
          setTimeout(() => onSearch(), 300);
        }
      },
    })
  ).current;
  
  return (
    <View style={[styles.container, { height: panelHeight }]}>
      <View style={styles.dragHandle} {...panResponder.panHandlers}>
        <View style={styles.dragIndicator} />
      </View>
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>駐車料金ランキング</Text>
        <View style={styles.headerButtons}>
          {onSearch && (
            <TouchableOpacity
              style={styles.searchButton}
              onPress={onSearch}
            >
              <Ionicons name="search" size={16} color={Colors.white} />
              <Text style={styles.searchButtonText}>この範囲を検索</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => {
              let newHeight = panelHeight;
              if (isCollapsed) {
                newHeight = PANEL_MIN_HEIGHT;
                setIsCollapsed(false);
              } else if (panelHeight === PANEL_MIN_HEIGHT) {
                newHeight = PANEL_MAX_HEIGHT;
              } else {
                newHeight = PANEL_MIN_HEIGHT;
              }
              setPanelHeight(newHeight);
              if (onHeightChange) {
                onHeightChange(newHeight);
              }
            }}
          >
            <Ionicons 
              name={panelHeight > PANEL_MIN_HEIGHT ? 'chevron-down' : 'chevron-up'} 
              size={20} 
              color={Colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>
      </View>
      
      {!isCollapsed && (
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
      )}
      
      {!isCollapsed && (
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={true}
        scrollEnabled={true}
        nestedScrollEnabled={true}
      >
        {parkingSpots.length > 0 ? (
          parkingSpots.map((spot, index) => (
            <TouchableOpacity
              key={spot.id}
              style={styles.spotItem}
              onPress={() => handleSpotPress(spot)}
              activeOpacity={0.7}
            >
              <Text style={styles.spotRankNumber}>{spot.displayRank}</Text>
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
  dragHandle: {
    width: '100%',
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: Colors.divider,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.medium,
    paddingTop: Spacing.small,
    paddingBottom: Spacing.small,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.primary,
  },
  searchButtonText: {
    fontSize: Typography.caption,
    color: Colors.white,
    fontWeight: '500',
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
    paddingBottom: Spacing.small,
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