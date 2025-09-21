import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CrossPlatformMap, Marker } from '@/components/Map/CrossPlatformMap';
import { Ionicons } from '@expo/vector-icons';
import { useMainStore } from '@/stores/useMainStore';
import { Colors, Spacing, Typography } from '@/utils/constants';
import { CoinParking, ConvenienceStore, HotSpring, GasStation, Festival } from '@/types';
import { LocationService } from '@/services/location.service';
import { ParkingFeeCalculator } from '@/services/parking-fee.service';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
    console.log('⏰ hours:', parkingSpot.hours);
    console.log('🕐 Hours (raw):', (parkingSpot as any).Hours);
    console.log('🕐 operating_hours:', (parkingSpot as any).operating_hours);
  }
  
  const formatDistance = (): string => {
    if (!userLocation) return '---';
    const distance = LocationService.calculateDistance(userLocation, selectedSpot);
    return LocationService.formatDistance(distance);
  };
  
  const formatPrice = (): string => {
    if (!isParking) return '---';
    
    // calculatedFeeがある場合（ランキングから）
    if (parkingSpot.calculatedFee !== undefined && parkingSpot.calculatedFee !== null && parkingSpot.calculatedFee > 0) {
      return `¥${parkingSpot.calculatedFee}`;
    }
    
    // calculatedFeeがない場合、現在の設定で計算
    if (searchFilter.parkingTimeFilterEnabled && parkingSpot.rates && parkingSpot.rates.length > 0) {
      const fee = ParkingFeeCalculator.calculateFee(parkingSpot, searchFilter.parkingDuration);
      if (fee > 0) {
        return `¥${fee}`;
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
    const progRate = rates.find(r => r.type === 'progressive');
    const maxRate = rates.find(r => r.type === 'max');

    // 表示用のテキストを組み立て
    const parts: string[] = [];

    if (baseRates.length > 0) {
      const first = baseRates[0];
      // progressive と組み合わせて「最初～分無料 / 以降～分¥～」の表現にする
      if (progRate && first.price === 0 && (progRate as any).apply_after === first.minutes) {
        parts.push(`最初の${first.minutes}分無料`);
        parts.push(`以降${progRate.minutes}分¥${progRate.price}`);
      } else {
        // 通常の基本料金表示
        parts.push(`${first.minutes}分¥${first.price}`);
      }
    } else if (progRate) {
      // base が無く progressive のみ
      if ((progRate as any).apply_after && (progRate as any).apply_after > 0) {
        parts.push(`最初の${(progRate as any).apply_after}分基本料金`);
        parts.push(`以降${progRate.minutes}分¥${progRate.price}`);
      } else {
        parts.push(`${progRate.minutes}分¥${progRate.price}`);
      }
    }

    if (maxRate) {
      parts.push(`最大¥${maxRate.price}`);
    }

    return parts.join(' / ') || '料金情報なし';
  };
  
  const formatOperatingHours = (): string => {
    if (!isParking) {
      const spotWithHours = selectedSpot as any;
      return spotWithHours.operatingHours || spotWithHours.operating_hours || '---';
    }
    
    // 1. hoursオブジェクトをチェック（パース済み）
    if (parkingSpot.hours) {
      const hours = parkingSpot.hours;
      if (hours.is_24h || hours.access_24h) {
        return '24時間';
      }
      if (hours.original_hours) {
        return hours.original_hours;
      }
      if (hours.hours) {
        return hours.hours;
      }
    }
    
    // 2. 生のHoursフィールドをチェック
    const rawHours = (parkingSpot as any).Hours;
    if (rawHours) {
      if (typeof rawHours === 'string') {
        try {
          const parsed = JSON.parse(rawHours);
          if (parsed.is_24h || parsed.access_24h) {
            return '24時間';
          }
          if (parsed.original_hours) {
            return parsed.original_hours;
          }
          if (parsed.hours) {
            return parsed.hours;
          }
        } catch (e) {
          // JSONでない場合はそのまま返す
          if (rawHours !== '{}' && rawHours !== 'null') {
            return rawHours;
          }
        }
      } else if (typeof rawHours === 'object') {
        if (rawHours.is_24h || rawHours.access_24h) {
          return '24時間';
        }
        if (rawHours.original_hours) {
          return rawHours.original_hours;
        }
      }
    }
    
    // 3. operating_hoursフィールドをチェック
    if ((parkingSpot as any).operating_hours) {
      return (parkingSpot as any).operating_hours;
    }
    
    // 4. is_24hフラグをチェック
    if ((parkingSpot as any).is_24h || (parkingSpot as any).is24h) {
      return '24時間';
    }
    
    return '---';
  };
  
  const getCategoryIcon = () => {
    switch (selectedSpot.category) {
      case 'コインパーキング': return '🅿️';
      case 'コンビニ': return '🏪';
      case '温泉': return '♨️';
      case 'ガソリンスタンド': return '⛽';
      case 'お祭り・花火大会': return '🎆';
      default: return '📍';
    }
  };
  
  return (
    <View style={styles.container}>
      {/* Top 50%: Map */}
      <View style={styles.mapSection}>
        <CrossPlatformMap
          style={styles.map}
          region={{
            latitude: selectedSpot.lat,
            longitude: selectedSpot.lng,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
        >
          <Marker
            coordinate={{
              latitude: selectedSpot.lat,
              longitude: selectedSpot.lng,
            }}
          />
        </CrossPlatformMap>
        
        {/* Header Overlay */}
        <SafeAreaView style={styles.headerOverlay} edges={['top']}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <View style={styles.closeButtonBg}>
              <Ionicons name="close" size={24} color="#333" />
            </View>
          </TouchableOpacity>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                const query = encodeURIComponent(selectedSpot.name);
                const url = `https://www.google.com/search?q=${query}`;
                Linking.openURL(url);
              }}
            >
              <Ionicons name="search" size={20} color="#333" />
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
                  const webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                  Linking.openURL(webUrl);
                });
              }}
            >
              <Ionicons name="map" size={20} color="#333" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
      
      {/* Bottom 50%: Details Panel */}
      <View style={styles.detailsPanel}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <Text style={styles.categoryIcon}>{getCategoryIcon()}</Text>
            <View style={styles.titleInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.spotName} numberOfLines={1}>
                  {selectedSpot.name}
                </Text>
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
        </View>
        
        {/* Premium Info Grid */}
        {isParking && (
          <View style={styles.premiumInfoGrid}>
            {/* Pricing Card */}
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>¥</Text>
                <Text style={styles.cardTitle}>料金</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.mainValue}>{formatPrice()}</Text>
                <Text style={styles.subValue}>{formatRateStructure()}</Text>
              </View>
            </View>
            
            {/* Operating Hours Card */}
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.cardTitle}>営業時間</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.mainValue}>{formatOperatingHours()}</Text>
              </View>
            </View>
            
            {/* Type Card */}
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="car-outline" size={16} color="#666" />
                <Text style={styles.cardTitle}>タイプ</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.mainValue}>
                  {parkingSpot.type || '平面'}
                </Text>
              </View>
            </View>
            
            {/* Capacity Card */}
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="grid-outline" size={16} color="#666" />
                <Text style={styles.cardTitle}>収容台数</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.mainValue}>
                  {parkingSpot.capacity ? `${parkingSpot.capacity}台` : '---'}
                </Text>
              </View>
            </View>
            
            {/* Distance Card */}
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="navigate-outline" size={16} color="#666" />
                <Text style={styles.cardTitle}>距離</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.mainValue}>{formatDistance()}</Text>
              </View>
            </View>
            
            {/* Elevation Card */}
            {selectedSpot.elevation !== undefined && (
              <View style={styles.infoCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="trending-up-outline" size={16} color="#666" />
                  <Text style={styles.cardTitle}>標高</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.mainValue}>{selectedSpot.elevation}m</Text>
                </View>
              </View>
            )}
          </View>
        )}
        
        {/* Nearby Facilities */}
        {isParking && (parkingSpot.nearestConvenienceStore || parkingSpot.nearestHotspring) && (
          <View style={styles.nearbySection}>
            <Text style={styles.nearbyTitle}>周辺施設</Text>
            <View style={styles.nearbyRow}>
              {parkingSpot.nearestConvenienceStore && (
                <View style={styles.nearbyItem}>
                  <Text style={styles.nearbyIcon}>🏪</Text>
                  <Text style={styles.nearbyDistance}>
                    {(parkingSpot.nearestConvenienceStore as any).distance_m || 
                     parkingSpot.nearestConvenienceStore.distance || '---'}m
                  </Text>
                </View>
              )}
              {parkingSpot.nearestHotspring && (
                <View style={styles.nearbyItem}>
                  <Text style={styles.nearbyIcon}>♨️</Text>
                  <Text style={styles.nearbyDistance}>
                    {(parkingSpot.nearestHotspring as any).distance_m || 
                     parkingSpot.nearestHotspring.distance || '---'}m
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  mapSection: {
    height: SCREEN_HEIGHT * 0.5,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  closeButton: {
    marginTop: 8,
  },
  closeButtonBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailsPanel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingTop: 20,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  titleSection: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 32,
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
  spotName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
  },
  rankBadge: {
    backgroundColor: '#FFB800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  address: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  premiumInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 16,
  },
  infoCard: {
    width: '33.33%',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  cardIcon: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 10,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cardContent: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 10,
    minHeight: 50,
    justifyContent: 'center',
  },
  mainValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  subValue: {
    fontSize: 10,
    color: '#666',
    lineHeight: 14,
  },
  nearbySection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  nearbyTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  nearbyRow: {
    flexDirection: 'row',
    gap: 16,
  },
  nearbyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nearbyIcon: {
    fontSize: 20,
  },
  nearbyDistance: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
});
