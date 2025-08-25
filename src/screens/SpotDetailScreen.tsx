import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useMainStore } from '@/stores/useMainStore';
import { Colors, Spacing, Typography } from '@/utils/constants';
import { CoinParking } from '@/types';
import { LocationService } from '@/services/location.service';
import { Platform } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SpotDetailScreenProps {
  navigation: any;
}

export const SpotDetailScreen: React.FC<SpotDetailScreenProps> = ({ navigation }) => {
  const { selectedSpot, userLocation } = useMainStore();
  
  if (!selectedSpot) {
    return null;
  }
  
  const isParking = selectedSpot.category === 'コインパーキング';
  const parkingSpot = selectedSpot as CoinParking;
  
  const formatDistance = (): string => {
    if (!userLocation) return '---';
    const distance = LocationService.calculateDistance(userLocation, selectedSpot);
    return LocationService.formatDistance(distance);
  };
  
  const formatPrice = (): string => {
    if (!isParking || !parkingSpot.rates || parkingSpot.rates.length === 0) {
      return '---';
    }
    
    const rates = parkingSpot.rates;
    const baseRate = rates.find(r => r.type === 'base');
    const maxRate = rates.find(r => r.type === 'max');
    
    let priceText = '';
    if (baseRate) {
      priceText = `${baseRate.minutes}分 ¥${baseRate.price}`;
    }
    if (maxRate) {
      priceText += `\n最大料金 (${maxRate.minutes / 60}時間) ¥${maxRate.price}`;
    }
    
    return priceText || '料金情報なし';
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
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="search" size={16} color={Colors.primary} />
              <Text style={styles.actionButtonText}>検索</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="map" size={16} color={Colors.primary} />
              <Text style={styles.actionButtonText}>地図</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Title */}
        <View style={styles.titleContainer}>
          <View style={styles.titleRow}>
            <View style={styles.parkingBadge}>
              <Text style={styles.parkingBadgeText}>P</Text>
            </View>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>
                {selectedSpot.category}
              </Text>
            </View>
          </View>
          <Text style={styles.spotName}>{selectedSpot.name}</Text>
        </View>
        
        {/* Pricing Info (for parking) */}
        {isParking && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>¥</Text>
              <Text style={styles.sectionTitle}>料金・標高</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>標高</Text>
              <Text style={styles.infoValue}>
                {selectedSpot.elevation ? `${selectedSpot.elevation}m` : '---'}
              </Text>
            </View>
            <View style={styles.pricingBox}>
              <Text style={styles.pricingTitle}>料金体系</Text>
              <Text style={styles.pricingText}>{formatPrice()}</Text>
            </View>
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
            <Text style={styles.infoLabel}>座標</Text>
            <Text style={styles.infoValue}>
              {selectedSpot.lat.toFixed(6)}, {selectedSpot.lng.toFixed(6)}
            </Text>
          </View>
        </View>
        
        {/* Nearby Facilities */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>周辺施設</Text>
          </View>
          <View style={styles.facilityRow}>
            <View style={styles.facilityItem}>
              <Text style={styles.facilityEmoji}>🏪</Text>
              <Text style={styles.facilityName}>セブンイレブン日本橋明町店</Text>
              <Text style={styles.facilityDistance}>約54m</Text>
            </View>
            <View style={styles.facilityItem}>
              <Text style={styles.facilityEmoji}>♨️</Text>
              <Text style={styles.facilityName}>京急EXイン 東京・日本橋</Text>
              <Text style={styles.facilityDistance}>約206m</Text>
            </View>
          </View>
        </View>
        
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
});