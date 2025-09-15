import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '@/stores/useAuthStore';
import { FavoritesService } from '@/services/favorites.service';
import { Colors } from '@/utils/constants';
import { Spot } from '@/types';
import { JAPAN_IMAGES } from '@/constants/japanImages';

interface FavoritesScreenProps {
  navigation: any;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
      console.log('📱 FavoritesScreen: お気に入り読み込み開始 - userId:', user.id);
      const { spots, error } = await FavoritesService.getFavoriteSpots(user.id);
      console.log('📱 FavoritesScreen: お気に入り読み込み結果:', {
        spotsCount: spots.length,
        spots: spots,
        error: error
      });
      setFavorites(spots);
      if (error) {
        console.error('📱 FavoritesScreen: エラー発生:', error);
        Alert.alert('エラー', error);
      }
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
    { key: 'all', label: '全て', icon: 'apps', gradient: ['#00ffff', '#0099ff'] },
    { key: 'コインパーキング', label: '駐車場', icon: 'car', gradient: ['#667eea', '#764ba2'] },
    { key: 'コンビニ', label: 'コンビニ', icon: 'storefront', gradient: ['#43e97b', '#38f9d7'] },
    { key: '温泉', label: '温泉', icon: 'water', gradient: ['#fa709a', '#fee140'] },
    { key: 'ガソリンスタンド', label: 'GS', icon: 'flame', gradient: ['#f093fb', '#f5576c'] },
  ];

  const handleNavigateToMap = (item: Spot) => {
    // 地図画面に遷移して、選択したスポットを表示
    navigation.navigate('Map', {
      selectedSpot: {
        id: item.id,
        lat: item.lat,
        lng: item.lng,
        name: item.name,
        category: item.category,
        address: item.address,
      },
      centerOnSpot: true,
      showDetail: true,
    });
  };

  const renderFavoriteItem = ({ item }: { item: Spot }) => {
    const categoryInfo = categories.find(c => c.key === item.category) || categories[0];

    return (
      <TouchableOpacity
        style={styles.favoriteItem}
        onPress={() => handleNavigateToMap(item)}
      >
        <BlurView intensity={50} style={styles.favoriteBlur}>
          <LinearGradient
            colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
            style={styles.favoriteGradient}
          >
            <View style={styles.favoriteIcon}>
              <LinearGradient
                colors={categoryInfo.gradient}
                style={styles.iconGradient}
              >
                <Ionicons name={categoryInfo.icon as any} size={20} color="#fff" />
              </LinearGradient>
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
                <View style={styles.priceContainer}>
                  <Text style={styles.favoritePrice}>
                    ¥{(item as any).calculatedFee.toLocaleString()}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.removeButton}
              onPress={(e) => {
                e.stopPropagation();
                handleRemoveFavorite(item.id);
              }}
            >
              <LinearGradient
                colors={['rgba(239,68,68,0.2)', 'rgba(220,38,38,0.2)']}
                style={styles.removeGradient}
              >
                <Ionicons name="heart" size={20} color="#EF4444" />
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </BlurView>
      </TouchableOpacity>
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <ImageBackground
          source={JAPAN_IMAGES.explore[2].source}
          style={styles.headerBackground}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)']}
            style={styles.headerOverlay}
          >
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <BlurView intensity={80} style={styles.blurButton}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </BlurView>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>お気に入り</Text>
          </LinearGradient>
        </ImageBackground>

        <View style={styles.emptyContainer}>
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
            style={styles.emptyCard}
          >
            <Ionicons name="heart-outline" size={80} color="rgba(255,255,255,0.6)" />
            <Text style={styles.emptyText}>ログインが必要です</Text>
            <Text style={styles.emptySubText}>
              ログインしてお気に入り機能を利用しましょう
            </Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => navigation.navigate('Login')}
            >
              <LinearGradient
                colors={['#00ffff', '#0099ff']}
                style={styles.loginGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.loginButtonText}>ログイン</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Header with Japanese Background */}
      <ImageBackground
        source={JAPAN_IMAGES.discover[1].source}
        style={styles.headerBackground}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
          style={styles.headerOverlay}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <BlurView intensity={80} style={styles.blurButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </BlurView>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>お気に入り</Text>
            <Text style={styles.headerSubtitle}>
              {favorites.length} 件の保存済み
            </Text>
          </View>
        </LinearGradient>
      </ImageBackground>

      {/* Premium Category Filter */}
      <View style={styles.categoryFilter}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={item => item.key}
          contentContainerStyle={styles.categoryScroll}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.categoryButton}
              onPress={() => setSelectedCategory(item.key)}
            >
              <LinearGradient
                colors={selectedCategory === item.key ? item.gradient : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                style={styles.categoryGradient}
              >
                <Ionicons
                  name={item.icon as any}
                  size={18}
                  color={selectedCategory === item.key ? '#fff' : 'rgba(255,255,255,0.7)'}
                />
                <Text style={[
                  styles.categoryLabel,
                  selectedCategory === item.key && styles.categoryLabelActive
                ]}>
                  {item.label}
                </Text>
                {selectedCategory === item.key && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryCount}>
                      {item.key === 'all'
                        ? favorites.length
                        : favorites.filter(f => f.category === item.key).length}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00ffff" />
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      ) : filteredFavorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
            style={styles.emptyCard}
          >
            <Ionicons name="heart-outline" size={64} color="rgba(255,255,255,0.6)" />
            <Text style={styles.emptyText}>
              {selectedCategory === 'all'
                ? 'お気に入りがありません'
                : `${categories.find(c => c.key === selectedCategory)?.label}のお気に入りがありません`}
            </Text>
            <Text style={styles.emptySubText}>
              地図から施設を検索してお気に入りに追加しましょう
            </Text>
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => navigation.navigate('Map')}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.mapGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="map" size={20} color="#fff" />
                <Text style={styles.mapButtonText}>地図を開く</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      ) : (
        <FlatList
          data={filteredFavorites}
          keyExtractor={item => item.id}
          renderItem={renderFavoriteItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerBackground: {
    height: 180,
    width: '100%',
  },
  headerOverlay: {
    flex: 1,
    paddingTop: 20,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
  },
  blurButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    fontWeight: '600',
  },
  categoryFilter: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  categoryScroll: {
    paddingHorizontal: 20,
  },
  categoryButton: {
    marginRight: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  categoryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  categoryLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginLeft: 8,
  },
  categoryLabelActive: {
    color: '#fff',
    fontWeight: '700',
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  categoryCount: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyCard: {
    width: '100%',
    alignItems: 'center',
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  loginButton: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  loginGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  mapButton: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  mapGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  listContent: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  favoriteItem: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  favoriteBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  favoriteGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
  },
  favoriteIcon: {
    marginRight: 16,
  },
  iconGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteInfo: {
    flex: 1,
  },
  favoriteName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  favoriteAddress: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoritePrice: {
    fontSize: 14,
    color: '#00ffff',
    fontWeight: '700',
  },
  removeButton: {
    padding: 4,
  },
  removeGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});