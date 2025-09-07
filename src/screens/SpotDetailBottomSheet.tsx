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
import { useAuthStore } from '@/stores/useAuthStore';
import { Colors } from '@/utils/constants';
import { FavoriteButton } from '@/components/FavoriteButton';
import { RatingDisplay } from '@/components/RatingDisplay';
import { ReviewService } from '@/services/review.service';
import { ReviewModal } from '@/components/Reviews/ReviewModal';
import { ReviewList } from '@/components/Reviews/ReviewList';
import { CoinParking } from '@/types';
import { ParkingFeeCalculator } from '@/services/parking-fee.service';
import { SupabaseService } from '@/services/supabase.service';

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
  // すべてのフックを最初に定義（条件分岐なし）
  const { selectedSpot, searchFilter } = useMainStore();
  const { isAuthenticated } = useAuthStore();
  const [facilityNames, setFacilityNames] = React.useState<{
    convenience?: string;
    hotspring?: string;
  }>({});
  const [reviewStats, setReviewStats] = React.useState<{
    average: number;
    count: number;
  }>({ average: 0, count: 0 });
  const [reviewModalVisible, setReviewModalVisible] = React.useState(false);
  const [reviewKey, setReviewKey] = React.useState(0);
  const scrollX = React.useRef(new Animated.Value(0)).current;
  const [nameWidth, setNameWidth] = React.useState(0);
  const [containerWidth, setContainerWidth] = React.useState(0);
  
  // 駐車場データのログと施設名の取得
  React.useEffect(() => {
    if (!selectedSpot || selectedSpot.category !== 'コインパーキング' || !visible) {
      return;
    }
    
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
    
    // 施設名を取得
    const fetchFacilityNames = async () => {
      const names: { convenience?: string; hotspring?: string } = {};
      
      if (parkingSpot.nearestConvenienceStore) {
        const convenienceId = parkingSpot.nearestConvenienceStore.id || 
                              parkingSpot.nearestConvenienceStore.store_id ||
                              (parkingSpot.nearestConvenienceStore as any).facility_id;
        
        if (convenienceId) {
          console.log('🏪 コンビニID取得:', convenienceId);
          const store = await SupabaseService.fetchConvenienceStoreById(convenienceId);
          if (store) {
            names.convenience = store.name || store.store_name || 'コンビニ';
            console.log('🏪 コンビニ名取得成功:', names.convenience);
          } else {
            console.log('🏪 コンビニ情報取得失敗');
          }
        }
      }
      
      if (parkingSpot.nearestHotspring) {
        const hotspringId = parkingSpot.nearestHotspring.id || 
                           parkingSpot.nearestHotspring.spring_id ||
                           (parkingSpot.nearestHotspring as any).facility_id;
        
        if (hotspringId) {
          console.log('♨️ 温泉ID取得:', hotspringId);
          const spring = await SupabaseService.fetchHotSpringById(hotspringId);
          if (spring) {
            names.hotspring = spring.name || spring.spring_name || '温泉';
            console.log('♨️ 温泉名取得成功:', names.hotspring);
          } else {
            console.log('♨️ 温泉情報取得失敗');
          }
        }
      }
      
      setFacilityNames(names);
    };
    
    fetchFacilityNames();
  }, [visible, selectedSpot]);
  
  // レビュー統計を取得
  React.useEffect(() => {
    if (!selectedSpot || !visible || !isParking) return;
    
    const fetchReviewStats = async () => {
      const stats = await ReviewService.getAverageRating(Number(selectedSpot.id));
      setReviewStats(stats);
    };
    
    fetchReviewStats();
  }, [visible, selectedSpot, reviewKey]);
  
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
  
  // 早期リターン（フックの後）
  if (!selectedSpot) {
    return null;
  }
  
  const isParking = selectedSpot.category === 'コインパーキング';
  const parkingSpot = selectedSpot as CoinParking;
  
  
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
  
  const formatRateStructure = (): React.ReactNode => {
    if (!isParking || !parkingSpot.rates || parkingSpot.rates.length === 0) {
      return <Text style={styles.rateStructureText}>料金情報なし</Text>;
    }
    
    const rates = parkingSpot.rates;
    
    // 料金タイプ別に分類
    const baseRates = rates.filter(r => r.type === 'base');
    const maxRates = rates.filter(r => r.type === 'max');
    const conditionalFreeRates = rates.filter(r => r.type === 'conditional_free');
    
    const formatTimeRange = (timeRange?: string) => {
      if (!timeRange || timeRange === 'not_specified') return '';
      return ` (${timeRange})`;
    };
    
    const formatDayType = (dayType?: string) => {
      if (!dayType) return '';
      return `【${dayType}】`;
    };
    
    return (
      <View style={styles.rateStructureContainer}>
        {/* 条件付き無料 */}
        {conditionalFreeRates.length > 0 && (
          <View style={styles.rateSection}>
            <Text style={styles.rateSectionTitle}>🆓 無料時間</Text>
            {conditionalFreeRates.map((rate, index) => (
              <Text key={index} style={styles.rateItem}>
                {formatDayType(rate.day_type)}最初{rate.minutes}分無料{formatTimeRange(rate.time_range)}
              </Text>
            ))}
          </View>
        )}
        
        {/* 基本料金 */}
        {baseRates.length > 0 && (
          <View style={styles.rateSection}>
            <Text style={styles.rateSectionTitle}>💰 通常料金</Text>
            {baseRates.map((rate, index) => (
              <Text key={index} style={styles.rateItem}>
                {formatDayType(rate.day_type)}{rate.minutes}分毎 ¥{rate.price?.toLocaleString()}{formatTimeRange(rate.time_range)}
              </Text>
            ))}
          </View>
        )}
        
        {/* 最大料金 */}
        {maxRates.length > 0 && (
          <View style={styles.rateSection}>
            <Text style={styles.rateSectionTitle}>🔝 最大料金</Text>
            {maxRates.map((rate, index) => (
              <Text key={index} style={styles.rateItem}>
                {formatDayType(rate.day_type)}最大¥{rate.price?.toLocaleString()}
                {rate.minutes && rate.minutes < 1440 && ` (${Math.floor(rate.minutes/60)}時間)`}
                {formatTimeRange(rate.time_range)}
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  };
  
  const formatOperatingHours = (): string => {
    if (!isParking) {
      return '---';
    }
    
    console.log('🕐 営業時間デバッグ:', {
      is_24h: (parkingSpot as any).is_24h,
      hours: parkingSpot.hours,
      Hours: (parkingSpot as any).Hours,
      operating_hours: (parkingSpot as any).operating_hours,
      operatingHours: parkingSpot.operatingHours,
    });
    
    // 1. is_24hフラグを最初にチェック（データベースの実際のフィールド）
    if ((parkingSpot as any).is_24h === true) {
      return '24時間営業';
    }
    
    // 2. パース済みのhoursオブジェクトをチェック（Supabaseからの実際のJSONB構造）
    if (parkingSpot.hours && typeof parkingSpot.hours === 'object') {
      const hours = parkingSpot.hours;
      console.log('🕐 hoursオブジェクト内容:', hours);
      
      // Supabaseのseed.sqlで定義された構造: {"text": "営業時間", "is_24h": boolean}
      if (hours.is_24h === true) {
        return '24時間営業';
      }
      if (hours.text && hours.text !== '') {
        return hours.text;
      }
      
      // その他の可能な構造もチェック
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
    
    // 3. 生のHoursフィールドをチェック（JSON文字列の可能性）
    const rawHours = (parkingSpot as any).Hours;
    if (rawHours) {
      console.log('🕐 rawHours:', rawHours, 'type:', typeof rawHours);
      
      if (typeof rawHours === 'string' && rawHours !== '{}' && rawHours !== 'null' && rawHours !== '') {
        // まず24時間営業かチェック
        if (rawHours.includes('24時間') || rawHours.includes('24h')) {
          return '24時間営業';
        }
        
        // JSON文字列の場合
        if (rawHours.startsWith('{')) {
          try {
            const parsed = JSON.parse(rawHours);
            console.log('🕐 パース済みHours:', parsed);
            
            // Supabaseのseed.sqlで定義された構造
            if (parsed.is_24h === true) {
              return '24時間営業';
            }
            if (parsed.text && parsed.text !== '') {
              return parsed.text;
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
        if (rawHours.is_24h === true) {
          return '24時間営業';
        }
        if (rawHours.text && rawHours.text !== '') {
          return rawHours.text;
        }
        if (rawHours.original_hours && rawHours.original_hours !== '') {
          return rawHours.original_hours;
        }
        if (rawHours.hours && rawHours.hours !== '') {
          return rawHours.hours;
        }
      }
    }
    
    // 4. operating_hoursフィールドをチェック
    if ((parkingSpot as any).operating_hours && (parkingSpot as any).operating_hours !== '') {
      return (parkingSpot as any).operating_hours;
    }
    
    // 5. operatingHoursフィールドをチェック
    if (parkingSpot.operatingHours && parkingSpot.operatingHours !== '') {
      return parkingSpot.operatingHours;
    }
    
    // 6. hoursがnullの場合の追加情報
    console.log('🕐 営業時間が見つかりません - データベースにhoursフィールドが設定されていない可能性があります');
    console.log('🕐 駐車場名:', parkingSpot.name);
    console.log('🕐 利用可能なフィールド:', Object.keys(parkingSpot).filter(key => parkingSpot[key] !== null && parkingSpot[key] !== undefined));
    
    // 7. データがない場合のより具体的なメッセージ
    return 'データ未登録';
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

  const handleReviewSubmitted = () => {
    setReviewKey(prev => prev + 1);
  };

  const openReviewModal = () => {
    setReviewModalVisible(true);
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
              </View>
              <View style={styles.addressRow}>
                {selectedSpot.address && (
                  <Text style={styles.address} numberOfLines={1}>
                    {selectedSpot.address}
                  </Text>
                )}
                {reviewStats.count > 0 && (
                  <RatingDisplay
                    rating={reviewStats.average}
                    totalReviews={reviewStats.count}
                    size="small"
                  />
                )}
              </View>
            </View>
          </View>
          <View style={styles.titleActions}>
            <FavoriteButton
              spotId={selectedSpot.id}
              spotType={selectedSpot.category}
              size={20}
              style={styles.favoriteButton}
            />
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
                <View style={styles.detailedRateRow}>
                  <Text style={styles.pricingSubLabel}>料金体系</Text>
                  <View style={styles.detailedRateContent}>
                    {formatRateStructure()}
                  </View>
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
            
            {/* Nearby Facilities - Vertical Compact */}
            {(parkingSpot.nearestConvenienceStore || parkingSpot.nearestHotspring) && (
              <View style={styles.nearbySection}>
                <View style={styles.nearbyHeader}>
                  <Ionicons name="location-outline" size={14} color="#666" />
                  <Text style={styles.nearbyTitle}>周辺施設</Text>
                </View>
                {parkingSpot.nearestConvenienceStore && (
                  <View style={styles.nearbyItemCompact}>
                    <Text style={styles.nearbyIconCompact}>🏪</Text>
                    <Text style={styles.nearbyNameCompact}>
                      {facilityNames.convenience || 'コンビニ'}
                    </Text>
                    <Text style={styles.nearbyDistanceCompact}>
                      {(parkingSpot.nearestConvenienceStore as any).distance_m || 
                       parkingSpot.nearestConvenienceStore.distance || '---'}m
                    </Text>
                  </View>
                )}
                {parkingSpot.nearestHotspring && (
                  <View style={styles.nearbyItemCompact}>
                    <Text style={styles.nearbyIconCompact}>♨️</Text>
                    <Text style={styles.nearbyNameCompact}>
                      {facilityNames.hotspring || '温泉'}
                    </Text>
                    <Text style={styles.nearbyDistanceCompact}>
                      {(parkingSpot.nearestHotspring as any).distance_m || 
                       parkingSpot.nearestHotspring.distance || '---'}m
                    </Text>
                  </View>
                )}
              </View>
            )}
            
            {/* Reviews Section */}
            <View style={styles.reviewsSection}>
              <View style={styles.reviewsHeader}>
                <Text style={styles.reviewsSectionTitle}>利用者の感想</Text>
                {isAuthenticated && (
                  <TouchableOpacity onPress={openReviewModal} style={styles.addReviewButton}>
                    <Ionicons name="add" size={16} color={Colors.primary} />
                    <Text style={styles.addReviewText}>投稿</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <ReviewList 
                key={reviewKey} 
                parkingSpotId={Number(selectedSpot.id)} 
              />
            </View>
          </ScrollView>
        )}
      </View>
      
      {/* Review Modal */}
      {isParking && (
        <ReviewModal
          visible={reviewModalVisible}
          onClose={() => setReviewModalVisible(false)}
          parkingSpotId={Number(selectedSpot.id)}
          parkingSpotName={selectedSpot.name}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}
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
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  address: {
    fontSize: 12,
    color: '#888',
    flex: 1,
  },
  titleActions: {
    flexDirection: 'row',
    gap: 4,
  },
  favoriteButton: {
    padding: 6,
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
  detailedRateRow: {
    flexDirection: 'column',
    gap: 8,
  },
  detailedRateContent: {
    marginTop: 4,
  },
  rateStructureContainer: {
    gap: 12,
  },
  rateStructureText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  rateSection: {
    gap: 4,
  },
  rateSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 4,
  },
  rateItem: {
    fontSize: 12,
    color: '#555',
    lineHeight: 18,
    paddingLeft: 8,
  },
  originalFeesText: {
    fontSize: 11,
    color: '#777',
    fontStyle: 'italic',
    lineHeight: 16,
    paddingLeft: 8,
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 6,
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
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  nearbyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  nearbyTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  nearbyItemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  nearbyIconCompact: {
    fontSize: 16,
    width: 20,
  },
  nearbyNameCompact: {
    flex: 1,
    fontSize: 12,
    color: '#666',
  },
  nearbyDistanceCompact: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  reviewsSection: {
    marginTop: 16,
    marginBottom: 20,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  addReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    gap: 4,
  },
  addReviewText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
});