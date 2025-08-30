import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '@/utils/constants';
import { useMainStore } from '@/stores/useMainStore';
import { ParkingTimeSelector } from './ParkingTimeSelector';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// パネルの高さ（固定）
const PANEL_HEIGHT = 130; // 入出庫時間のみ

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
  const [showTimeSelector, setShowTimeSelector] = useState(false);
  const [timeSelectorMode, setTimeSelectorMode] = useState<'entry' | 'duration' | 'exit'>('entry');
  const [activeTab, setActiveTab] = useState<'parking' | 'nearby' | 'elevation'>('parking');
  const [minElevation, setMinElevation] = useState(0);
  
  const { 
    searchFilter,
    setSearchFilter
  } = useMainStore();
  
  // パネル高さを通知
  useEffect(() => {
    if (onHeightChange) {
      onHeightChange(PANEL_HEIGHT, false);
    }
  }, [onHeightChange]);
  
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
  
  const handleSearch = () => {
    // 標高タブが選択されている場合は、最低標高をフィルターに設定
    if (activeTab === 'elevation') {
      setSearchFilter({
        ...searchFilter,
        minElevation: minElevation,
        elevationFilterEnabled: true
      });
    } else {
      // 標高タブ以外の場合は標高フィルターを無効化
      setSearchFilter({
        ...searchFilter,
        elevationFilterEnabled: false
      });
    }
    if (onSearch) {
      onSearch(false);
    }
  };
  
  // 温度差を計算（100mごとに0.6℃下がる）
  const calculateTemperatureDrop = (elevation: number) => {
    return (elevation / 100 * 0.6).toFixed(1);
  };
  
  return (
    <View style={styles.container}>
      
      {/* フィルタータブ */}
      <View style={styles.filterTabs}>
        <TouchableOpacity 
          style={[styles.filterTab, activeTab === 'parking' && styles.activeTab]}
          onPress={() => setActiveTab('parking')}
        >
          <Ionicons 
            name="time-outline" 
            size={18} 
            color={activeTab === 'parking' ? Colors.white : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'parking' && styles.activeTabText]}>
            駐車料金
          </Text>
          {activeTab === 'parking' && (
            <Ionicons name="checkmark" size={14} color={Colors.white} style={styles.checkIcon} />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterTab, activeTab === 'nearby' && styles.activeTab]}
          onPress={() => setActiveTab('nearby')}
        >
          <Ionicons 
            name="search-outline" 
            size={18} 
            color={activeTab === 'nearby' ? Colors.white : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'nearby' && styles.activeTabText]}>
            周辺検索
          </Text>
          {activeTab === 'nearby' && (
            <Ionicons name="checkmark" size={14} color={Colors.white} style={styles.checkIcon} />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterTab, activeTab === 'elevation' && styles.activeTab]}
          onPress={() => setActiveTab('elevation')}
        >
          <Ionicons 
            name="trending-up-outline" 
            size={18} 
            color={activeTab === 'elevation' ? Colors.white : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'elevation' && styles.activeTabText]}>
            標高
          </Text>
          {activeTab === 'elevation' && (
            <Ionicons name="checkmark" size={14} color={Colors.white} style={styles.checkIcon} />
          )}
        </TouchableOpacity>
      </View>
      
      {/* コンテンツ部分（タブによって切り替え） */}
      <View style={styles.premiumTimeSection}>
        {activeTab === 'parking' && (
          <>
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
          </>
        )}
        
        {activeTab === 'elevation' && (
          <View style={styles.elevationContent}>
            <View style={styles.sliderContainer}>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={2000}
                value={minElevation}
                onValueChange={setMinElevation}
                minimumTrackTintColor={Colors.primary}
                maximumTrackTintColor="#E0E0E0"
                thumbTintColor={Colors.primary}
                step={50}
              />
              <View style={styles.elevationInfo}>
                <Text style={styles.elevationValue}>
                  最低標高: {minElevation}m
                </Text>
                <Text style={styles.temperatureText}>
                  温度差: -{calculateTemperatureDrop(minElevation)}℃
                </Text>
              </View>
            </View>
          </View>
        )}
        
        {activeTab === 'nearby' && (
          <View style={styles.nearbyContent}>
            <Text style={styles.nearbyText}>周辺施設から検索</Text>
            <Text style={styles.nearbyDescription}>
              地図上の施設から近い駐車場を検索します
            </Text>
          </View>
        )}
        
        <TouchableOpacity
          style={styles.searchButtonPremium}
          onPress={handleSearch}
        >
          <Ionicons name="search" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>
      
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
    height: PANEL_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  dragIndicator: {
    width: 48,
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    gap: 4,
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.white,
  },
  checkIcon: {
    marginLeft: 2,
  },
  premiumTimeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 6,
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
    fontSize: 20,
    color: '#1A1A1A',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 10,
    color: '#999',
    marginTop: 1,
  },
  durationBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: Colors.primary + '10',
    borderRadius: 16,
  },
  durationValue: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  durationLabel: {
    fontSize: 9,
    color: Colors.primary,
    fontWeight: '500',
    marginTop: 1,
  },
  searchButtonPremium: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  elevationContent: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 10,
  },
  sliderContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  slider: {
    flex: 1,
    height: 40,
  },
  elevationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: 4,
  },
  elevationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  temperatureText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  nearbyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  nearbyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  nearbyDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});