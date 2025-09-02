import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '@/utils/constants';
import { useMainStore } from '@/stores/useMainStore';
import { ParkingTimeModal } from './ParkingTimeModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// パネルの高さ（固定）
const PANEL_HEIGHT = 160; // 下部余白を考慮して調整

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
  const [convenienceRadius, setConvenienceRadius] = useState(10); // コンビニ検索半径（最小10m）
  const [hotspringRadius, setHotspringRadius] = useState(10); // 温泉検索半径（最小10m）
  const [convenienceSlider, setConvenienceSlider] = useState(0); // コンビニスライダー値 0-100
  const [hotspringSlider, setHotspringSlider] = useState(0); // 温泉スライダー値 0-100
  const [convenienceSelected, setConvenienceSelected] = useState(false); // コンビニ選択状態
  const [hotspringSelected, setHotspringSelected] = useState(false); // 温泉選択状態
  
  // チェックボックス状態（各タブの有効/無効）
  const [parkingEnabled, setParkingEnabled] = useState(true);
  const [nearbyEnabled, setNearbyEnabled] = useState(false);
  const [elevationEnabled, setElevationEnabled] = useState(false);
  
  // スワイプ用のAnimation値
  const swipeAnimation = useRef(new Animated.Value(0)).current;
  
  const { 
    searchFilter,
    setSearchFilter
  } = useMainStore();
  
  // パンレスポンダー設定（左右スワイプでタブ切り替え）
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 横方向のスワイプのみ検知
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: Animated.event(
        [null, { dx: swipeAnimation }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        const tabs = ['parking', 'nearby', 'elevation'];
        const currentIndex = tabs.indexOf(activeTab);
        
        if (gestureState.dx < -50 && currentIndex < tabs.length - 1) {
          // 左スワイプ（次のタブへ）
          setActiveTab(tabs[currentIndex + 1] as 'parking' | 'nearby' | 'elevation');
        } else if (gestureState.dx > 50 && currentIndex > 0) {
          // 右スワイプ（前のタブへ）
          setActiveTab(tabs[currentIndex - 1] as 'parking' | 'nearby' | 'elevation');
        }
        
        // アニメーションをリセット
        Animated.spring(swipeAnimation, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;
  
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
    // 複数のフィルターをAND条件で適用
    let newFilter = { ...searchFilter };
    
    // 駐車料金フィルター
    newFilter.parkingTimeFilterEnabled = parkingEnabled;
    
    // 周辺検索フィルター
    if (nearbyEnabled) {
      const effectiveConvenienceRadius = convenienceSelected ? Math.max(10, convenienceRadius || 10) : 0;
      const effectiveHotspringRadius = hotspringSelected ? Math.max(10, hotspringRadius || 10) : 0;
      newFilter.nearbyFilterEnabled = effectiveConvenienceRadius > 0 || effectiveHotspringRadius > 0;
      newFilter.convenienceStoreRadius = effectiveConvenienceRadius;
      newFilter.hotSpringRadius = effectiveHotspringRadius;
    } else {
      newFilter.nearbyFilterEnabled = false;
      newFilter.convenienceStoreRadius = 0;
      newFilter.hotSpringRadius = 0;
    }
    
    // 標高フィルター
    newFilter.elevationFilterEnabled = elevationEnabled;
    newFilter.minElevation = elevationEnabled ? minElevation : 0;
    
    setSearchFilter(newFilter);
    
    if (onSearch) {
      onSearch(false);
    }
  };
  
  // 温度差を計算（100mごとに0.6℃下がる）
  const calculateTemperatureDrop = (elevation: number) => {
    return (elevation / 100 * 0.6).toFixed(1);
  };
  
  // 周辺検索用のスライダー変換関数
  // 左半分(0-50): 10-100m (10m単位)
  // 右半分(50-100): 100-1000m (100m単位)
  const sliderToRadius = (value: number): number => {
    if (value === 0) return 10; // 最小値は10m
    
    // 0-50%: 10-100m (10m単位)
    if (value <= 50) {
      const radius = 10 + Math.round((value / 50) * 90 / 10) * 10;
      return Math.max(10, radius); // 最小値を10mに保証
    }
    // 50-100%: 100-1000m (100m単位)
    else {
      const normalized = (value - 50) / 50;
      return 100 + Math.round(normalized * 900 / 100) * 100;
    }
  };
  
  const radiusToSlider = (radius: number): number => {
    if (radius <= 10) return 0; // 10m以下は0%
    
    // 10-100m
    if (radius <= 100) {
      return ((radius - 10) / 90) * 50;
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
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [{
            translateX: swipeAnimation.interpolate({
              inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
              outputRange: [-20, 0, 20],
              extrapolate: 'clamp',
            })
          }]
        }
      ]}
      {...panResponder.panHandlers}
    >
      
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
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setParkingEnabled(!parkingEnabled)}
          >
            <Ionicons 
              name={parkingEnabled ? "checkbox" : "square-outline"} 
              size={18} 
              color={parkingEnabled ? Colors.primary : '#999'} 
            />
          </TouchableOpacity>
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
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setNearbyEnabled(!nearbyEnabled)}
          >
            <Ionicons 
              name={nearbyEnabled ? "checkbox" : "square-outline"} 
              size={18} 
              color={nearbyEnabled ? Colors.primary : '#999'} 
            />
          </TouchableOpacity>
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
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setElevationEnabled(!elevationEnabled)}
          >
            <Ionicons 
              name={elevationEnabled ? "checkbox" : "square-outline"} 
              size={18} 
              color={elevationEnabled ? Colors.primary : '#999'} 
            />
          </TouchableOpacity>
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
                    style={styles.nearbySlider}
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
                    {convenienceRadius >= 10 ? `${convenienceRadius}m` : '10m'}
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
                    // 選択時にデフォルト500mを設定
                    if (newSelected && hotspringRadius === 0) {
                      setHotspringRadius(500);
                      setHotspringSlider(radiusToSlider(500));
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
                    style={styles.nearbySlider}
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
                    {hotspringRadius >= 10 ? `${hotspringRadius}m` : '10m'}
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
      
      <ParkingTimeModal
        visible={showTimeSelector}
        onClose={() => setShowTimeSelector(false)}
        onConfirm={(startTime, endTime) => {
          const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
          setSearchFilter({
            ...searchFilter,
            parkingDuration: {
              startDate: startTime,
              duration: duration,
              get endDate() {
                return new Date(this.startDate.getTime() + this.duration * 1000);
              },
              get durationInMinutes() {
                return Math.round(this.duration / 60);
              },
              get formattedDuration() {
                const h = Math.floor(this.duration / 3600);
                const m = Math.floor((this.duration % 3600) / 60);
                if (h > 0) {
                  return `${h}時間${m > 0 ? `${m}分` : ''}`;
                }
                return `${m}分`;
              },
            },
            parkingTimeFilterEnabled: true
          });
        }}
        initialStartTime={searchFilter.parkingDuration.startDate}
        initialEndTime={searchFilter.parkingDuration.endDate}
      />
    </Animated.View>
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
    paddingBottom: 10, // パネル下部に余白を追加
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
    paddingBottom: 2, // タブ下の余白を削減（6→2）
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
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    flex: 1,
    textAlign: 'center',
  },
  activeTabText: {
    color: Colors.white,
  },
  checkbox: {
    padding: 2,
  },
  checkIcon: {
    marginLeft: 4,
  },
  
  // 時間セクション
  premiumTimeSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 4, // 上の余白を削減（8→4）
    paddingBottom: 0, // 下の余白を削除
    gap: 8,
  },
  timeBlock: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  timeLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  bigTime: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  dateText: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  durationBlock: {
    flex: 1,
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  durationValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 2,
  },
  durationLabel: {
    fontSize: 9,
    color: Colors.primary,
    marginTop: 2,
  },
  searchButtonPremium: {
    width: 48,
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  
  // 標高コンテンツ
  elevationContent: {
    flex: 1,
    paddingRight: 8,
  },
  sliderContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  sliderWrapper: {
    position: 'relative',
    paddingHorizontal: 10,
  },
  slider: {
    height: 40,
  },
  scaleLabels: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 38,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleLabel: {
    position: 'absolute',
    fontSize: 9,
    color: '#999',
  },
  tsunamiLabel: {
    color: '#FF6B6B',
    fontWeight: 'bold',
    fontSize: 8,
    backgroundColor: '#FFF',
    paddingHorizontal: 2,
  },
  elevationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: 20,
  },
  elevationValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  temperatureText: {
    fontSize: 12,
    color: '#007AFF',
  },
  
  // 周辺検索コンテンツ
  nearbyContent: {
    flex: 1,
    paddingRight: 8,
  },
  nearbyFacilities: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  facilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  facilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    gap: 4,
  },
  facilityButtonActive: {
    backgroundColor: Colors.primary + '20',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  facilityIcon: {
    fontSize: 16,
  },
  facilityName: {
    fontSize: 12,
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
  nearbySlider: {
    flex: 1,
    height: 30,
  },
  radiusValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 45,
    textAlign: 'right',
  },
  radiusValueDisabled: {
    color: '#999',
  },
});