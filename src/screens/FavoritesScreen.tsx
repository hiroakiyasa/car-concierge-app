import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/useAuthStore';
import { FavoritesService } from '@/services/favorites.service';
import { Colors } from '@/utils/constants';
import { Spot } from '@/types';

interface FavoritesScreenProps {
  navigation: any;
}

export const FavoritesScreen: React.FC<FavoritesScreenProps> = ({ navigation }) => {
  const { user } = useAuthStore();
  const [favorites, setFavorites] = useState<Spot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { spots } = await FavoritesService.getFavoriteSpots(user.id);
      setFavorites(spots);
    } catch (error) {
      console.error('Failed to load favorites:', error);
      Alert.alert('エラー', 'お気に入りの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFavorite = (spotId: string) => {
    Alert.alert(
      'お気に入りから削除',
      'この施設をお気に入りから削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            
            const { error } = await FavoritesService.removeFavorite(user.id, spotId);
            if (!error) {
              setFavorites(favorites.filter(f => f.id !== spotId));
            } else {
              Alert.alert('エラー', error);
            }
          },
        },
      ]
    );
  };

  const filteredFavorites = selectedCategory === 'all' 
    ? favorites 
    : favorites.filter(f => f.category === selectedCategory);

  const categories = [
    { key: 'all', label: '全て', icon: '📍' },
    { key: 'コインパーキング', label: '駐車場', icon: '🅿️' },
    { key: 'コンビニ', label: 'コンビニ', icon: '🏪' },
    { key: '温泉', label: '温泉', icon: '♨️' },
    { key: 'ガソリンスタンド', label: 'GS', icon: '⛽' },
  ];

  const renderFavoriteItem = ({ item }: { item: Spot }) => (
    <TouchableOpacity 
      style={styles.favoriteItem}
      onPress={() => {
        // TODO: Navigate to detail screen
      }}
    >
      <View style={styles.favoriteIcon}>
        <Text style={styles.iconText}>
          {item.category === 'コインパーキング' ? '🅿️' :
           item.category === 'コンビニ' ? '🏪' :
           item.category === '温泉' ? '♨️' :
           item.category === 'ガソリンスタンド' ? '⛽' : '📍'}
        </Text>
      </View>
      
      <View style={styles.favoriteInfo}>
        <Text style={styles.favoriteName} numberOfLines={1}>
          {item.name}
        </Text>
        {item.address && (
          <Text style={styles.favoriteAddress} numberOfLines={1}>
            {item.address}
          </Text>
        )}
        {item.category === 'コインパーキング' && (item as any).calculatedFee && (
          <Text style={styles.favoritePrice}>
            料金: ¥{(item as any).calculatedFee.toLocaleString()}
          </Text>
        )}
      </View>
      
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveFavorite(item.id)}
      >
        <Ionicons name="heart" size={24} color={Colors.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>お気に入り</Text>
        </View>
        
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>ログインが必要です</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>ログイン</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>お気に入り</Text>
      </View>

      {/* カテゴリーフィルター */}
      <View style={styles.categoryFilter}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={item => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === item.key && styles.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory(item.key)}
            >
              <Text style={styles.categoryIcon}>{item.icon}</Text>
              <Text style={[
                styles.categoryLabel,
                selectedCategory === item.key && styles.categoryLabelActive
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : filteredFavorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {selectedCategory === 'all' 
              ? 'お気に入りがありません' 
              : `${categories.find(c => c.key === selectedCategory)?.label}のお気に入りがありません`}
          </Text>
          <Text style={styles.emptySubText}>
            地図から施設を検索してお気に入りに追加しましょう
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredFavorites}
          keyExtractor={item => item.id}
          renderItem={renderFavoriteItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  categoryFilter: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  categoryButtonActive: {
    backgroundColor: Colors.primary,
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  categoryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryLabelActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: 16,
  },
  favoriteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
  favoriteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  favoriteInfo: {
    flex: 1,
  },
  favoriteName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  favoriteAddress: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
  favoritePrice: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  removeButton: {
    padding: 8,
  },
  separator: {
    height: 12,
  },
});