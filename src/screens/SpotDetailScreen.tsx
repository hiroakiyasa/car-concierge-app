import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useMainStore } from '@/stores/useMainStore';
import { Colors, Spacing, Typography } from '@/utils/constants';
import { CoinParking, ConvenienceStore, HotSpring, GasStation, Festival } from '@/types';
import { LocationService } from '@/services/location.service';
import { ParkingFeeCalculator } from '@/services/parking-fee.service';
import { Platform } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SpotDetailScreenProps {
  navigation: any;
}

export const SpotDetailScreen: React.FC<SpotDetailScreenProps> = ({ navigation }) => {
  const { selectedSpot, userLocation, searchFilter } = useMainStore();
  
  if (!selectedSpot) {
    return null;
  }
  
  const isParking = selectedSpot.category === 'コインパーキング';
  const parkingSpot = selectedSpot as CoinParking;
  
  // デバッグ: 駐車場データの確認
  if (isParking) {
    console.log('🚗 駐車場データ:', parkingSpot);
    console.log('💰 calculatedFee:', parkingSpot.calculatedFee);
    console.log('📊 rates:', parkingSpot.rates);
    console.log('🏆 rank:', parkingSpot.rank);
    console.log('⏰ parkingTimeFilterEnabled:', searchFilter.parkingTimeFilterEnabled);
    console.log('⏱️ parkingDuration:', searchFilter.parkingDuration);
  }
  
  const formatDistance = (): string => {
    if (!userLocation) return '---';
    const distance = LocationService.calculateDistance(userLocation, selectedSpot);
    return LocationService.formatDistance(distance);
  };
  
  const formatPrice = (): string => {
    if (!isParking) {
      return '---';
    }
    
    // First check if there's a calculatedFee (from the ranking)
    if (parkingSpot.calculatedFee !== undefined && parkingSpot.calculatedFee !== null && parkingSpot.calculatedFee > 0) {
      const { parkingDuration } = searchFilter;
      const duration = parkingDuration.formattedDuration;
      return `${duration}の料金: ¥${parkingSpot.calculatedFee}`;
    }
    
    // If no calculatedFee, try to calculate it now
    if (searchFilter.parkingTimeFilterEnabled && parkingSpot.rates && parkingSpot.rates.length > 0) {
      const fee = ParkingFeeCalculator.calculateFee(parkingSpot, searchFilter.parkingDuration);
      if (fee > 0) {
        const duration = searchFilter.parkingDuration.formattedDuration;
        return `${duration}の料金: ¥${fee}`;
      }
    }
    
    // Fall back to displaying rate structure if available
    if (parkingSpot.rates && parkingSpot.rates.length > 0) {
      const rates = parkingSpot.rates;
      const baseRates = rates.filter(r => r.type === 'base').sort((a, b) => a.minutes - b.minutes);
      const maxRate = rates.find(r => r.type === 'max');
      
      let priceText = '';
      baseRates.forEach((rate, index) => {
        if (index > 0) priceText += '\n';
        if (rate.price === 0) {
          priceText += `最初の${rate.minutes}分 無料`;
        } else {
          priceText += `${rate.minutes}分 ¥${rate.price}`;
        }
      });
      
      if (maxRate) {
        if (priceText) priceText += '\n';
        priceText += `最大料金 (${Math.floor(maxRate.minutes / 60)}時間) ¥${maxRate.price}`;
      }
      
      return priceText || '料金情報なし';
    }
    
    return '料金情報なし';
  };
  
  const calculateParkingFee = (): string => {
    if (!isParking) {
      return null;
    }
    
    // 常に料金計算を表示（parkingTimeFilterEnabledに関係なく）
    const fee = ParkingFeeCalculator.calculateFee(parkingSpot, searchFilter.parkingDuration);
    const duration = searchFilter.parkingDuration.formattedDuration;
    
    return `${duration}の料金: ¥${fee}`;
  };
  
  const formatOperatingHours = (): string => {
    if (selectedSpot.category === 'コインパーキング') {
      // Hoursオブジェクトから営業時間情報を取得
      if (parkingSpot.hours) {
        const hours = parkingSpot.hours;
        if (hours.is_24h || hours.access_24h) {
          return '24時間営業';
        }
        if (hours.original_hours) {
          return hours.original_hours;
        }
        if (hours.hours) {
          return hours.hours;
        }
        if (hours.schedules && hours.schedules.length > 0) {
          return hours.schedules
            .map(schedule => `${schedule.days?.join('・') || ''}: ${schedule.time || ''}`)
            .join('\n');
        }
      }
      // 旧形式のフィールドにフォールバック
      return parkingSpot.is24h ? '24時間営業' : parkingSpot.operatingHours || '---';
    } else if ('operatingHours' in selectedSpot) {
      return (selectedSpot as any).operatingHours || '---';
    }
    return '---';
  };
  
  const formatNearbyFacilities = () => {
    if (!isParking) return null;
    
    const facilities = [];
    
    if (parkingSpot.nearestConvenienceStore) {
      facilities.push({
        emoji: '🏪',
        name: parkingSpot.nearestConvenienceStore.name,
        distance: `約${parkingSpot.nearestConvenienceStore.distance}m`
      });
    }
    
    if (parkingSpot.nearestHotspring) {
      facilities.push({
        emoji: '♨️',
        name: parkingSpot.nearestHotspring.name,
        distance: `約${parkingSpot.nearestHotspring.distance}m`
      });
    }
    
    return facilities;
  };
  
  const getCategoryIcon = () => {
    switch (selectedSpot.category) {
      case 'コインパーキング': return 'P';
      case 'コンビニ': return '🏪';
      case '温泉': return '♨️';
      case 'ガソリンスタンド': return '⛽';
      case 'お祭り・花火大会': return '🎆';
      default: return '📍';
    }
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.closeButtonText}>閉じる</Text>
          </TouchableOpacity>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                const query = encodeURIComponent(selectedSpot.name);
                const url = `https://www.google.com/search?q=${query}`;
                Linking.openURL(url).catch(() => {
                  Alert.alert('エラー', 'ブラウザを開けませんでした');
                });
              }}
            >
              <Ionicons name="search" size={16} color={Colors.primary} />
              <Text style={styles.actionButtonText}>検索</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                const lat = selectedSpot.lat;
                const lng = selectedSpot.lng;
                const label = encodeURIComponent(selectedSpot.name);
                const url = Platform.OS === 'ios'
                  ? `maps:0,0?q=${label}@${lat},${lng}`
                  : `geo:0,0?q=${lat},${lng}(${label})`;
                
                Linking.openURL(url).catch(() => {
                  // フォールバックとしてGoogle MapsのWeb版を開く
                  const webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${label}`;
                  Linking.openURL(webUrl);
                });
              }}
            >
              <Ionicons name="map" size={16} color={Colors.primary} />
              <Text style={styles.actionButtonText}>地図</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Title */}
        <View style={styles.titleContainer}>
          <View style={styles.titleRow}>
            {selectedSpot.rank && (
              <View style={styles.rankBadge}>
                <Text style={styles.rankBadgeText}>{selectedSpot.rank}</Text>
              </View>
            )}
            <View style={styles.parkingBadge}>
              <Text style={styles.parkingBadgeText}>{getCategoryIcon()}</Text>
            </View>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>
                {selectedSpot.category}
              </Text>
            </View>
          </View>
          <Text style={styles.spotName}>{selectedSpot.name}</Text>
          {selectedSpot.address && (
            <Text style={styles.address}>{selectedSpot.address}</Text>
          )}
        </View>
        
        {/* Pricing Info (for parking) */}
        {isParking && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>¥</Text>
              <Text style={styles.sectionTitle}>料金体系</Text>
            </View>
            <View style={styles.pricingBox}>
              <Text style={styles.pricingText}>{formatPrice()}</Text>
            </View>
            {calculateParkingFee() && (
              <View style={styles.calculatedFeeBox}>
                <Text style={styles.calculatedFeeLabel}>駐車料金（計算結果）</Text>
                <Text style={styles.calculatedFeeText}>{calculateParkingFee()}</Text>
              </View>
            )}
          </View>
        )}
        
        {/* Basic Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>基本情報</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>距離</Text>
            <Text style={styles.infoValue}>{formatDistance()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>営業時間</Text>
            <Text style={styles.infoValue}>{formatOperatingHours()}</Text>
          </View>
          {selectedSpot.elevation !== undefined && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>標高</Text>
              <Text style={styles.infoValue}>{selectedSpot.elevation}m</Text>
            </View>
          )}
          {isParking && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>駐車場タイプ</Text>
                <Text style={styles.infoValue}>
                  {parkingSpot.type || '---'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>収容台数</Text>
                <Text style={styles.infoValue}>
                  {parkingSpot.capacity ? `${parkingSpot.capacity}台` : '---'}
                </Text>
              </View>
            </>
          )}
        </View>
        
        {/* Nearby Facilities (for parking) */}
        {isParking && formatNearbyFacilities() && formatNearbyFacilities().length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location" size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>周辺施設</Text>
            </View>
            <View style={styles.facilityRow}>
              {formatNearbyFacilities().map((facility, index) => (
                <View key={index} style={styles.facilityItem}>
                  <Text style={styles.facilityEmoji}>{facility.emoji}</Text>
                  <Text style={styles.facilityName}>{facility.name}</Text>
                  <Text style={styles.facilityDistance}>{facility.distance}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {/* Additional Info (for non-parking spots) */}
        {!isParking && selectedSpot.category === 'お祭り・花火大会' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar" size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>イベント情報</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>開催日</Text>
              <Text style={styles.infoValue}>
                {(selectedSpot as Festival).eventDate || '---'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>開催時間</Text>
              <Text style={styles.infoValue}>
                {(selectedSpot as Festival).eventTime || '---'}
              </Text>
            </View>
            {(selectedSpot as Festival).description && (
              <View style={styles.descriptionBox}>
                <Text style={styles.descriptionText}>
                  {(selectedSpot as Festival).description}
                </Text>
              </View>
            )}
          </View>
        )}
        
        {/* Map */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="map" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>地図</Text>
          </View>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
              region={{
                latitude: selectedSpot.lat,
                longitude: selectedSpot.lng,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
            >
              <Marker
                coordinate={{
                  latitude: selectedSpot.lat,
                  longitude: selectedSpot.lng,
                }}
              />
            </MapView>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
  },
  closeButton: {
    padding: Spacing.small,
  },
  closeButtonText: {
    color: Colors.primary,
    fontSize: Typography.body,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.background,
  },
  actionButtonText: {
    fontSize: Typography.caption,
    color: Colors.primary,
  },
  titleContainer: {
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.medium,
    backgroundColor: Colors.white,
    marginBottom: Spacing.small,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.small,
  },
  parkingBadge: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parkingBadgeText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
  },
  categoryBadgeText: {
    color: Colors.white,
    fontSize: Typography.caption,
    fontWeight: '600',
  },
  spotName: {
    fontSize: Typography.h5,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  section: {
    backgroundColor: Colors.white,
    marginBottom: Spacing.small,
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.medium,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.medium,
  },
  sectionIcon: {
    fontSize: 20,
    color: Colors.primary,
  },
  sectionTitle: {
    fontSize: Typography.h6,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  infoLabel: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  pricingBox: {
    marginTop: Spacing.medium,
    padding: Spacing.medium,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  pricingTitle: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.small,
  },
  pricingText: {
    fontSize: Typography.h6,
    color: Colors.primary,
    fontWeight: '600',
  },
  facilityRow: {
    gap: 12,
  },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: Spacing.small,
  },
  facilityEmoji: {
    fontSize: 20,
  },
  facilityName: {
    flex: 1,
    fontSize: Typography.bodySmall,
    color: Colors.textPrimary,
  },
  facilityDistance: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  address: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  calculatedFeeBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: Colors.warningLight,
    borderRadius: 8,
  },
  calculatedFeeLabel: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  calculatedFeeText: {
    fontSize: Typography.h6,
    color: Colors.warning,
    fontWeight: 'bold',
  },
  descriptionBox: {
    marginTop: Spacing.medium,
    padding: Spacing.small,
  },
  descriptionText: {
    fontSize: Typography.bodySmall,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
});