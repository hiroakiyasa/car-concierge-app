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
const PANEL_HEIGHT = 145; // 5%増加して余裕を持たせる

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
  const [sliderValue, setSliderValue] = useState(0); // 0-100のスライダー値
  const [convenienceRadius, setConvenienceRadius] = useState(0); // コンビニ検索半径
  const [hotspringRadius, setHotspringRadius] = useState(0); // 温泉検索半径
  const [convenienceSlider, setConvenienceSlider] = useState(0); // コンビニスライダー値 0-100
  const [hotspringSlider, setHotspringSlider] = useState(0); // 温泉スライダー値 0-100
  const [convenienceSelected, setConvenienceSelected] = useState(false); // コンビニ選択状態
  const [hotspringSelected, setHotspringSelected] = useState(false); // 温泉選択状態
  
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
    // タブに応じてフィルターを設定
    if (activeTab === 'elevation') {
      setSearchFilter({
        ...searchFilter,
        minElevation: minElevation,
        elevationFilterEnabled: true,
        nearbyFilterEnabled: false
      });
    } else if (activeTab === 'nearby') {
      // 選択された施設の検索半径を設定
      const effectiveConvenienceRadius = convenienceSelected ? convenienceRadius : 0;
      const effectiveHotspringRadius = hotspringSelected ? hotspringRadius : 0;
      const isNearbyActive = effectiveConvenienceRadius > 0 || effectiveHotspringRadius > 0;
      
      setSearchFilter({
        ...searchFilter,
        elevationFilterEnabled: false,
        nearbyFilterEnabled: isNearbyActive,
        convenienceRadius: effectiveConvenienceRadius,
        hotspringRadius: effectiveHotspringRadius
      });
    } else {
      // 駐車料金タブの場合は両方のフィルターを無効化
      setSearchFilter({
        ...searchFilter,
        elevationFilterEnabled: false,
        nearbyFilterEnabled: false
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
  
  // 周辺検索用のスライダー変換関数
  // 左半分(0-50): 0-100m (10m単位)
  // 右半分(50-100): 100-1000m (100m単位)
  const sliderToRadius = (value: number): number => {
    if (value === 0) return 0;
    
    // 0-50%: 0-100m (10m単位)
    if (value <= 50) {
      return Math.round((value / 50) * 100 / 10) * 10;
    }
    // 50-100%: 100-1000m (100m単位)
    else {
      const normalized = (value - 50) / 50;
      return 100 + Math.round(normalized * 900 / 100) * 100;
    }
  };
  
  const radiusToSlider = (radius: number): number => {
    if (radius === 0) return 0;
    
    // 0-100m
    if (radius <= 100) {
      return (radius / 100) * 50;
    }
    // 100-1000m
    else {
      return 50 + ((radius - 100) / 900) * 50;
    }
  };
  
  const handleConvenienceSliderChange = (value: number) => {
    setConvenienceSlider(value);
    setConvenienceRadius(sliderToRadius(value));
  };
  
  const handleHotspringSliderChange = (value: number) => {
    setHotspringSlider(value);
    setHotspringRadius(sliderToRadius(value));
  };
  
  // 対数スケール変換関数（低標高域により細かい粒度、高標高域により広い粒度）
  const sliderToElevation = (value: number): number => {
    // 0-100のスライダー値を0-2000mの対数スケールに変換
    if (value === 0) return 0;
    if (value === 100) return 2000;
    
    // より強い対数カーブを使用（べき乗を調整）
    // 低標高域: より細かい粒度
    // 高標高域: より広い粒度
    const power = 2.5; // べき乗を大きくすることで、高標高域の粒度を広げる
    const normalizedValue = value / 100;
    const elevation = 2000 * Math.pow(normalizedValue, power);
    
    return Math.round(elevation / 10) * 10; // 10m単位に丸める
  };
  
  const elevationToSlider = (elevation: number): number => {
    // 標高を0-100のスライダー値に変換
    if (elevation === 0) return 0;
    if (elevation >= 2000) return 100;
    
    const power = 2.5;
    const normalizedElevation = elevation / 2000;
    const value = 100 * Math.pow(normalizedElevation, 1 / power);
    
    return Math.max(0, Math.min(100, value));
  };
  
  // スライダー値が変更されたときに標高を更新
  const handleSliderChange = (value: number) => {
    setSliderValue(value);
    setMinElevation(sliderToElevation(value));
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
              <View style={styles.sliderWrapper}>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100}
                  value={sliderValue}
                  onValueChange={handleSliderChange}
                  minimumTrackTintColor="#E0E0E0"
                  maximumTrackTintColor={Colors.primary}
                  thumbTintColor={Colors.primary}
                  step={1}
                />
                {/* スケールラベル */}
                <View style={styles.scaleLabels}>
                  <Text style={[styles.scaleLabel, { left: '0%' }]}>0</Text>
                  <Text style={[styles.scaleLabel, styles.tsunamiLabel, { left: `${elevationToSlider(30) - 5}%` }]}>
                    30m(津波最大)
                  </Text>
                  <Text style={[styles.scaleLabel, { left: `${elevationToSlider(500) - 2}%` }]}>500</Text>
                  <Text style={[styles.scaleLabel, { left: `${elevationToSlider(1000) - 3}%` }]}>1000</Text>
                  <Text style={[styles.scaleLabel, { right: '-5%' }]}>2000</Text>
                </View>
              </View>
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
            <View style={styles.nearbyFacilities}>
              {/* コンビニ */}
              <View style={styles.facilityRow}>
                <TouchableOpacity
                  style={[styles.facilityButton, convenienceSelected && styles.facilityButtonActive]}
                  onPress={() => {
                    const newSelected = !convenienceSelected;
                    setConvenienceSelected(newSelected);
                    // 選択時にデフォルト30mを設定
                    if (newSelected && convenienceRadius === 0) {
                      setConvenienceRadius(30);
                      setConvenienceSlider(radiusToSlider(30));
                    }
                  }}
                >
                  <Text style={styles.facilityIcon}>🏪</Text>
                  <Text style={[styles.facilityName, convenienceSelected && styles.facilityNameActive]}>
                    コンビニ
                  </Text>
                </TouchableOpacity>
                <View style={styles.sliderSection}>
                  <Slider
                    style={styles.horizontalSlider}
                    minimumValue={0}
                    maximumValue={100}
                    value={convenienceSlider}
                    onValueChange={handleConvenienceSliderChange}
                    minimumTrackTintColor={convenienceSelected ? Colors.primary : '#E0E0E0'}
                    maximumTrackTintColor="#E0E0E0"
                    thumbTintColor={convenienceSelected ? Colors.primary : '#999'}
                    step={1}
                    disabled={!convenienceSelected}
                  />
                  <Text style={[styles.radiusValue, !convenienceSelected && styles.radiusValueDisabled]}>
                    {convenienceRadius > 0 ? `${convenienceRadius}m` : '0m'}
                  </Text>
                </View>
              </View>
              
              {/* 温泉 */}
              <View style={styles.facilityRow}>
                <TouchableOpacity
                  style={[styles.facilityButton, hotspringSelected && styles.facilityButtonActive]}
                  onPress={() => {
                    const newSelected = !hotspringSelected;
                    setHotspringSelected(newSelected);
                    // 選択時にデフォルト100mを設定
                    if (newSelected && hotspringRadius === 0) {
                      setHotspringRadius(100);
                      setHotspringSlider(radiusToSlider(100));
                    }
                  }}
                >
                  <Text style={styles.facilityIcon}>♨️</Text>
                  <Text style={[styles.facilityName, hotspringSelected && styles.facilityNameActive]}>
                    温泉
                  </Text>
                </TouchableOpacity>
                <View style={styles.sliderSection}>
                  <Slider
                    style={styles.horizontalSlider}
                    minimumValue={0}
                    maximumValue={100}
                    value={hotspringSlider}
                    onValueChange={handleHotspringSliderChange}
                    minimumTrackTintColor={hotspringSelected ? '#FF6B6B' : '#E0E0E0'}
                    maximumTrackTintColor="#E0E0E0"
                    thumbTintColor={hotspringSelected ? '#FF6B6B' : '#999'}
                    step={1}
                    disabled={!hotspringSelected}
                  />
                  <Text style={[styles.radiusValue, !hotspringSelected && styles.radiusValueDisabled]}>
                    {hotspringRadius > 0 ? `${hotspringRadius}m` : '0m'}
                  </Text>
                </View>
              </View>
            </View>
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
    paddingTop: 10,
    paddingBottom: 6,
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
    paddingTop: 8,
    paddingBottom: 12,
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
  nearbyContent: {
    flex: 1,
    paddingHorizontal: 8,
  },
  sliderContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  sliderWrapper: {
    position: 'relative',
    flex: 1,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  scaleLabels: {
    position: 'absolute',
    bottom: -35,
    left: 10,
    right: 10,
    height: 30,
    flexDirection: 'row',
  },
  scaleLabel: {
    position: 'absolute',
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  tsunamiLabel: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
    textAlign: 'center',
  },
  elevationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 28,
    marginBottom: 4,
  },
  elevationValue: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  temperatureText: {
    fontSize: 17,
    color: Colors.primary,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  nearbyFacilities: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    paddingHorizontal: 8,
    paddingTop: 0,
    paddingBottom: 4,
    gap: 4,
  },
  facilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    gap: 8,
  },
  facilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 90,
  },
  facilityButtonActive: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  facilityIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  facilityName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  facilityNameActive: {
    color: Colors.primary,
  },
  sliderSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  horizontalSlider: {
    flex: 1,
    height: 30,
  },
  radiusValue: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    minWidth: 45,
    textAlign: 'right',
  },
  radiusValueDisabled: {
    color: '#999',
  },
});