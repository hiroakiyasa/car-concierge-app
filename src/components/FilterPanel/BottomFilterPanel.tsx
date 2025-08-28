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
  const [timeSelectorMode, setTimeSelectorMode] = useState<'entry' | 'duration' | 'exit'>('entry');
  const panY = useRef(new Animated.Value(0)).current;
  
  // デバッグ: レンダリングの確認
  console.log('🔥 BottomFilterPanel rendering - version 2.0 with 2-row layout');
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
  
  const formatEntryDateTime = (): { date: string; time: string; dayOfWeek: string } => {
    const date = searchFilter.parkingDuration.startDate;
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return {
      date: `${month}月${day}日`,
      dayOfWeek: `(${dayOfWeek})`,
      time: `${hours}:${minutes}`
    };
  };
  
  const formatExitDateTime = (): { date: string; time: string; dayOfWeek: string } => {
    const date = searchFilter.parkingDuration.endDate;
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return {
      date: `${month}月${day}日`,
      dayOfWeek: `(${dayOfWeek})`,
      time: `${hours}:${minutes}`
    };
  };
  
  const formatDuration = (): string => {
    const duration = searchFilter.parkingDuration.duration;
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    if (hours > 0 && minutes > 0) {
      return `${hours}時間${minutes}分`;
    } else if (hours > 0) {
      return `${hours}時間`;
    } else {
      return `${minutes}分`;
    }
  };
  
  const handleTimeSelectorOpen = (mode: 'entry' | 'duration' | 'exit') => {
    setTimeSelectorMode(mode);
    setShowTimeSelector(true);
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
        {/* First Row - Labels with Duration */}
        <View style={styles.timeFirstRow}>
          <View style={styles.entryLabelSection}>
            <Ionicons name="log-in" size={18} color={Colors.success} />
            <Text style={styles.timeLabelText}>入庫</Text>
          </View>
          
          <TouchableOpacity
            style={styles.centerDurationSection}
            onPress={() => handleTimeSelectorOpen('duration')}
          >
            <Ionicons name="time-outline" size={18} color={Colors.primary} />
            <Text style={styles.durationText}>{formatDuration()}</Text>
            <Text style={styles.durationLabel}>駐車時間</Text>
          </TouchableOpacity>
          
          <View style={styles.exitLabelSection}>
            <Ionicons name="log-out" size={18} color={Colors.error} />
            <Text style={styles.timeLabelText}>出庫</Text>
          </View>
        </View>
        
        {/* Second Row - Date Times with Search Button */}
        <View style={styles.timeSecondRow}>
          <TouchableOpacity
            style={styles.entryDateTimeArea}
            onPress={() => handleTimeSelectorOpen('entry')}
          >
            <Text style={styles.dateText}>{formatEntryDateTime().date}</Text>
            <Text style={styles.bigTimeText}>{formatEntryDateTime().time}</Text>
          </TouchableOpacity>
          
          <View style={styles.spacer} />
          
          <TouchableOpacity
            style={styles.exitDateTimeArea}
            onPress={() => handleTimeSelectorOpen('exit')}
          >
            <Text style={styles.dateText}>{formatExitDateTime().date}</Text>
            <Text style={styles.bigTimeText}>{formatExitDateTime().time}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.searchButtonLarge}
            onPress={onSearch}
          >
            <Ionicons name="search" size={26} color={Colors.white} />
          </TouchableOpacity>
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
        mode={timeSelectorMode}
        onDurationChange={(duration) => {
          setSearchFilter({
            ...searchFilter,
            parkingDuration: duration,
            parkingTimeFilterEnabled: true
          });
          if (onSearch) {
            setTimeout(() => onSearch(), 300);
          }
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
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: Colors.primary,
  },
  searchButtonText: {
    fontSize: Typography.bodySmall,
    color: Colors.white,
    fontWeight: '600',
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
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.white,
  },
  timeFirstRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  timeSecondRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entryLabelSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  centerDurationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: Colors.background,
    borderRadius: 12,
  },
  exitLabelSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'flex-end',
  },
  timeLabelText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  durationText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '700',
  },
  durationLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  entryDateTimeArea: {
    flex: 1,
  },
  exitDateTimeArea: {
    flex: 1,
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  bigTimeText: {
    fontSize: 22,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  spacer: {
    width: 20,
  },
  searchButtonLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
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