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
  PanResponder,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useMainStore } from '@/stores/useMainStore';
import { Colors, Spacing, Typography } from '@/utils/constants';
import { CoinParking } from '@/types';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.95;

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
  const translateY = React.useRef(new Animated.Value(0)).current;
  
  // コインパーキングのみを抽出してランキング表示
  const parkingSpots = searchResults
    .filter(spot => spot.category === 'コインパーキング')
    .slice(0, 20) as CoinParking[];
  
  // スワイプダウンで閉じるジェスチャー
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 下方向へのスワイプのみ反応（5px以上移動したら）
        return gestureState.dy > 5 && Math.abs(gestureState.dx) < Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) { // 100px以上下にスワイプしたら閉じる
          Animated.timing(translateY, {
            toValue: MODAL_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
          }).start();
        }
      },
    })
  ).current;

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
        
        <Text style={styles.spotName} numberOfLines={1}>{item.name}</Text>
        
        <Text style={styles.priceText}>{formatPrice(item)}</Text>
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
      
      <Animated.View 
        {...panResponder.panHandlers}
        style={[
          styles.modalContainer,
          {
            transform: [{ translateY }]
          }
        ]}
      >
        {/* ドラッグハンドル */}
        <View style={styles.dragHandle}>
          <View style={styles.handle} />
        </View>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="trophy" size={20} color={Colors.warning} />
            <Text style={styles.title}>駐車料金ランキング TOP20</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
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
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: MODAL_HEIGHT,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  dragHandle: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  listContent: {
    paddingVertical: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.white,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
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
    fontSize: 12,
    fontWeight: 'bold',
  },
  spotName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    paddingRight: 8,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  separator: {
    height: 0.5,
    backgroundColor: Colors.divider,
    marginHorizontal: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});