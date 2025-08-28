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
import { ParkingTimeSelector } from './ParkingTimeSelector';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// パネルの高さの状態（2パターンのみ）
const PANEL_COLLAPSED_HEIGHT = 130; // 最小時: 入出庫時間のみ
const PANEL_EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.4; // 展開時: 画面の40%

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
  const [timeSelectorMode, setTimeSelectorMode] = useState<'entry' | 'duration' | 'exit'>('entry');
  
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
      return `¥${spot.currentFee.toLocaleString()}`;
    }
    return '¥0';
  };
  
  const formatTime = (date: Date): { date: string; time: string; dayOfWeek: string } => {
    const month = (date.getMonth() + 1).toString();
    const day = date.getDate().toString();
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return {
      date: `${month}/${day}`,
      dayOfWeek: `(${dayOfWeek})`,
      time: `${hours}:${minutes}`
    };
  };
  
  const entryDateTime = formatTime(searchFilter.parkingDuration.startDate);
  const exitDateTime = formatTime(searchFilter.parkingDuration.endDate);
  
  const handleTimeSelectorOpen = (mode: 'entry' | 'duration' | 'exit') => {
    setTimeSelectorMode(mode);
    setShowTimeSelector(true);
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
      
      {/* プレミアムな時間表示部分 */}
      <View style={styles.premiumTimeSection}>
        <TouchableOpacity 
          style={styles.timeBlock}
          onPress={() => handleTimeSelectorOpen('entry')}
        >
          <View style={styles.timeHeader}>
            <Ionicons name="log-in" size={20} color='#4CAF50' />
            <Text style={styles.timeLabel}>入庫</Text>
          </View>
          <Text style={styles.bigTime}>{entryDateTime.time}</Text>
          <Text style={styles.dateText}>
            {entryDateTime.date} {entryDateTime.dayOfWeek}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.durationBlock}
          onPress={() => handleTimeSelectorOpen('duration')}
        >
          <Ionicons name="time" size={24} color={Colors.primary} />
          <Text style={styles.durationValue}>
            {searchFilter.parkingDuration.formattedDuration || '1時間'}
          </Text>
          <Text style={styles.durationLabel}>駐車時間</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.timeBlock}
          onPress={() => handleTimeSelectorOpen('exit')}
        >
          <View style={styles.timeHeader}>
            <Ionicons name="log-out" size={20} color='#F44336' />
            <Text style={styles.timeLabel}>出庫</Text>
          </View>
          <Text style={styles.bigTime}>{exitDateTime.time}</Text>
          <Text style={styles.dateText}>
            {exitDateTime.date} {exitDateTime.dayOfWeek}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.searchButtonPremium}
          onPress={handleSearch}
        >
          <Ionicons name="search" size={28} color={Colors.white} />
        </TouchableOpacity>
      </View>
      
      {/* ランキングリスト（展開時のみ表示） */}
      {isExpanded && (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
        >
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>🏆 駐車料金ランキング</Text>
            <Text style={styles.listSubtitle}>
              TOP {parkingSpots.length}
            </Text>
          </View>
          
          {parkingSpots.length > 0 ? (
            parkingSpots.map((spot) => (
              <TouchableOpacity
                key={spot.id}
                style={styles.premiumSpotItem}
                onPress={() => handleSpotPress(spot)}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.rankBadgePremium,
                  spot.displayRank === 1 && styles.goldBadge,
                  spot.displayRank === 2 && styles.silverBadge,
                  spot.displayRank === 3 && styles.bronzeBadge,
                ]}>
                  <Text style={styles.rankNumberPremium}>{spot.displayRank}</Text>
                </View>
                <View style={styles.spotInfo}>
                  <Text style={styles.spotNamePremium} numberOfLines={1}>
                    {spot.name}
                  </Text>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={styles.spotPricePremium}>{formatPrice(spot)}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="car" size={64} color={Colors.textSecondary} />
              <Text style={styles.emptyTextLarge}>エリアを選択</Text>
              <Text style={styles.emptyText}>検索ボタンを押して</Text>
              <Text style={styles.emptyText}>駐車場を探しましょう</Text>
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  dragIndicator: {
    width: 48,
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
  },
  premiumTimeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 10,
    backgroundColor: '#FAFAFA',
  },
  timeBlock: {
    flex: 1,
    alignItems: 'center',
  },
  timeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  bigTime: {
    fontSize: 24,
    color: '#1A1A1A',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  durationBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.primary + '10',
    borderRadius: 18,
  },
  durationValue: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: '700',
    marginTop: 4,
  },
  durationLabel: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  searchButtonPremium: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  content: {
    flex: 1,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#F8F9FA',
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  listSubtitle: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  premiumSpotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 8,
    marginVertical: 1,
    borderRadius: 8,
  },
  rankBadgePremium: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  goldBadge: {
    backgroundColor: '#FFD700',
  },
  silverBadge: {
    backgroundColor: '#C0C0C0',
  },
  bronzeBadge: {
    backgroundColor: '#CD7F32',
  },
  rankNumberPremium: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '700',
  },
  spotInfo: {
    flex: 1,
    marginRight: 8,
  },
  spotNamePremium: {
    fontSize: 13,
    color: '#1A1A1A',
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  priceContainer: {
    backgroundColor: Colors.primary + '08',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  spotPricePremium: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTextLarge: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
});