import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '@/stores/useAuthStore';
import { FavoritesService } from '@/services/favorites.service';
import { ReviewsService } from '@/services/reviews.service';
import { Colors } from '@/utils/constants';
import { JAPAN_IMAGES } from '@/constants/japanImages';
import { supabase } from '@/config/supabase';
import { FeatureFlags } from '@/constants/featureFlags';

interface ProfileScreenProps {
  navigation: any;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 管理者として許可されたメールアドレス
const ADMIN_EMAILS = ['hiroakiyasa@yahoo.co.jp', 'hiroakiyasa@gmail.com'];

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, isAuthenticated, signOut } = useAuthStore();
  const [stats, setStats] = useState({
    favorites: 0,
    reviews: 0,
    likes: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    console.log('🔵 ProfileScreen: マウント/ユーザー変更', {
      hasUser: !!user,
      isAuthenticated,
      userEmail: user?.email
    });
    if (user) {
      loadUserStats();
    }
  }, [user, isAuthenticated]);

  // 管理者権限チェック
  useEffect(() => {
    const checkAdminStatus = async () => {
      console.log('🔐 ProfileScreen: 管理者チェック開始', {
        hasUser: !!user,
        userEmail: user?.email,
        userId: user?.id
      });

      if (!user) {
        console.log('❌ ProfileScreen: userがnullのため管理者権限なし');
        setIsAdmin(false);
        return;
      }

      try {
        // Supabaseセッションを再取得
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        console.log('🔐 ProfileScreen: セッション確認', {
          hasSession: !!session,
          sessionError: sessionError?.message,
          sessionUser: session?.user?.email,
        });

        if (sessionError || !session) {
          console.log('❌ ProfileScreen: セッションなし');
          setIsAdmin(false);
          return;
        }

        // セッションから直接メールアドレスを取得
        const userEmail = session.user.email?.toLowerCase();

        console.log('🔐 ProfileScreen: メール確認', {
          userEmail,
          adminEmails: ADMIN_EMAILS.map(e => e.toLowerCase()),
        });

        if (!userEmail) {
          console.log('❌ ProfileScreen: メールアドレスなし');
          setIsAdmin(false);
          return;
        }

        // 大文字小文字を区別せずに比較
        const isAdminUser = ADMIN_EMAILS.some(
          adminEmail => adminEmail.toLowerCase() === userEmail
        );

        console.log('🔐 ProfileScreen: 管理者チェック完了', {
          email: userEmail,
          isAdmin: isAdminUser,
        });

        setIsAdmin(isAdminUser);
      } catch (error) {
        console.error('❌ ProfileScreen: 管理者チェック例外:', error);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user, isAuthenticated]);

  const loadUserStats = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // お気に入り数を取得
      const favoriteStats = await FavoritesService.getFavoriteStats(user.id);

      // レビュー数を取得
      const { reviews } = await ReviewsService.getUserReviews(user.id);

      // いいね数を計算
      const totalLikes = reviews.reduce((sum, review) => sum + review.likes_count, 0);

      setStats({
        favorites: favoriteStats.total,
        reviews: reviews.length,
        likes: totalLikes,
      });
    } catch (error) {
      console.error('Failed to load user stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしてもよろしいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            navigation.navigate('Map');
          },
        },
      ]
    );
  };

  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <ImageBackground
          source={JAPAN_IMAGES.nature[1].source}
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
            <Text style={styles.headerTitle}>プロフィール</Text>
          </LinearGradient>
        </ImageBackground>

        <View style={styles.notLoggedIn}>
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
            style={styles.notLoggedInCard}
          >
            <Ionicons name="person-circle-outline" size={100} color="rgba(255,255,255,0.6)" />
            <Text style={styles.notLoggedInText}>ログインしていません</Text>
            <Text style={styles.notLoggedInSubtext}>
              ログインすると、お気に入りやレビュー機能が利用できます
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
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Premium Header with Japanese Background */}
        <ImageBackground
          source={JAPAN_IMAGES.nature[0].source}
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

            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                {user.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                ) : (
                  <LinearGradient
                    colors={['#00ffff', '#0099ff']}
                    style={styles.avatarPlaceholder}
                  >
                    <Ionicons name="person" size={50} color="#fff" />
                  </LinearGradient>
                )}
                {FeatureFlags.ENABLE_PREMIUM_FEATURES && user.is_premium && (
                  <View style={styles.premiumBadge}>
                    <LinearGradient
                      colors={['#FFD700', '#FFA500']}
                      style={styles.premiumBadgeGradient}
                    >
                      <Ionicons name="star" size={18} color="#fff" />
                    </LinearGradient>
                  </View>
                )}
              </View>

              <Text style={styles.userName}>{user.name || 'ゲストユーザー'}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>

              {FeatureFlags.ENABLE_PREMIUM_FEATURES && user.is_premium && (
                <View style={styles.premiumTag}>
                  <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    style={styles.premiumTagGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="star" size={14} color="#fff" />
                    <Text style={styles.premiumTagText}>プレミアム会員</Text>
                  </LinearGradient>
                </View>
              )}
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* Stats Section with Glassmorphism */}
        <View style={styles.statsSection}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#00ffff" />
          ) : (
            <View style={styles.statsContainer}>
              <TouchableOpacity style={styles.statItem}>
                <LinearGradient
                  colors={['rgba(0,255,255,0.1)', 'rgba(0,153,255,0.1)']}
                  style={styles.statGradient}
                >
                  <Text style={styles.statValue}>{stats.favorites}</Text>
                  <Text style={styles.statLabel}>お気に入り</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.statItem}>
                <LinearGradient
                  colors={['rgba(255,215,0,0.1)', 'rgba(255,165,0,0.1)']}
                  style={styles.statGradient}
                >
                  <Text style={styles.statValue}>{stats.reviews}</Text>
                  <Text style={styles.statLabel}>レビュー</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.statItem}>
                <LinearGradient
                  colors={['rgba(255,105,180,0.1)', 'rgba(255,20,147,0.1)']}
                  style={styles.statGradient}
                >
                  <Text style={styles.statValue}>{stats.likes}</Text>
                  <Text style={styles.statLabel}>いいね</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Premium Menu Section */}
        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Favorites')}
          >
            <BlurView intensity={50} style={styles.menuBlur}>
              <LinearGradient
                colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                style={styles.menuGradient}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIconContainer}>
                    <LinearGradient
                      colors={['#FF69B4', '#FF1493']}
                      style={styles.menuIconGradient}
                    >
                      <Ionicons name="heart" size={20} color="#fff" />
                    </LinearGradient>
                  </View>
                  <View>
                    <Text style={styles.menuItemText}>お気に入り</Text>
                    <Text style={styles.menuItemSubtext}>保存した駐車場</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
              </LinearGradient>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('MyReviews')}
          >
            <BlurView intensity={50} style={styles.menuBlur}>
              <LinearGradient
                colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                style={styles.menuGradient}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIconContainer}>
                    <LinearGradient
                      colors={['#FFD700', '#FFA500']}
                      style={styles.menuIconGradient}
                    >
                      <Ionicons name="star" size={20} color="#fff" />
                    </LinearGradient>
                  </View>
                  <View>
                    <Text style={styles.menuItemText}>マイレビュー</Text>
                    <Text style={styles.menuItemSubtext}>投稿したレビュー</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
              </LinearGradient>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ParkingHistory')}
          >
            <BlurView intensity={50} style={styles.menuBlur}>
              <LinearGradient
                colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                style={styles.menuGradient}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIconContainer}>
                    <LinearGradient
                      colors={['#6366f1', '#8b5cf6']}
                      style={styles.menuIconGradient}
                    >
                      <Ionicons name="time" size={20} color="#fff" />
                    </LinearGradient>
                  </View>
                  <View>
                    <Text style={styles.menuItemText}>駐車履歴</Text>
                    <Text style={styles.menuItemSubtext}>利用履歴と統計</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
              </LinearGradient>
            </BlurView>
          </TouchableOpacity>

          {/* 駐車場の追加 - REMOVED: Now in main menu for better discoverability */}

          {isAdmin && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('AdminSubmissions')}
            >
              <BlurView intensity={50} style={styles.menuBlur}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                  style={styles.menuGradient}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={styles.menuIconContainer}>
                      <LinearGradient
                        colors={['#F59E0B', '#D97706']}
                        style={styles.menuIconGradient}
                      >
                        <Ionicons name="shield-checkmark" size={20} color="#fff" />
                      </LinearGradient>
                    </View>
                    <View>
                      <Text style={styles.menuItemText}>投稿管理（管理者）</Text>
                      <Text style={styles.menuItemSubtext}>投稿の承認・却下</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
                </LinearGradient>
              </BlurView>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Settings')}
          >
            <BlurView intensity={50} style={styles.menuBlur}>
              <LinearGradient
                colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                style={styles.menuGradient}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIconContainer}>
                    <LinearGradient
                      colors={['#8E2DE2', '#4A00E0']}
                      style={styles.menuIconGradient}
                    >
                      <Ionicons name="settings" size={20} color="#fff" />
                    </LinearGradient>
                  </View>
                  <View>
                    <Text style={styles.menuItemText}>設定</Text>
                    <Text style={styles.menuItemSubtext}>アプリの設定</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
              </LinearGradient>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Help')}
          >
            <BlurView intensity={50} style={styles.menuBlur}>
              <LinearGradient
                colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                style={styles.menuGradient}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIconContainer}>
                    <LinearGradient
                      colors={['#00ffff', '#0099ff']}
                      style={styles.menuIconGradient}
                    >
                      <Ionicons name="help-circle" size={20} color="#fff" />
                    </LinearGradient>
                  </View>
                  <View>
                    <Text style={styles.menuItemText}>ヘルプ</Text>
                    <Text style={styles.menuItemSubtext}>使い方・よくある質問</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
              </LinearGradient>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.logoutItem]}
            onPress={handleSignOut}
          >
            <BlurView intensity={50} style={styles.menuBlur}>
              <LinearGradient
                colors={['rgba(239,68,68,0.1)', 'rgba(220,38,38,0.1)']}
                style={styles.menuGradient}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIconContainer}>
                    <LinearGradient
                      colors={['#EF4444', '#DC2626']}
                      style={styles.menuIconGradient}
                    >
                      <Ionicons name="log-out" size={20} color="#fff" />
                    </LinearGradient>
                  </View>
                  <View>
                    <Text style={[styles.menuItemText, { color: '#EF4444' }]}>
                      ログアウト
                    </Text>
                    <Text style={[styles.menuItemSubtext, { color: 'rgba(239,68,68,0.7)' }]}>
                      アカウントからログアウト
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </BlurView>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerBackground: {
    height: 280,
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
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginTop: 70,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  profileHeader: {
    alignItems: 'center',
    marginTop: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  premiumBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  premiumBadgeGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  premiumTag: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  premiumTagGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  premiumTagText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  notLoggedIn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 60,
  },
  notLoggedInCard: {
    width: '100%',
    alignItems: 'center',
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  notLoggedInText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 20,
    marginBottom: 8,
  },
  notLoggedInSubtext: {
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
  statsSection: {
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statGradient: {
    alignItems: 'center',
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  menuSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  menuItem: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconContainer: {
    marginRight: 16,
  },
  menuIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  menuItemSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  logoutItem: {
    marginTop: 20,
  },
});