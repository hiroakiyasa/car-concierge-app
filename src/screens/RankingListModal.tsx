import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  ScrollView,
  FlatList,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useMainStore } from '@/stores/useMainStore';
import { Colors, Spacing, Typography } from '@/utils/constants';
import { CoinParking } from '@/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.45;

interface RankingListModalProps {
  visible: boolean;
  onClose: () => void;
  onSpotSelect: (spot: CoinParking) => void;
}

export const RankingListModal: React.FC<RankingListModalProps> = ({ 
  visible, 
  onClose,
  onSpotSelect 
}) => {
  const { searchResults, searchFilter } = useMainStore();
  
  // コインパーキングのみを抽出してランキング表示
  const parkingSpots = searchResults
    .filter(spot => spot.category === 'コインパーキング')
    .slice(0, 20) as CoinParking[];

  const getRankStyle = (rank: number) => {
    switch(rank) {
      case 1: return styles.goldRank;
      case 2: return styles.silverRank;
      case 3: return styles.bronzeRank;
      default: return styles.normalRank;
    }
  };

  const formatPrice = (spot: CoinParking): string => {
    if (spot.calculatedFee !== undefined && spot.calculatedFee !== null) {
      return `¥${spot.calculatedFee.toLocaleString()}`;
    }
    return '---';
  };

  const renderItem = ({ item, index }: { item: CoinParking; index: number }) => {
    const rank = index + 1;
    
    return (
      <TouchableOpacity 
        style={styles.listItem}
        onPress={() => {
          onSpotSelect(item);
          onClose();
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.rankBadge, getRankStyle(rank)]}>
          <Text style={styles.rankText}>{rank}</Text>
        </View>
        
        <View style={styles.itemContent}>
          <Text style={styles.spotName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.spotAddress} numberOfLines={1}>
            {item.address || '住所情報なし'}
          </Text>
        </View>
        
        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>{formatPrice(item)}</Text>
          <Text style={styles.durationText}>
            {searchFilter.parkingDuration.formattedDuration}
          </Text>
        </View>
      </TouchableOpacity>
    );
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
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
      </TouchableOpacity>
      
      <View style={styles.modal}>
        {/* Handle Bar */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="trophy" size={24} color={Colors.warning} />
            <Text style={styles.title}>駐車料金ランキング TOP20</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
        
        {/* List */}
        <FlatList
          data={parkingSpots}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>駐車場が見つかりません</Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: MODAL_HEIGHT,
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
    gap: 8,
  },
  title: {
    fontSize: Typography.h6,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: 8,
  },
  listContent: {
    paddingVertical: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.medium,
    paddingVertical: 12,
    backgroundColor: Colors.white,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  goldRank: {
    backgroundColor: '#FFD700',
  },
  silverRank: {
    backgroundColor: '#C0C0C0',
  },
  bronzeRank: {
    backgroundColor: '#CD7F32',
  },
  normalRank: {
    backgroundColor: Colors.primary,
  },
  rankText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemContent: {
    flex: 1,
    marginRight: 12,
  },
  spotName: {
    fontSize: Typography.bodySmall,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  spotAddress: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: Typography.h6,
    fontWeight: '700',
    color: Colors.primary,
  },
  durationText: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: Spacing.medium,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
  },
});