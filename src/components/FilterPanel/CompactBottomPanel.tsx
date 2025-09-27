import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
  ScrollView,
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
  onSearch?: (isExpanded: boolean, newFilter?: any) => void;
  onAnyTap?: () => void;
}

export const CompactBottomPanel: React.FC<CompactBottomPanelProps> = ({ 
  navigation, 
  onHeightChange, 
  onSearch,
  onAnyTap,
}) => {
  const [showTimeSelector, setShowTimeSelector] = useState(false);
  const [timeSelectorMode, setTimeSelectorMode] = useState<'entry' | 'duration' | 'exit'>('entry');
  const [activeTab, setActiveTab] = useState<'parking' | 'nearby' | 'elevation'>('parking');
  const [minElevation, setMinElevation] = useState(0);
  const [sliderValue, setSliderValue] = useState(0); // 0-100のスライダー値
  const [convenienceRadius, setConvenienceRadius] = useState(30); // コンビニ検索半径（デフォルトON: 30m）
  const [hotspringRadius, setHotspringRadius] = useState(0); // 温泉検索半径（デフォルトOFF）
  const [convenienceSlider, setConvenienceSlider] = useState(16); // 約30m相当（radiusToSlider(30) ≈ 16）
  const [hotspringSlider, setHotspringSlider] = useState(0); // 温泉スライダー初期値 0
  const [convenienceSelected, setConvenienceSelected] = useState(true); // コンビニをデフォルトON
  const [hotspringSelected, setHotspringSelected] = useState(false); // 温泉はデフォルトOFF
  
  // チェックボックス状態（各タブの有効/無効） - フィルター適用を制御
  // 初期値はストアのデフォルト（初期起動時は料金計算ON）
  const { 
    searchFilter,
    setSearchFilter
  } = useMainStore();
  const [parkingEnabled, setParkingEnabled] = useState<boolean>(
    !!searchFilter?.parkingTimeFilterEnabled
  );
  const [nearbyEnabled, setNearbyEnabled] = useState(false);
  const [elevationEnabled, setElevationEnabled] = useState(false);
  
  // スワイプ用のAnimation値（初期値を設定）
  const translateX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  
  // ストア側の変更に追随（将来他画面から変更された場合など）
  useEffect(() => {
    if (typeof searchFilter?.parkingTimeFilterEnabled === 'boolean') {
      setParkingEnabled(searchFilter.parkingTimeFilterEnabled);
    }
  }, [searchFilter?.parkingTimeFilterEnabled]);
  
  // タブインデックスを取得
  const getTabIndex = () => {
    // 正しい順序: parking -> nearby -> elevation
    const tabs = ['parking', 'nearby', 'elevation'];
    return tabs.indexOf(activeTab);
  };
  
  // パンレスポンダー設定（コンテンツ部分のスワイプ）
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5;
      },
      onPanResponderGrant: () => {
        // スワイプ開始時の処理
      },
      onPanResponderMove: (_, gestureState) => {
        // 現在のタブインデックス
        const currentIndex = getTabIndex();
        const offset = -currentIndex * SCREEN_WIDTH + gestureState.dx;
        
        // 循環スワイプのための制限を緩和
        const maxOffset = SCREEN_WIDTH; // 右端から更に右にスワイプ可能
        const minOffset = -3 * SCREEN_WIDTH; // 左端から更に左にスワイプ可能
        
        if (offset <= maxOffset && offset >= minOffset) {
          translateX.setValue(offset);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // 正しいタブの順序: parking -> nearby -> elevation
        const tabs = ['parking', 'nearby', 'elevation'];
        const currentIndex = tabs.indexOf(activeTab);
        const threshold = SCREEN_WIDTH / 4; // スワイプ判定の閾値
        
        let newIndex = currentIndex;
        
        if (gestureState.dx > threshold) {
          // 右スワイプ（前のタブへ - 循環）
          newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        } else if (gestureState.dx < -threshold) {
          // 左スワイプ（次のタブへ - 循環）
          newIndex = (currentIndex + 1) % tabs.length;
        }
        
        // 新しいタブに切り替え
        setActiveTab(tabs[newIndex] as 'parking' | 'nearby' | 'elevation');
        
        // アニメーションでスナップ
        Animated.spring(translateX, {
          toValue: -newIndex * SCREEN_WIDTH,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }).start();
      },
    })
  ).current;
  
  // タブが変更されたときにコンテンツをスライド
  useEffect(() => {
    const index = getTabIndex();
    // タブが変更されたときは即座に位置を更新
    translateX.setValue(-index * SCREEN_WIDTH);
  }, [activeTab]);
  
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

    // 駐車料金フィルター（チェックボックスが有効な場合のみ適用）
    newFilter.parkingTimeFilterEnabled = parkingEnabled;

    // 周辺検索フィルター（チェックボックスが有効な場合のみ適用）
    if (nearbyEnabled) {
      const effectiveConvenienceRadius = convenienceSelected ? convenienceRadius : 0;
      const effectiveHotspringRadius = hotspringSelected ? hotspringRadius : 0;
      newFilter.nearbyFilterEnabled = effectiveConvenienceRadius > 0 || effectiveHotspringRadius > 0;
      newFilter.convenienceStoreRadius = effectiveConvenienceRadius;
      newFilter.hotSpringRadius = effectiveHotspringRadius;

      // チェックされた施設を絞り込み条件に反映（AND 条件）
      const categories = new Set<string>();
      if (effectiveConvenienceRadius > 0) categories.add('コンビニ');
      if (effectiveHotspringRadius > 0) categories.add('温泉');
      newFilter.nearbyCategories = categories;
    } else {
      newFilter.nearbyFilterEnabled = false;
      newFilter.convenienceStoreRadius = 0;
      newFilter.hotSpringRadius = 0;
      newFilter.nearbyCategories = new Set();
    }

    // 標高フィルター（チェックボックスが有効な場合のみ適用）
    newFilter.elevationFilterEnabled = elevationEnabled;
    newFilter.minElevation = elevationEnabled ? minElevation : 0;

    // デバッグ出力
    console.log('🔍 検索フィルター設定:', {
      駐車料金: parkingEnabled ? '有効' : '無効',
      周辺検索: nearbyEnabled ? '有効' : '無効',
      標高: elevationEnabled ? '有効' : '無効',
      コンビニ: nearbyEnabled && convenienceSelected ? `${convenienceRadius}m` : '無効',
      温泉: nearbyEnabled && hotspringSelected ? `${hotspringRadius}m` : '無効',
      最低標高: elevationEnabled ? `${minElevation}m` : '無効'
    });

    // Zustandストアを更新
    setSearchFilter(newFilter);

    // 新しいフィルター設定を直接MapScreenに渡す
    if (onSearch) {
      onSearch(false, newFilter);
    }
  };
  
  // 温度差を計算（100mごとに0.6℃下がる）
  const calculateTemperatureDrop = (elevation: number) => {
    return (elevation / 100 * 0.6).toFixed(1);
  };
  
  // 周辺検索用のスライダー変換関数（対数的スケール）
  // 0-70%: 10-100m (より細かい粒度、最小10m)
  // 70-100%: 100-1000m
  const sliderToRadius = (value: number): number => {
    if (value <= 0) return 10; // 最小値を10mに
    if (value >= 100) return 1000;
    
    // 0-70の範囲で10-100mをマッピング
    if (value <= 70) {
      return Math.round(10 + (value / 70) * 90); // 10mから始まる
    }
    
    // 70-100の範囲で100-1000mをマッピング
    const normalized = (value - 70) / 30;
    return Math.round(100 + normalized * 900);
  };
  
  const radiusToSlider = (radius: number): number => {
    if (radius <= 10) return 0; // 10m以下は0に
    if (radius >= 1000) return 100;
    
    // 10-100mは0-70%にマッピング
    if (radius <= 100) {
      return Math.round(((radius - 10) / 90) * 70);
    }
    
    // 100-1000mは70-100%にマッピング
    return Math.round(70 + ((radius - 100) / 900) * 30);
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
    <View style={styles.container} onTouchStart={onAnyTap}>
      
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
            onPress={(e) => {
              e.stopPropagation();
              setParkingEnabled(!parkingEnabled);
            }}
          >
            <Ionicons
              name={parkingEnabled ? "checkbox" : "square-outline"}
              size={18}
              color={parkingEnabled ? (activeTab === 'parking' ? Colors.white : Colors.primary) : '#999'}
            />
          </TouchableOpacity>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterTab, activeTab === 'nearby' && styles.activeTab]}
          onPress={() => {
            setActiveTab('nearby');
            // 初回選択時: コンビニのみON、温泉はOFF
            if (!convenienceSelected && !hotspringSelected) {
              setConvenienceSelected(true);
              setConvenienceRadius(30);
              setConvenienceSlider(radiusToSlider(30));
              setHotspringSelected(false);
              setHotspringRadius(0);
              setHotspringSlider(0);
            }
          }}
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
            onPress={(e) => {
              e.stopPropagation();
              const next = !nearbyEnabled;
              setNearbyEnabled(next);
              // ON時は「コンビニのみON、温泉OFF」で初期化
              if (next) {
                setConvenienceSelected(true);
                if (convenienceRadius <= 0) {
                  setConvenienceRadius(30);
                  setConvenienceSlider(radiusToSlider(30));
                }
                setHotspringSelected(false);
                setHotspringRadius(0);
                setHotspringSlider(0);
              }
            }}
          >
            <Ionicons
              name={nearbyEnabled ? "checkbox" : "square-outline"}
              size={18}
              color={nearbyEnabled ? (activeTab === 'nearby' ? Colors.white : Colors.primary) : '#999'}
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
            onPress={(e) => {
              e.stopPropagation();
              setElevationEnabled(!elevationEnabled);
            }}
          >
            <Ionicons
              name={elevationEnabled ? "checkbox" : "square-outline"}
              size={18}
              color={elevationEnabled ? (activeTab === 'elevation' ? Colors.white : Colors.primary) : '#999'}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
      
      {/* コンテンツ部分（スワイプ可能） */}
      <View style={styles.contentContainer} {...panResponder.panHandlers}>
        <Animated.View 
          style={[
            styles.contentSlider,
            {
              transform: [{ translateX }]
            }
          ]}
        >
          {/* 駐車料金コンテンツ */}
          <View style={[styles.premiumTimeSection, styles.contentPage]}>
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
              <Ionicons name="search" size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>
          
          {/* 周辺検索コンテンツ */}
          <View style={[styles.nearbyContent, styles.contentPage]}>
            <View style={styles.nearbyContentRow}>
              <View style={styles.nearbyFacilities}>
                {/* コンビニ */}
                <View style={styles.facilityRow}>
                <TouchableOpacity
                  style={[styles.facilityButton, convenienceSelected && styles.facilityButtonActive]}
                  onPress={() => {
                    const newSelected = !convenienceSelected;
                    setConvenienceSelected(newSelected);
                    // 選択時にデフォルト100mを設定
                    if (newSelected && convenienceRadius < 10) {
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
                  <View style={styles.nearbySliderWrapper}>
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
                    <View style={styles.sliderScaleLabels}>
                      <Text style={[styles.sliderScaleLabel, { position: 'absolute', left: 0 }]}>10m</Text>
                      <Text style={[styles.sliderScaleLabel, { position: 'absolute', left: '35%' }]}>50m</Text>
                      <Text style={[styles.sliderScaleLabel, { position: 'absolute', left: '70%' }]}>100m</Text>
                      <Text style={[styles.sliderScaleLabel, { position: 'absolute', right: -10 }]}>1000m</Text>
                    </View>
                  </View>
                  <Text style={[styles.radiusValue, !convenienceSelected && styles.radiusValueDisabled]}>
                    {convenienceRadius}m
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
                    if (newSelected && hotspringRadius < 10) {
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
                  <View style={styles.nearbySliderWrapper}>
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
                    <View style={styles.sliderScaleLabels}>
                      <Text style={[styles.sliderScaleLabel, { position: 'absolute', left: 0 }]}>10m</Text>
                      <Text style={[styles.sliderScaleLabel, { position: 'absolute', left: '35%' }]}>50m</Text>
                      <Text style={[styles.sliderScaleLabel, { position: 'absolute', left: '70%' }]}>100m</Text>
                      <Text style={[styles.sliderScaleLabel, { position: 'absolute', right: -10 }]}>1000m</Text>
                    </View>
                  </View>
                  <Text style={[styles.radiusValue, !hotspringSelected && styles.radiusValueDisabled]}>
                    {hotspringRadius}m
                  </Text>
                </View>
              </View>
              </View>
              
              {/* 統合検索ボタン - 右側に配置 */}
              <TouchableOpacity
                style={[styles.nearbySearchButtonLarge, 
                  (!convenienceSelected && !hotspringSelected) && styles.nearbySearchButtonLargeDisabled]}
                onPress={handleSearch}
                disabled={!convenienceSelected && !hotspringSelected}
              >
                <Ionicons name="search" size={28} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* 標高コンテンツ */}
          <View style={[styles.elevationContent, styles.contentPage]}>
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
            
            <TouchableOpacity
              style={styles.searchButtonPremium}
              onPress={handleSearch}
            >
              <Ionicons name="search" size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
      
      <ParkingTimeModal
        visible={showTimeSelector}
        mode={timeSelectorMode}
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
  
  // コンテンツコンテナ
  contentContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  contentSlider: {
    flexDirection: 'row',
    width: SCREEN_WIDTH * 3, // 3つのタブ分の幅
  },
  contentPage: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  
  // 時間セクション
  premiumTimeSection: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sliderContainer: {
    flex: 1,
    justifyContent: 'flex-start', // 上寄せにして全体バランスを調整
    paddingTop: 8, // 上部に適度な余白
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
    top: 40, // スライダーからの距離を最適化
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleLabel: {
    position: 'absolute',
    fontSize: 11, // フォントサイズを大きく（9→11）
    color: '#666', // 色を少し濃く
    fontWeight: '500',
  },
  tsunamiLabel: {
    color: '#FF6B6B',
    fontWeight: 'bold',
    fontSize: 10, // フォントサイズを大きく（8→10）
    backgroundColor: '#FFF',
    paddingHorizontal: 2,
  },
  elevationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 25, // スライダーからの距離を下に調整
    paddingBottom: 8, // 下部余白を追加
  },
  elevationValue: {
    fontSize: 16, // フォントサイズを大きく（13→16）
    fontWeight: 'bold',
    color: '#2C2C2C',
  },
  temperatureText: {
    fontSize: 15, // フォントサイズを大きく（12→15）
    color: '#007AFF',
    fontWeight: '600',
  },
  
  // 周辺検索コンテンツ
  nearbyContent: {
    flex: 1,
    justifyContent: 'center',
  },
  nearbyContentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12, // より四角に近い形に
    backgroundColor: '#F5F5F5',
    gap: 4,
    width: 90, // 幅を少し広げて文字が切れないように
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
    gap: 4,
    marginRight: 0, // 右マージンを削除してスペースを広げる
  },
  nearbySliderWrapper: {
    flex: 1,
    position: 'relative',
    maxWidth: '100%', // スライダーを100%まで右に伸ばす
  },
  nearbySlider: {
    width: '100%',
    height: 30,
  },
  sliderScaleLabels: {
    position: 'relative',
    height: 15,
    marginTop: -5,
    paddingHorizontal: 10,
  },
  sliderScaleLabel: {
    fontSize: 10,
    color: '#999',
  },
  radiusValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 45,
    textAlign: 'center',
    marginRight: 5, // 右側に少し余白を追加
  },
  radiusValueDisabled: {
    color: '#999',
  },
  searchButtonNearby: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  nearbySearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 15,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  nearbySearchButtonDisabled: {
    backgroundColor: '#ccc',
  },
  nearbySearchButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  nearbySearchButtonLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  nearbySearchButtonLargeDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0.1,
    elevation: 2,
  },
});
