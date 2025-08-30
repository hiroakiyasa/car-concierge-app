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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMainStore } from '@/stores/useMainStore';
import { Colors, Spacing, Typography } from '@/utils/constants';
import { CoinParking } from '@/types';
import { ParkingFeeCalculator } from '@/services/parking-fee.service';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.45;

interface SpotDetailBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const SpotDetailBottomSheet: React.FC<SpotDetailBottomSheetProps> = ({ 
  visible, 
  onClose 
}) => {
  const { selectedSpot, searchFilter } = useMainStore();
  
  if (!selectedSpot) {
    return null;
  }
  
  const isParking = selectedSpot.category === 'コインパーキング';
  const parkingSpot = selectedSpot as CoinParking;
  
  const formatPrice = (): { calculated: string; original: string } => {
    if (!isParking) {
      return { calculated: '---', original: '---' };
    }
    
    let calculatedStr = '';
    let originalStr = '';
    
    // Calculate fee for current duration
    if (parkingSpot.calculatedFee !== undefined && parkingSpot.calculatedFee !== null && parkingSpot.calculatedFee > 0) {
      const { parkingDuration } = searchFilter;
      const duration = parkingDuration.formattedDuration;
      calculatedStr = `${duration}: ¥${parkingSpot.calculatedFee.toLocaleString()}`;
    } else if (searchFilter.parkingTimeFilterEnabled && parkingSpot.rates && parkingSpot.rates.length > 0) {
      const fee = ParkingFeeCalculator.calculateFee(parkingSpot, searchFilter.parkingDuration);
      if (fee > 0) {
        const duration = searchFilter.parkingDuration.formattedDuration;
        calculatedStr = `${duration}: ¥${fee.toLocaleString()}`;
      }
    }
    
    // Get original fee information from backend
    if (parkingSpot.originalFees) {
      originalStr = parkingSpot.originalFees;
    } else if (parkingSpot.rates && parkingSpot.rates.length > 0) {
      const rates = parkingSpot.rates;
      const baseRates = rates.filter(r => r.type === 'base').sort((a, b) => a.minutes - b.minutes);
      const maxRates = rates.filter(r => r.type === 'max').sort((a, b) => a.minutes - b.minutes);
      
      const rateStrings: string[] = [];
      
      // Add all base rates
      baseRates.forEach(rate => {
        rateStrings.push(`${rate.minutes}分 ¥${rate.price.toLocaleString()}`);
      });
      
      // Add all max rates
      maxRates.forEach(rate => {
        const hours = Math.floor(rate.minutes / 60);
        if (hours >= 24) {
          rateStrings.push(`最大料金(24時間) ¥${rate.price.toLocaleString()}`);
        } else if (hours > 0) {
          rateStrings.push(`最大料金(${hours}時間) ¥${rate.price.toLocaleString()}`);
        } else {
          rateStrings.push(`最大料金(${rate.minutes}分) ¥${rate.price.toLocaleString()}`);
        }
      });
      
      if (rateStrings.length > 0) {
        originalStr = rateStrings.join('\n');
      }
    }
    
    // Legacy hourly_price field
    if (!originalStr && parkingSpot.hourly_price) {
      originalStr = `¥${parkingSpot.hourly_price}/時間`;
    }
    
    return {
      calculated: calculatedStr || '計算不可',
      original: originalStr || '料金情報なし'
    };
  };
  
  const formatOperatingHours = (): string => {
    if (selectedSpot.category === 'コインパーキング') {
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
      }
      return '---';
    }
    return '---';
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
      // Fallback to browser if Google Maps app is not installed
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
        {/* Handle Bar */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {selectedSpot.rank && (
              <View style={[
                styles.rankBadge,
                selectedSpot.rank === 1 && styles.goldBadge,
                selectedSpot.rank === 2 && styles.silverBadge,
                selectedSpot.rank === 3 && styles.bronzeBadge,
              ]}>
                <Text style={styles.rankText}>{selectedSpot.rank}</Text>
              </View>
            )}
            <View style={styles.titleContainer}>
              <Text style={styles.spotName} numberOfLines={1}>{selectedSpot.name}</Text>
              <Text style={styles.category}>{selectedSpot.category}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={openGoogleSearch} style={styles.actionButton}>
              <Ionicons name="search" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={openGoogleMaps} style={styles.actionButton}>
              <Ionicons name="map" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Price Section for Parking */}
          {isParking && (
            <>
              {formatPrice().calculated && (
                <View style={styles.priceSection}>
                  <View style={styles.priceIcon}>
                    <Ionicons name="calculator" size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.priceInfo}>
                    <Text style={styles.priceLabel}>計算料金</Text>
                    <Text style={styles.priceValue}>{formatPrice().calculated}</Text>
                  </View>
                </View>
              )}
              
              <View style={styles.priceSection}>
                <View style={styles.priceIcon}>
                  <Text style={styles.priceIconText}>¥</Text>
                </View>
                <View style={styles.priceInfo}>
                  <Text style={styles.priceLabel}>料金体系</Text>
                  <Text style={styles.priceValue}>{formatPrice().original}</Text>
                </View>
              </View>
            </>
          )}
          
          {/* Info Grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={20} color={Colors.primary} />
              <Text style={styles.infoLabel}>営業時間</Text>
              <Text style={styles.infoValue}>{formatOperatingHours()}</Text>
            </View>
            
            {isParking && (
              <>
                <View style={styles.infoItem}>
                  <Ionicons name="car-outline" size={20} color={Colors.primary} />
                  <Text style={styles.infoLabel}>駐車場タイプ</Text>
                  <Text style={styles.infoValue}>
                    {parkingSpot.type || '---'}
                  </Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Ionicons name="grid-outline" size={20} color={Colors.primary} />
                  <Text style={styles.infoLabel}>収容台数</Text>
                  <Text style={styles.infoValue}>
                    {parkingSpot.capacity ? `${parkingSpot.capacity}台` : '---'}
                  </Text>
                </View>
              </>
            )}
            
            {selectedSpot.elevation !== undefined && (
              <View style={styles.infoItem}>
                <Ionicons name="trending-up-outline" size={20} color={Colors.primary} />
                <Text style={styles.infoLabel}>標高</Text>
                <Text style={styles.infoValue}>{selectedSpot.elevation}m</Text>
              </View>
            )}
          </View>
          
          {/* Address */}
          {selectedSpot.address && (
            <View style={styles.addressSection}>
              <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.address}>{selectedSpot.address}</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent', // 完全に透明、地図をクリアに表示
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.divider,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
  rankText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  titleContainer: {
    flex: 1,
  },
  spotName: {
    fontSize: Typography.h6,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  category: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    padding: 8,
    backgroundColor: Colors.background,
    borderRadius: 20,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.medium,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  priceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  priceInfo: {
    flex: 1,
  },
  priceLabel: {
    fontSize: Typography.caption,
    color: Colors.white,
    opacity: 0.8,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
    marginTop: 2,
    lineHeight: 20,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 12,
  },
  infoItem: {
    width: '47%',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  infoLabel: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: Typography.bodySmall,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  addressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    marginBottom: 20,
    gap: 8,
  },
  address: {
    flex: 1,
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});