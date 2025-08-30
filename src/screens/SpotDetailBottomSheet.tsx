import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  ScrollView,
  Linking,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMainStore } from '@/stores/useMainStore';
import { Colors } from '@/utils/constants';
import { CoinParking } from '@/types';
import { ParkingFeeCalculator } from '@/services/parking-fee.service';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.5; // 50% of screen height

interface SpotDetailBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const SpotDetailBottomSheet: React.FC<SpotDetailBottomSheetProps> = ({ 
  visible, 
  onClose 
}) => {
  const { selectedSpot, searchFilter } = useMainStore();
  
  // Hooks must be called before any conditional returns
  React.useEffect(() => {
    if (selectedSpot && selectedSpot.category === 'コインパーキング' && visible) {
      const parkingSpot = selectedSpot as CoinParking;
      console.log('🚗 SpotDetailBottomSheet - 駐車場データ:', {
        name: parkingSpot.name,
        hours: parkingSpot.hours,
        Hours: (parkingSpot as any).Hours,
        operating_hours: (parkingSpot as any).operating_hours,
        operatingHours: parkingSpot.operatingHours,
        rates: parkingSpot.rates,
        type: parkingSpot.type,
        capacity: parkingSpot.capacity,
      });
    }
  }, [visible, selectedSpot]);
  
  if (!selectedSpot) {
    return null;
  }
  
  const isParking = selectedSpot.category === 'コインパーキング';
  const parkingSpot = selectedSpot as CoinParking;
  
  // スクロールアニメーション用
  const scrollX = React.useRef(new Animated.Value(0)).current;
  const [nameWidth, setNameWidth] = React.useState(0);
  const [containerWidth, setContainerWidth] = React.useState(0);
  
  // 名前のスクロールアニメーション
  React.useEffect(() => {
    if (nameWidth > containerWidth && containerWidth > 0) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(scrollX, {
            toValue: -(nameWidth - containerWidth + 20),
            duration: 5000,
            useNativeDriver: true,
          }),
          Animated.delay(1000),
          Animated.timing(scrollX, {
            toValue: 0,
            duration: 5000,
            useNativeDriver: true,
          }),
          Animated.delay(1000),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [nameWidth, containerWidth, scrollX]);
  
  // 施設名を取得する関数
  const getFacilityName = (facility: any, type: 'convenience' | 'hotspring'): string => {
    if (!facility) return type === 'convenience' ? 'コンビニ' : '温泉';
    
    // 各種フィールドをチェック
    if (facility.name) return facility.name;
    if (facility.store_name) return facility.store_name;
    if (facility.spring_name) return facility.spring_name;
    if (facility.facility_name) return facility.facility_name;
    
    // IDから推測（例: CVS_FM_023814 → ファミリーマート）
    if (facility.id || facility.store_id || facility.spring_id) {
      const id = facility.id || facility.store_id || facility.spring_id;
      if (typeof id === 'string') {
        if (id.includes('FM') || id.includes('FAMILY')) return 'ファミリーマート';
        if (id.includes('7E') || id.includes('SEVEN')) return 'セブンイレブン';
        if (id.includes('LS') || id.includes('LAWSON')) return 'ローソン';
        if (id.includes('MS') || id.includes('MINISTOP')) return 'ミニストップ';
        if (id.includes('DY') || id.includes('DAILY')) return 'デイリーヤマザキ';
      }
    }
    
    return type === 'convenience' ? 'コンビニ' : '温泉';
  };
  
  const formatPrice = (): string => {
    if (!isParking) return '---';
    
    // 計算済み料金がある場合
    if (parkingSpot.calculatedFee !== undefined && parkingSpot.calculatedFee !== null && parkingSpot.calculatedFee > 0) {
      return `¥${parkingSpot.calculatedFee.toLocaleString()}`;
    }
    
    // 現在の設定で計算
    if (searchFilter.parkingTimeFilterEnabled && parkingSpot.rates && parkingSpot.rates.length > 0) {
      const fee = ParkingFeeCalculator.calculateFee(parkingSpot, searchFilter.parkingDuration);
      if (fee > 0) {
        return `¥${fee.toLocaleString()}`;
      }
    }
    
    return '---';
  };
  
  const formatRateStructure = (): string => {
    if (!isParking || !parkingSpot.rates || parkingSpot.rates.length === 0) {
      return '料金情報なし';
    }
    
    const rates = parkingSpot.rates;
    const baseRates = rates.filter(r => r.type === 'base').sort((a, b) => a.minutes - b.minutes);
    const maxRate = rates.find(r => r.type === 'max');
    
    let priceText = '';
    if (baseRates.length > 0) {
      const firstRate = baseRates[0];
      priceText = `${firstRate.minutes}分¥${firstRate.price}`;
    }
    
    if (maxRate) {
      if (priceText) priceText += ' / ';
      priceText += `最大¥${maxRate.price}`;
    }
    
    return priceText || '料金情報なし';
  };
  
  const formatOperatingHours = (): string => {
    if (!isParking) {
      return '---';
    }
    
    console.log('🕐 営業時間デバッグ:', {
      hours: parkingSpot.hours,
      Hours: (parkingSpot as any).Hours,
      operating_hours: (parkingSpot as any).operating_hours,
      operatingHours: parkingSpot.operatingHours,
    });
    
    // 1. パース済みのhoursオブジェクトをチェック
    if (parkingSpot.hours && typeof parkingSpot.hours === 'object') {
      const hours = parkingSpot.hours;
      console.log('🕐 hoursオブジェクト内容:', hours);
      
      if (hours.is_24h === true || hours.access_24h === true) {
        return '24時間';
      }
      if (hours.original_hours && hours.original_hours !== '') {
        return hours.original_hours;
      }
      if (hours.hours && hours.hours !== '') {
        return hours.hours;
      }
      
      // schedulesがある場合
      if (hours.schedules && Array.isArray(hours.schedules) && hours.schedules.length > 0) {
        const schedule = hours.schedules[0];
        if (schedule.time) {
          return schedule.time;
        }
      }
    }
    
    // 2. 生のHoursフィールドをチェック（JSON文字列の可能性）
    const rawHours = (parkingSpot as any).Hours;
    if (rawHours) {
      console.log('🕐 rawHours:', rawHours, 'type:', typeof rawHours);
      
      if (typeof rawHours === 'string' && rawHours !== '{}' && rawHours !== 'null' && rawHours !== '') {
        // まず24時間営業かチェック
        if (rawHours.includes('24時間') || rawHours.includes('24h')) {
          return '24時間';
        }
        
        // JSON文字列の場合
        if (rawHours.startsWith('{')) {
          try {
            const parsed = JSON.parse(rawHours);
            console.log('🕐 パース済みHours:', parsed);
            
            if (parsed.is_24h === true || parsed.access_24h === true) {
              return '24時間';
            }
            if (parsed.original_hours && parsed.original_hours !== '') {
              return parsed.original_hours;
            }
            if (parsed.hours && parsed.hours !== '') {
              return parsed.hours;
            }
            if (parsed.schedules && Array.isArray(parsed.schedules) && parsed.schedules.length > 0) {
              const schedule = parsed.schedules[0];
              if (schedule.time) {
                return schedule.time;
              }
            }
          } catch (e) {
            console.log('🕐 JSONパースエラー:', e);
            // パース失敗時はそのまま返す
            return rawHours;
          }
        } else {
          // JSON以外の文字列の場合はそのまま返す
          return rawHours;
        }
      } else if (typeof rawHours === 'object' && rawHours !== null) {
        // オブジェクトの場合
        if (rawHours.is_24h === true || rawHours.access_24h === true) {
          return '24時間';
        }
        if (rawHours.original_hours && rawHours.original_hours !== '') {
          return rawHours.original_hours;
        }
        if (rawHours.hours && rawHours.hours !== '') {
          return rawHours.hours;
        }
      }
    }
    
    // 3. operating_hoursフィールドをチェック
    if ((parkingSpot as any).operating_hours && (parkingSpot as any).operating_hours !== '') {
      return (parkingSpot as any).operating_hours;
    }
    
    // 4. operatingHoursフィールドをチェック
    if (parkingSpot.operatingHours && parkingSpot.operatingHours !== '') {
      return parkingSpot.operatingHours;
    }
    
    // 5. is_24hフラグをチェック
    if ((parkingSpot as any).is_24h === true || (parkingSpot as any).is24h === true) {
      return '24時間';
    }
    
    console.log('🕐 営業時間が見つかりません');
    return '情報なし';
  };
  
  const openGoogleSearch = () => {
    const searchQuery = encodeURIComponent(selectedSpot.name);
    const url = `https://www.google.com/search?q=${searchQuery}`;
    Linking.openURL(url);
  };
  
  const openGoogleMaps = () => {
    const { lat, lng } = selectedSpot;
    const label = encodeURIComponent(selectedSpot.name);
    
    const scheme = Platform.select({
      ios: 'maps:0,0?q=',
      android: 'geo:0,0?q='
    });
    const latLng = `${lat},${lng}`;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });
    
    Linking.openURL(url as string).catch(() => {
      const browserUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      Linking.openURL(browserUrl);
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      />
      
      <View style={styles.sheet}>
        {/* Premium Header with Handle */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>
        
        {/* Title Section */}
        <View style={styles.titleSection}>
          <View style={styles.titleLeft}>
            <Text style={styles.categoryIcon}>🅿️</Text>
            <View style={styles.titleInfo}>
              <View style={styles.nameRow}>
                <View 
                  style={styles.nameContainer}
                  onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
                >
                  <Animated.View
                    style={{
                      flexDirection: 'row',
                      transform: [{ translateX: scrollX }],
                    }}
                  >
                    <Text 
                      style={styles.spotName}
                      onLayout={(e) => setNameWidth(e.nativeEvent.layout.width)}
                    >
                      {selectedSpot.name}
                    </Text>
                    {nameWidth > containerWidth && (
                      <Text style={[styles.spotName, { marginLeft: 20 }]}>
                        {selectedSpot.name}
                      </Text>
                    )}
                  </Animated.View>
                </View>
                {selectedSpot.rank && (
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{selectedSpot.rank}</Text>
                  </View>
                )}
              </View>
              {selectedSpot.address && (
                <Text style={styles.address} numberOfLines={1}>
                  {selectedSpot.address}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.titleActions}>
            <TouchableOpacity onPress={openGoogleSearch} style={styles.actionButton}>
              <Ionicons name="search" size={18} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity onPress={openGoogleMaps} style={styles.actionButton}>
              <Ionicons name="map" size={18} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Premium Info Cards */}
        {isParking && (
          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Combined Pricing Card - Compact */}
            <View style={styles.pricingCard}>
              <View style={styles.pricingContent}>
                <View style={styles.pricingRow}>
                  <View style={styles.pricingLeft}>
                    <Text style={styles.pricingIcon}>¥</Text>
                    <Text style={styles.pricingMainLabel}>計算料金</Text>
                  </View>
                  <Text style={styles.pricingMainValue}>{formatPrice()}</Text>
                </View>
                <View style={styles.pricingDivider} />
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingSubLabel}>料金体系</Text>
                  <Text style={styles.pricingSubValue}>{formatRateStructure()}</Text>
                </View>
              </View>
            </View>
            
            {/* Compact Info Grid 2x2 */}
            <View style={styles.infoGrid}>
              {/* Operating Hours */}
              <View style={styles.infoCard}>
                <View style={styles.infoCardContent}>
                  <Ionicons name="time-outline" size={14} color="#666" />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>営業時間</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>
                      {formatOperatingHours()}
                    </Text>
                  </View>
                </View>
              </View>
              
              {/* Type */}
              <View style={styles.infoCard}>
                <View style={styles.infoCardContent}>
                  <Ionicons name="car-outline" size={14} color="#666" />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>タイプ</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>
                      {parkingSpot.type || '平面'}
                    </Text>
                  </View>
                </View>
              </View>
              
              {/* Capacity */}
              <View style={styles.infoCard}>
                <View style={styles.infoCardContent}>
                  <Ionicons name="grid-outline" size={14} color="#666" />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>収容台数</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>
                      {parkingSpot.capacity ? `${parkingSpot.capacity}台` : '---'}
                    </Text>
                  </View>
                </View>
              </View>
              
              {/* Elevation */}
              <View style={styles.infoCard}>
                <View style={styles.infoCardContent}>
                  <Ionicons name="trending-up-outline" size={14} color="#666" />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>標高</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>
                      {selectedSpot.elevation !== undefined ? `${selectedSpot.elevation}m` : '---'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            
            {/* Nearby Facilities - Compact */}
            {(parkingSpot.nearestConvenienceStore || parkingSpot.nearestHotspring) && (
              <View style={styles.nearbySection}>
                <View style={styles.nearbyHeader}>
                  <Ionicons name="location-outline" size={16} color="#888" />
                  <Text style={styles.nearbyTitle}>周辺施設</Text>
                </View>
                <View style={styles.nearbyContent}>
                  {parkingSpot.nearestConvenienceStore && (
                    <View style={styles.nearbyItem}>
                      <Text style={styles.nearbyIcon}>🏪</Text>
                      <View style={styles.nearbyInfo}>
                        <Text style={styles.nearbyName}>
                          {getFacilityName(parkingSpot.nearestConvenienceStore, 'convenience')}
                        </Text>
                        <Text style={styles.nearbyDistance}>
                          {(parkingSpot.nearestConvenienceStore as any).distance_m || 
                           parkingSpot.nearestConvenienceStore.distance || '---'}m
                        </Text>
                      </View>
                    </View>
                  )}
                  {parkingSpot.nearestHotspring && (
                    <View style={styles.nearbyItem}>
                      <Text style={styles.nearbyIcon}>♨️</Text>
                      <View style={styles.nearbyInfo}>
                        <Text style={styles.nearbyName}>
                          {getFacilityName(parkingSpot.nearestHotspring, 'hotspring')}
                        </Text>
                        <Text style={styles.nearbyDistance}>
                          {(parkingSpot.nearestHotspring as any).distance_m || 
                           parkingSpot.nearestHotspring.distance || '---'}m
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  titleInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  spotName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  rankBadge: {
    backgroundColor: '#FFB800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  address: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  titleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  pricingCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
  },
  pricingContent: {
    padding: 12,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pricingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pricingIcon: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '700',
  },
  pricingMainLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  pricingMainValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  pricingDivider: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginVertical: 8,
  },
  pricingSubLabel: {
    fontSize: 12,
    color: '#888',
  },
  pricingSubValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 12,
  },
  infoCard: {
    width: '50%',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  infoCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    minHeight: 48,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  nearbySection: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  nearbyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  nearbyTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
  },
  nearbyContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  nearbyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    flex: 1,
  },
  nearbyIcon: {
    fontSize: 20,
  },
  nearbyInfo: {
    flex: 1,
  },
  nearbyName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  nearbyDistance: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
});