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
  PanResponder,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMainStore } from '@/stores/useMainStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { Colors } from '@/utils/constants';
import { FavoriteButton } from '@/components/FavoriteButton';
import { ConvenienceBrandLogo } from '@/components/BrandLogos';
import { RatingDisplay } from '@/components/RatingDisplay';
import { ReviewService } from '@/services/review.service';
import { ReviewModal } from '@/components/Reviews/ReviewModal';
import { ReviewList } from '@/components/Reviews/ReviewList';
import { HotSpringReviewModal } from '@/components/Reviews/HotSpringReviewModal';
import { HotSpringReviewList } from '@/components/Reviews/HotSpringReviewList';
import { PhotoUploadModal } from '@/components/Photos/PhotoUploadModal';
import { CoinParking, HotSpring, GasStation, ConvenienceStore } from '@/types';
import { ParkingFeeCalculator } from '@/services/parking-fee.service';
import { SupabaseService } from '@/services/supabase.service';
import { NATIONAL_AVERAGE_PRICES, formatPriceDifference, getPriceDifferenceColor } from '@/utils/fuelPrices';
import { supabase } from '@/config/supabase';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.6; // 60% of screen height
const PHOTO_SIZE = (SCREEN_WIDTH - 64) / 3;

interface SpotDetailBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const SpotDetailBottomSheet: React.FC<SpotDetailBottomSheetProps> = ({
  visible,
  onClose
}) => {
  // すべてのフックを最初に定義（条件分岐なし）
  const navigation = useNavigation<any>();
  const { selectedSpot, searchFilter, setHighlightedParkingId } = useMainStore();
  const { isAuthenticated, user } = useAuthStore();
  const [facilityNames, setFacilityNames] = React.useState<{
    convenience?: string;
    hotspring?: string;
    toilet?: string;
  }>({});
  const [reviewStats, setReviewStats] = React.useState<{
    average: number;
    count: number;
  }>({ average: 0, count: 0 });
  const [reviewModalVisible, setReviewModalVisible] = React.useState(false);
  const [hotSpringReviewModalVisible, setHotSpringReviewModalVisible] = React.useState(false);
  const [reviewKey, setReviewKey] = React.useState(0);
  const [hotSpringReviewKey, setHotSpringReviewKey] = React.useState(0);
  const [hotSpringReviewStats, setHotSpringReviewStats] = React.useState<{
    average: number;
    count: number;
  }>({ average: 0, count: 0 });
  const scrollX = React.useRef(new Animated.Value(0)).current;
  const [nameWidth, setNameWidth] = React.useState(0);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'reviews' | 'photos'>('overview');
  const [ratingDistribution, setRatingDistribution] = React.useState<Record<number, number>>({});
  const [sortOrder, setSortOrder] = React.useState<'relevance' | 'newest' | 'highest' | 'lowest'>('relevance');
  const tabTranslateX = React.useRef(new Animated.Value(0)).current;
  const [photos, setPhotos] = React.useState<any[]>([]);
  const [photosLoading, setPhotosLoading] = React.useState(false);
  const [photoUploadModalVisible, setPhotoUploadModalVisible] = React.useState(false);

  // パネル内で即時に周辺施設を表示するためのローカル状態
  const [panelNearby, setPanelNearby] = React.useState<{
    convenience?: { id: string; name: string; distance?: number; brand?: string };
    hotspring?: { id: string; name: string; distance?: number };
    toilet?: { id: string; name: string; distance?: number };
  }>({});
  const [nearbyLoading, setNearbyLoading] = React.useState(false);
  
  // スワイプジェスチャーの設定
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 20;
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx } = gestureState;
        const threshold = 50;
        
        if (dx > threshold) {
          // 右にスワイプ - 前のタブへ
          if (activeTab === 'reviews') {
            setActiveTab('overview');
          } else if (activeTab === 'photos') {
            setActiveTab('reviews');
          }
        } else if (dx < -threshold) {
          // 左にスワイプ - 次のタブへ
          if (activeTab === 'overview') {
            setActiveTab('reviews');
          } else if (activeTab === 'reviews') {
            setActiveTab('photos');
          }
        }
      },
    })
  ).current;
  
  // 写真を取得
  const fetchPhotos = React.useCallback(async () => {
    if (!selectedSpot || !visible) return;

    setPhotosLoading(true);
    try {
      let tableName = '';
      let columnName = '';

      if (selectedSpot.category === 'コインパーキング') {
        tableName = 'parking_photos';
        columnName = 'parking_spot_id';
      } else if (selectedSpot.category === '温泉') {
        tableName = 'hotspring_photos';
        columnName = 'hotspring_id';
      } else if (selectedSpot.category === 'ガソリンスタンド') {
        tableName = 'gasstation_photos';
        columnName = 'gasstation_id';
      } else {
        setPhotosLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from(tableName)
        .select(`
          id,
          url,
          thumbnail_url,
          user_id,
          created_at
        `)
        .eq(columnName, selectedSpot.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`Fetched ${data?.length || 0} photos from ${tableName} for ${columnName}=${selectedSpot.id}`);

      // ユーザー情報を省略してシンプルに表示
      const formattedPhotos = data?.map(photo => ({
        ...photo,
        user_name: '投稿者',
      })) || [];

      setPhotos(formattedPhotos);
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setPhotosLoading(false);
    }
  }, [selectedSpot, visible]);

  React.useEffect(() => {
    // 概要タブでも写真を表示するため、常に写真を取得
    if (selectedSpot && visible) {
      fetchPhotos();
    }
  }, [selectedSpot, visible, fetchPhotos]);

  // パネルを開いたら即座に周辺施設を解決して表示
  React.useEffect(() => {
    if (!visible || !selectedSpot || selectedSpot.category !== 'コインパーキング') return;
    const parking = selectedSpot as CoinParking;

    // まず、既存のデータから即座に表示可能な情報を設定
    const initialNearby: any = {};

    // コンビニの即座表示
    if (parking.nearestConvenienceStore) {
      const raw = parking.nearestConvenienceStore as any;
      const storedDistance = raw.distance_m || raw.distance || raw.distance_meters;
      initialNearby.convenience = {
        id: raw.id || raw.store_id,
        name: raw.name || 'コンビニ',
        distance: storedDistance ? Math.round(storedDistance) : undefined
      };
    }

    // 温泉の即座表示
    if (parking.nearestHotspring) {
      const raw = parking.nearestHotspring as any;
      const storedDistance = raw.distance_m || raw.distance || raw.distance_meters;
      initialNearby.hotspring = {
        id: raw.id || raw.spring_id,
        name: raw.name || '温泉',
        distance: storedDistance ? Math.round(storedDistance) : undefined
      };
    }

    // トイレの即座表示
    if (parking.nearest_toilet) {
      const rawAny = parking.nearest_toilet as any;
      const raw = typeof rawAny === 'string' ? (() => { try { return JSON.parse(rawAny); } catch { return {}; } })() : rawAny;
      const storedDistance = raw.distance_m || raw.distance || raw.distance_meters;
      initialNearby.toilet = {
        id: String(raw.id || raw.toilet_id || ''),
        name: raw.name || 'トイレ',
        distance: storedDistance ? Math.round(storedDistance) : undefined
      };
    }

    // 即座に初期データを表示
    setPanelNearby(initialNearby);

    // その後、詳細情報を取得して更新（無い場合は近傍探索で補完）
    (async () => {
      setNearbyLoading(true);
      try {
        const updated: any = { ...initialNearby };

        // コンビニ: 詳細情報を取得
        if (parking.nearestConvenienceStore) {
          const raw = parking.nearestConvenienceStore as any;
          const id = String(raw.id || raw.store_id || '');

          if (id) {
            const store = await SupabaseService.fetchConvenienceStoreById(id);
            if (store) {
              updated.convenience = {
                ...updated.convenience,
                id: store.id,
                name: store.name,
                brand: store.brand || store.name
              };
            }
          }
        }

        // トイレ: 詳細情報を取得（既にRPCから名前が取得されているので、それを使用）
        if (parking.nearest_toilet) {
          const rawAny = parking.nearest_toilet as any;
          const raw = typeof rawAny === 'string' ? (() => { try { return JSON.parse(rawAny); } catch { return {}; } })() : rawAny;
          const id = String(raw.id || raw.toilet_id || '');
          const distance = raw.distance_m || raw.distance || raw.distance_meters || undefined;

          // RPCから既に名前が取得されているので、それを使用
          updated.toilet = {
            id: id,
            name: raw.name || 'トイレ',
            distance: distance ? Math.round(distance) : undefined
          };
        }

        // 温泉: 詳細情報を取得
        if (parking.nearestHotspring) {
          const raw = parking.nearestHotspring as any;
          const id = String(raw.id || raw.spring_id || '');

          if (id) {
            const spring = await SupabaseService.fetchHotSpringById(id);
            if (spring) {
              updated.hotspring = {
                ...updated.hotspring,
                id: spring.id,
                name: spring.name,
                distance: updated.hotspring?.distance
              };
            }
          }
        }

        // 近傍データが無い場合は周辺探索で補完
        if (!updated.convenience) {
          try {
            const stores = await SupabaseService.fetchNearbyConvenienceStoresAround(parking.lat, parking.lng, 500, 1);
            if (stores && stores.length > 0) {
              updated.convenience = { id: stores[0].id, name: stores[0].name || 'コンビニ', distance: Math.round((stores as any)[0]._dist || 0) };
            }
          } catch {}
        }
        if (!updated.hotspring) {
          try {
            const springs = await SupabaseService.fetchNearbyHotSpringsAround(parking.lat, parking.lng, 2000, 1);
            if (springs && springs.length > 0) {
              updated.hotspring = { id: springs[0].id, name: springs[0].name || '温泉', distance: Math.round((springs as any)[0]._dist || 0) };
            }
          } catch {}
        }

        setPanelNearby(updated);
      } catch (e) {
        console.warn('周辺施設詳細ロード失敗:', e);
      } finally {
        setNearbyLoading(false);
      }
    })();
  }, [visible, selectedSpot]);

  // 駐車場データのログと施設名の取得
  React.useEffect(() => {
    if (!selectedSpot || selectedSpot.category !== 'コインパーキング' || !visible) {
      setFacilityNames({});
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
      parkingType: parkingSpot.parkingType,
      capacity: parkingSpot.capacity,
      nearestConvenienceStore: parkingSpot.nearestConvenienceStore,
      nearestHotspring: parkingSpot.nearestHotspring,
      nearest_toilet: parkingSpot.nearest_toilet,
      全オブジェクト: parkingSpot,
    });

    // まず即座に仮の名前を設定
    const tempNames: { convenience?: string; hotspring?: string; toilet?: string } = {};
    if (parkingSpot.nearestConvenienceStore) {
      tempNames.convenience = 'コンビニ';
    }
    if (parkingSpot.nearestHotspring) {
      tempNames.hotspring = '温泉';
    }
    if (parkingSpot.nearest_toilet) {
      tempNames.toilet = 'トイレ';
    }
    setFacilityNames(tempNames);

    // 施設名を取得（IDベースで正確な情報を取得）
    const fetchFacilityNames = async () => {
      const names: { convenience?: string; hotspring?: string; toilet?: string } = {};

      // デバッグ: データ構造を確認
      console.log('🔍 駐車場の周辺施設データ:', {
        parkingId: parkingSpot.id,
        parkingName: parkingSpot.name,
        nearestConvenienceStore: parkingSpot.nearestConvenienceStore,
        nearestHotspring: parkingSpot.nearestHotspring,
        nearest_toilet: parkingSpot.nearest_toilet,
      });

      // コンビニ情報
      if (parkingSpot.nearestConvenienceStore) {
        const convenienceData = parkingSpot.nearestConvenienceStore as any;
        const storeId = convenienceData.id || convenienceData.store_id || convenienceData.facility_id;

        if (storeId) {
          console.log('🏪 コンビニIDで取得開始:', storeId);
          try {
            const store = await SupabaseService.fetchConvenienceStoreById(String(storeId));
            if (store && store.name) {
              names.convenience = store.name;
              console.log('✅ コンビニ名取得成功:', {
                id: storeId,
                name: names.convenience,
                distance: convenienceData.distance_m || convenienceData.distance
              });
            } else {
              // デフォルト名を使用
              names.convenience = 'コンビニ';
              console.log('⚠️ コンビニ情報が見つかりません、デフォルト名使用:', storeId);
            }
          } catch (error) {
            console.error('❌ コンビニ情報取得エラー:', error);
            // エラー時もデフォルト名を使用
            names.convenience = 'コンビニ';
          }
        } else {
          console.log('⚠️ コンビニIDが存在しません');
          names.convenience = 'コンビニ';
        }
      }

      // トイレ情報（既にRPCから名前が取得されている）
      if (parkingSpot.nearest_toilet) {
        const toiletData = parkingSpot.nearest_toilet as any;

        // RPCから既に名前が取得されているので、それを使用
        if (toiletData.name) {
          names.toilet = toiletData.name;
          console.log('✅ トイレ名取得成功（RPCから）:', {
            id: toiletData.id,
            name: toiletData.name,
            distance: toiletData.distance_m || toiletData.distance
          });
        } else {
          // デフォルト名を使用
          names.toilet = 'トイレ';
          console.log('⚠️ トイレ名が見つかりません、デフォルト名使用');
        }
      }

      // 温泉情報
      if (parkingSpot.nearestHotspring) {
        const hotspringData = parkingSpot.nearestHotspring as any;
        const springId = hotspringData.id || hotspringData.spring_id || hotspringData.facility_id;

        if (springId) {
          console.log('♨️ 温泉IDで取得開始:', springId);
          try {
            const spring = await SupabaseService.fetchHotSpringById(String(springId));
            if (spring && spring.name) {
              names.hotspring = spring.name;
              console.log('✅ 温泉名取得成功:', {
                id: springId,
                name: names.hotspring,
                distance: hotspringData.distance_m || hotspringData.distance
              });
            } else {
              // デフォルト名を使用
              names.hotspring = '温泉';
              console.log('⚠️ 温泉情報が見つかりません、デフォルト名使用:', springId);
            }
          } catch (error) {
            console.error('❌ 温泉情報取得エラー:', error);
            // エラー時もデフォルト名を使用
            names.hotspring = '温泉';
          }
        } else {
          console.log('⚠️ 温泉IDが存在しません');
          names.hotspring = '温泉';
        }
      }

      console.log('📊 最終的な施設名:', names);
      setFacilityNames(names);
    };

    // 非同期で施設名を取得
    fetchFacilityNames();
  }, [visible, selectedSpot]);
  
  // レビュー統計を取得
  React.useEffect(() => {
    if (!selectedSpot || !visible) return;
    
    const fetchReviewStats = async () => {
      if (selectedSpot.category === 'コインパーキング') {
        const stats = await ReviewService.getAverageRating(Number(selectedSpot.id));
        setReviewStats(stats);
        
        // レビューの分布を取得
        const reviews = await ReviewService.getReviews(Number(selectedSpot.id));
        const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach(review => {
          if (review.rating >= 1 && review.rating <= 5) {
            distribution[review.rating]++;
          }
        });
        setRatingDistribution(distribution);
      } else if (selectedSpot.category === '温泉') {
        const stats = await ReviewService.getHotSpringAverageRating(selectedSpot.id);
        setHotSpringReviewStats(stats);
      }
    };
    
    fetchReviewStats();
  }, [visible, selectedSpot, reviewKey, hotSpringReviewKey]);
  
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
  const isHotSpring = selectedSpot.category === '温泉';
  const isGasStation = selectedSpot.category === 'ガソリンスタンド';
  const isConvenienceStore = selectedSpot.category === 'コンビニ';
  const parkingSpot = selectedSpot as CoinParking;
  const hotSpringSpot = selectedSpot as HotSpring;
  const gasStationSpot = selectedSpot as GasStation;
  const convenienceStoreSpot = selectedSpot as ConvenienceStore;
  
  
  const formatPrice = (): string => {
    if (!isParking) return '---';

    // バックエンドで計算済みの料金のみを使用
    // フロントエンド再計算は行わない（ややこしくなるため）
    if (parkingSpot.calculatedFee !== undefined && parkingSpot.calculatedFee !== null) {
      if (parkingSpot.calculatedFee < 0) {
        return '計算不可';
      }
      return parkingSpot.calculatedFee === 0
        ? '無料'
        : `¥${parkingSpot.calculatedFee.toLocaleString()}`;
    }

    // calculatedFeeがない場合は料金情報なし
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
    const progressiveRates = rates.filter(r => r.type === 'progressive');
    
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
        
        {/* 基本料金/プログレッシブのまとめ表示 */}
        {(baseRates.length > 0 || progressiveRates.length > 0) && (
          <View style={styles.rateSection}>
            <Text style={styles.rateSectionTitle}>💰 通常料金</Text>
            {/* まず「最初の◯分無料 / 以降◯分¥◯」のパターンに対応 */}
            {(() => {
              const firstBase = baseRates.sort((a,b)=>a.minutes-b.minutes)[0];
              // progressiveはapply_after/applyAfterでソートし、baseの無料時間と一致するものを優先
              const sortedProgs = [...progressiveRates].sort((a: any, b: any) => (
                (a.apply_after ?? a.applyAfter ?? 0) - (b.apply_after ?? b.applyAfter ?? 0)
              ));
              const prog = sortedProgs[0];

              // apply_afterがあるprogressive料金の特別処理
              if (firstBase && prog && firstBase.price === 0 && ((prog as any).apply_after ?? (prog as any).applyAfter) > 0) {
                const applyAfter = (prog as any).apply_after ?? (prog as any).applyAfter;
                return (
                  <>
                    <Text style={styles.rateItem}>
                      {formatDayType(firstBase.day_type)}最初{firstBase.minutes}分無料{formatTimeRange(firstBase.time_range)}
                    </Text>
                    <Text style={styles.rateItem}>
                      {formatDayType(prog.day_type)}{applyAfter}分以降 {prog.minutes}分毎 ¥{prog.price?.toLocaleString()}{formatTimeRange(prog.time_range)}
                    </Text>
                  </>
                );
              }

              // それ以外は個別に列挙
              return (
                <>
                  {baseRates.map((rate, index) => (
                    <Text key={`base-${index}`} style={styles.rateItem}>
                      {rate.price === 0
                        ? `${formatDayType(rate.day_type)}最初${rate.minutes}分無料${formatTimeRange(rate.time_range)}`
                        : `${formatDayType(rate.day_type)}${rate.minutes}分毎 ¥${rate.price?.toLocaleString()}${formatTimeRange(rate.time_range)}`}
                    </Text>
                  ))}
                  {progressiveRates.map((rate, index) => {
                    const applyAfter = (rate as any).apply_after ?? (rate as any).applyAfter;
                    return (
                      <Text key={`prog-${index}`} style={styles.rateItem}>
                        {formatDayType(rate.day_type)}
                        {applyAfter ? `${applyAfter}分以降 ` : ''}
                        {rate.minutes}分毎 ¥{rate.price?.toLocaleString()}
                        {formatTimeRange(rate.time_range)}
                      </Text>
                    );
                  })}
                </>
              );
            })()}
          </View>
        )}
        
        {/* 最大料金 */}
        {maxRates.length > 0 && (
          <View style={styles.rateSection}>
            <Text style={styles.rateSectionTitle}>🔝 最大料金</Text>
            {maxRates.map((rate, index) => {
              const rangeRaw = (rate as any).time_range || (rate as any).timeRange || '';
              const minutes = (rate as any).minutes;
              let rangeDisplay = '';
              if (rangeRaw && rangeRaw !== 'not_specified') {
                rangeDisplay = String(rangeRaw);
              } else if (minutes && minutes > 0 && minutes < 1440) {
                const h = Math.floor(minutes / 60);
                rangeDisplay = h > 0 ? `最大${h}時間まで` : `最大${minutes}分まで`;
              } else {
                rangeDisplay = '終日';
              }

              return (
                <View key={index} style={styles.maxRateBlock}>
                  <Text style={styles.rateItemPrimary}>
                    {formatDayType((rate as any).day_type || (rate as any).dayType)}最大¥{rate.price?.toLocaleString()} <Text style={styles.rateItemInlineRange}>({rangeDisplay})</Text>
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  // 最大料金の要約（時間帯も一緒に見やすく表示）
  const renderMaxRateSummary = (): React.ReactNode | null => {
    if (!isParking || !parkingSpot.rates || parkingSpot.rates.length === 0) return null;
    const maxRates = parkingSpot.rates.filter(r => r.type === 'max');
    if (maxRates.length === 0) return null;

    const formatRange = (r: any) => {
      const range = r.time_range || r.timeRange || '';
      if (range && range !== 'not_specified') return String(range);
      if (r.minutes && r.minutes > 0 && r.minutes < 1440) {
        const h = Math.floor(r.minutes / 60);
        return `${h > 0 ? `${h}時間` : `${r.minutes}分`}まで`;
      }
      return '終日';
    };

    return (
      <View style={styles.maxRateContainer}>
        <View style={styles.maxRateLabelRow}>
          <Ionicons name="cash-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.maxRateLabel}>最大料金</Text>
        </View>
        <View style={styles.maxRateChipsWrap}>
          {maxRates.map((r, idx) => (
            <View key={idx} style={styles.maxRateChip}>
              <Text style={styles.maxRateChipText}>
                ¥{(r.price || 0).toLocaleString()} ・ {formatRange(r)}
              </Text>
            </View>
          ))}
        </View>
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

  // よりコンパクトに表示するための営業時間（短縮版）
  const formatOperatingHoursShort = (): string => {
    const full = formatOperatingHours();
    if (!full || full === '---') return '—';
    if (full.includes('24時間')) return '24時間';
    return full
      .replace('営業時間', '')
      .replace(/\s+/g, '')
      .replace('営業', '')
      .trim();
  };

  // 駐車場タイプ（英語/コード値）を日本語に整形
  const formatParkingType = (): string => {
    if (!isParking) {
      console.log('🅿️ formatParkingType: 駐車場ではない');
      return '---';
    }

    // parkingType (SupabaseServiceでマッピング), type, parking_type の順で確認
    const raw = parkingSpot.parkingType || (parkingSpot as any).type || (parkingSpot as any).parking_type || (parkingSpot as any).parkingTypeDisplay || (parkingSpot as any).parking;

    console.log('🅿️ 駐車場タイプデバッグ詳細:', {
      駐車場名: parkingSpot.name,
      parkingType: parkingSpot.parkingType,
      type: (parkingSpot as any).type,
      parking_type: (parkingSpot as any).parking_type,
      raw: raw,
      全フィールド: Object.keys(parkingSpot).filter(key => key.includes('type') || key.includes('Type'))
    });

    if (!raw) {
      console.log('🅿️ タイプフィールドが見つからない');
      return '---';
    }

    const rawStr = String(raw);
    const t = rawStr.toLowerCase();
    console.log('🅿️ 処理中のタイプ文字列:', rawStr);

    // 既に日本語の場合は短縮表記にして返す
    if (rawStr.includes('平面')) return '平面';
    if (rawStr.includes('立体')) return '立体';
    if (rawStr.includes('機械')) return '機械式';

    // 英語の場合は変換
    if (t.includes('multi') || t.includes('building') || t.includes('structure') || t.includes('multistory') || t.includes('multi-story') || t.includes('multi level') || t.includes('multilevel')) {
      console.log('🅿️ 立体駐車場として認識');
      return '立体';
    }
    if (t.includes('flat') || t.includes('surface') || t.includes('ground') || t.includes('open') || t.includes('outdoor') || t.includes('grade')) {
      console.log('🅿️ 平面駐車場として認識');
      return '平面';
    }
    if (t.includes('mechan') || t.includes('tower') || t.includes('auto') || t.includes('elevator')) {
      console.log('🅿️ 機械式として認識');
      return '機械式';
    }
    if (t.includes('camp') || t.includes('車中泊')) {
      console.log('🅿️ 車中泊・キャンプ場として認識');
      return '車中泊・キャンプ場';
    }

    // 駐車場名/説明から推定（キーワード）
    const name = (parkingSpot.name || '').toLowerCase();
    const desc = ((parkingSpot as any).description || '').toLowerCase();
    if (name.includes('立体') || desc.includes('立体') || name.includes('タワー') || desc.includes('タワー') || name.includes('ビル') || desc.includes('ビル')) return '立体';
    if (name.includes('平面') || desc.includes('平面') || name.includes('屋外') || desc.includes('屋外')) return '平面';
    if (name.includes('機械') || desc.includes('機械')) return '機械式';

    console.log('🅿️ デフォルトとして返す:', rawStr);
    return rawStr;
  };
  
  const openGoogleSearch = () => {
    const searchQuery = encodeURIComponent(selectedSpot.name);
    const url = `https://www.google.com/search?q=${searchQuery}`;
    Linking.openURL(url);
  };
  
  const openGoogleMaps = async () => {
    const { lat, lng } = selectedSpot;
    const label = encodeURIComponent(selectedSpot.name);
    const latLng = `${lat},${lng}`;

    try {
      // 1) Google Maps アプリ優先 - 場所を表示（経路ではなく）
      const googleMapsAppURL = Platform.select({
        ios: `comgooglemaps://?q=${label}&center=${latLng}&zoom=16`,
        android: `comgooglemaps://?q=${latLng}(${label})`
      }) as string;

      if (await Linking.canOpenURL(googleMapsAppURL)) {
        await Linking.openURL(googleMapsAppURL);
        return;
      }

      // 2) OSデフォルトの地図アプリ - 場所を表示
      if (Platform.OS === 'ios') {
        // Apple Mapsで場所を表示（経路ではなく）
        const appleMapsURL = `http://maps.apple.com/?q=${label}&ll=${latLng}&z=16`;
        await Linking.openURL(appleMapsURL);
        return;
      } else {
        // Androidのデフォルト地図アプリで場所を表示
        const geoURL = `geo:${latLng}?q=${latLng}(${label})`;
        if (await Linking.canOpenURL(geoURL)) {
          await Linking.openURL(geoURL);
          return;
        }
      }

      // 3) 最後のフォールバック: ブラウザでGoogle Mapsの場所を表示
      // place_idではなく座標とラベルで場所を検索
      const browserUrl = `https://www.google.com/maps/search/?api=1&query=${label}&query_place_id=`;
      await Linking.openURL(browserUrl);
    } catch (e) {
      // エラー時は座標で場所を表示
      const browserUrl = `https://www.google.com/maps/place/${label}/@${lat},${lng},16z`;
      Linking.openURL(browserUrl);
    }
  };

  const handleReviewSubmitted = () => {
    setReviewKey(prev => prev + 1);
  };

  const handleHotSpringReviewSubmitted = () => {
    setHotSpringReviewKey(prev => prev + 1);
  };

  const openReviewModal = () => {
    setReviewModalVisible(true);
  };

  const openHotSpringReviewModal = () => {
    setHotSpringReviewModalVisible(true);
  };

  // 写真アップロード後の処理
  const handlePhotoUploaded = () => {
    setPhotoUploadModalVisible(false);
    fetchPhotos();
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
      
      <View style={[styles.sheet, !isParking && styles.sheetNonParking]}>
        {/* Premium Header with Handle (非駐車場ではハンドルを非表示にして更に上に詰める) */}
        {isParking && (
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>
        )}
        
        {/* Title Section */}
        <View
          style={[
            styles.titleSection,
            isParking ? styles.titleSectionParking : styles.titleSectionNonParking,
          ]}
        >
          <View style={styles.titleLeft}>
            {!isParking && (
              isConvenienceStore ? (
                <View style={{ marginRight: 10 }}>
                  <ConvenienceBrandLogo brand={(selectedSpot as any).brand || selectedSpot.name} size={24} label={false} />
                </View>
              ) : (
                <Text style={styles.categoryIcon}>
                  {isHotSpring ? '♨️' : isGasStation ? '⛽' : '📍'}
                </Text>
              )
            )}
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
                {selectedSpot.address && !isHotSpring && !isGasStation && !isConvenienceStore && (
                  <Text style={styles.address} numberOfLines={1}>
                    {selectedSpot.address}
                  </Text>
                )}
                {reviewStats.count > 0 && isParking && (
                  <RatingDisplay
                    rating={reviewStats.average}
                    totalReviews={reviewStats.count}
                    size="small"
                  />
                )}
                {hotSpringReviewStats.count > 0 && isHotSpring && (
                  <RatingDisplay
                    rating={hotSpringReviewStats.average}
                    totalReviews={hotSpringReviewStats.count}
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
            {/* 料金を更新ボタン（駐車場のみ） */}
            {isParking && (
              <TouchableOpacity
                onPress={() => {
                  // 地図上で選択した駐車場を強調表示
                  if (setHighlightedParkingId && parkingSpot.id) {
                    setHighlightedParkingId(parkingSpot.id);
                  }
                  // AddParkingScreenに遷移
                  navigation.navigate('AddParking', {
                    mode: 'update',
                    parkingSpotId: parkingSpot.id,
                    parkingSpot: parkingSpot,
                  });
                  onClose();
                }}
                style={[styles.actionButton, styles.updateActionButton]}
                accessibilityLabel="料金を更新"
                accessible
              >
                <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            {/* Google検索をカラフルに（Googleカラーの青） */}
            <TouchableOpacity onPress={openGoogleSearch} style={[styles.actionButton, styles.searchActionButton]}>
              <Ionicons name="logo-google" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            {/* マップは見分けやすい緑 */}
            <TouchableOpacity
              onPress={openGoogleMaps}
              style={[styles.actionButton, styles.mapActionButton]}
              accessibilityLabel="Googleマップで開く"
              accessible
            >
              <Ionicons name="location-sharp" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Tab Bar for Parking */}
        {isParking && (
          <View style={styles.tabBar}>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'overview' && styles.tabButtonActive]}
              onPress={() => setActiveTab('overview')}
            >
              <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
                概要
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'reviews' && styles.tabButtonActive]}
              onPress={() => setActiveTab('reviews')}
            >
              <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>
                口コミ
              </Text>
              {reviewStats.count > 0 && (
                <View style={styles.reviewCountBadge}>
                  <Text style={styles.reviewCountText}>{reviewStats.count}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'photos' && styles.tabButtonActive]}
              onPress={() => setActiveTab('photos')}
            >
              <Text style={[styles.tabText, activeTab === 'photos' && styles.tabTextActive]}>
                写真
              </Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Tab Content with Swipe Gesture */}
        <View style={styles.content} {...panResponder.panHandlers}>
          {/* Premium Info Cards */}
          {isParking && activeTab === 'overview' && (
            <ScrollView 
              style={styles.tabContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
            {/* 駐車場情報カードは削除（要望により下部へ移動） */}

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

            {/* ===== コンパクト統合情報（チップ表示） ===== */}
            <View style={styles.compactStatsContainer}>
              {parkingSpot.capacity && (
                <View style={styles.statChip}>
                  <Ionicons name="car-outline" size={14} color="#374151" />
                  <Text style={styles.statText}>{parkingSpot.capacity}台</Text>
                </View>
              )}
              <View style={styles.statChip}>
                <Ionicons name="time-outline" size={14} color="#374151" />
                <Text style={styles.statText}>{formatOperatingHoursShort()}</Text>
              </View>
              {/* 標高と駐車場タイプ */}
              <View style={styles.statsPair}>
                {(parkingSpot as any).elevation !== undefined && (parkingSpot as any).elevation !== null && (
                  <View style={styles.statChip}>
                    <Ionicons name="trending-up-outline" size={14} color="#374151" />
                    <Text style={styles.statText}>標高 {(parkingSpot as any).elevation}m</Text>
                  </View>
                )}
                {(() => {
                  const typeText = formatParkingType();
                  return (
                    <View style={styles.statChip}>
                      <Ionicons name="car-sport-outline" size={14} color="#374151" />
                      <Text style={styles.statText}>{typeText === '---' ? '—' : typeText}</Text>
                    </View>
                  );
                })()}
              </View>
            </View>

            {/* Photos Preview in Overview */}
            {photos.length > 0 && (
              <View style={styles.photosPreviewSection}>
                <View style={styles.photosPreviewHeader}>
                  <Ionicons name="camera-outline" size={14} color="#666" />
                  <Text style={styles.photosPreviewTitle}>写真</Text>
                  <TouchableOpacity onPress={() => setActiveTab('photos')}>
                    <Text style={styles.photosPreviewMore}>すべて見る →</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.photosPreviewScroll}
                >
                  {photos.slice(0, 5).map((photo) => (
                    <TouchableOpacity
                      key={photo.id}
                      style={styles.photoPreviewItem}
                      onPress={() => setActiveTab('photos')}
                    >
                      <Image 
                        source={{ uri: photo.thumbnail_url || photo.url }} 
                        style={styles.photoPreviewImage} 
                      />
                    </TouchableOpacity>
                  ))}
                  {photos.length > 5 && (
                    <TouchableOpacity
                      style={[styles.photoPreviewItem, styles.photoPreviewMoreButton]}
                      onPress={() => setActiveTab('photos')}
                    >
                      <Text style={styles.photoPreviewMoreText}>+{photos.length - 5}</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            )}
            
            {/* Nearby Facilities - Always show section for debugging */}
            <View style={styles.nearbySection}>
              <View style={styles.nearbyHeader}>
                <Ionicons name="location-outline" size={14} color="#666" />
                <Text style={styles.nearbyTitle}>周辺施設</Text>
              </View>

              {/* 可能な限り即時に表示（ローディング文言は出さない） */}

              {/* コンビニ情報 */}
              {(parkingSpot.nearestConvenienceStore || panelNearby.convenience) && (
                <TouchableOpacity
                  style={styles.nearbyItemCompact}
                  onPress={() => {
                    (async () => {
                      try {
                        const id = panelNearby.convenience?.id;
                        if (!id) return;
                        const store = await SupabaseService.fetchConvenienceStoreById(String(id));
                        if (store) {
                          useMainStore.getState().selectSpot(store);
                        }
                      } catch (e) { console.warn('コンビニ詳細遷移エラー:', e); }
                    })();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.nearbyIconContainer}>
                    {panelNearby.convenience?.brand ? (
                      <ConvenienceBrandLogo brand={panelNearby.convenience.brand} size={20} label={false} />
                    ) : (
                      <Text style={styles.nearbyIconCompact}>🏪</Text>
                    )}
                  </View>
                  <Text style={styles.nearbyNameCompact} numberOfLines={1}>
                    {panelNearby.convenience?.name || facilityNames.convenience || 'コンビニ'}
                  </Text>
                  <Text style={styles.nearbyDistanceCompact}>
                    {panelNearby.convenience?.distance !== undefined
                      ? `${panelNearby.convenience.distance}m`
                      : (() => {
                          const data = (parkingSpot.nearestConvenienceStore as any) || {};
                          const distance = data.distance_m || data.distance || data.distance_meters;
                          return distance !== undefined ? `${Math.round(distance)}m` : '---';
                        })()}
                  </Text>
                </TouchableOpacity>
              )}

              {/* トイレ情報 */}
              {(parkingSpot.nearest_toilet || panelNearby.toilet) && (
                <TouchableOpacity
                  style={styles.nearbyItemCompact}
                  onPress={() => {
                    // トイレの詳細ページへの遷移は現在無効化
                    // （トイレの詳細情報がないため）
                    console.log('トイレ詳細は現在利用できません');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.nearbyIconCompact}>🚻</Text>
                  <Text style={styles.nearbyNameCompact} numberOfLines={1}>
                    {panelNearby.toilet?.name || facilityNames.toilet || 'トイレ'}
                  </Text>
                  <Text style={styles.nearbyDistanceCompact}>
                    {(() => {
                      if (panelNearby.toilet?.distance !== undefined) return `${panelNearby.toilet.distance}m`;
                      const rawAny = (parkingSpot as any).nearest_toilet;
                      if (!rawAny) return '---';
                      try {
                        const data = typeof rawAny === 'string' ? JSON.parse(rawAny) : rawAny;
                        const distance = data.distance_m || data.distance || data.distance_meters;
                        return distance !== undefined ? `${Math.round(distance)}m` : '---';
                      } catch {
                        return '---';
                      }
                    })()}
                  </Text>
                </TouchableOpacity>
              )}

              {/* 温泉情報 */}
              {(parkingSpot.nearestHotspring || panelNearby.hotspring) && (
                <TouchableOpacity
                  style={styles.nearbyItemCompact}
                  onPress={() => {
                    (async () => {
                      try {
                        const id = panelNearby.hotspring?.id;
                        if (!id) return;
                        const spring = await SupabaseService.fetchHotSpringById(String(id));
                        if (spring) {
                          useMainStore.getState().selectSpot(spring);
                        }
                      } catch (e) { console.warn('温泉詳細遷移エラー:', e); }
                    })();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.nearbyIconCompact}>♨️</Text>
                  <Text style={styles.nearbyNameCompact} numberOfLines={1}>
                    {panelNearby.hotspring?.name || facilityNames.hotspring || '温泉'}
                  </Text>
                  <Text style={styles.nearbyDistanceCompact}>
                    {panelNearby.hotspring?.distance !== undefined
                      ? `${panelNearby.hotspring.distance}m`
                      : (() => {
                          const data = (parkingSpot.nearestHotspring as any) || {};
                          const distance = data.distance_m || data.distance || data.distance_meters;
                          return distance !== undefined ? `${Math.round(distance)}m` : '---';
                        })()}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            </ScrollView>
          )}
          
          {/* Reviews Tab Content */}
          {isParking && activeTab === 'reviews' && (
            <ScrollView 
              style={styles.tabContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
            {/* Review Stats Header - Compact */}
            <View style={styles.reviewStatsCard}>
              <View style={styles.reviewStatsLeft}>
                <Text style={styles.reviewAverageScore}>
                  {reviewStats.average > 0 ? reviewStats.average.toFixed(1) : '---'}
                </Text>
                <View style={styles.reviewStarsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= Math.round(reviewStats.average) ? 'star' : 'star-outline'}
                      size={14}
                      color={star <= Math.round(reviewStats.average) ? '#FFB800' : '#CCC'}
                    />
                  ))}
                </View>
                <Text style={styles.reviewCountLabel}>
                  ({reviewStats.count}件)
                </Text>
              </View>
              
              {/* Star Distribution with correct percentages */}
              <View style={styles.reviewDistribution}>
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = ratingDistribution[rating] || 0;
                  const percentage = reviewStats.count > 0 ? (count / reviewStats.count) * 100 : 0;
                  
                  return (
                    <View key={rating} style={styles.distributionRow}>
                      <Text style={styles.distributionLabel}>{rating}</Text>
                      <View style={styles.distributionBarContainer}>
                        <View 
                          style={[
                            styles.distributionBar, 
                            { width: `${percentage}%` }
                          ]} 
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
            
            {/* Review Actions */}
            <View style={styles.reviewActionsContainer}>
              <Text style={styles.reviewSectionTitle}>評価と口コミ</Text>
              {isAuthenticated && (
                <TouchableOpacity onPress={openReviewModal} style={styles.writeReviewButton}>
                  <Ionicons name="create-outline" size={18} color={Colors.primary} />
                  <Text style={styles.writeReviewText}>投稿</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Filter Options */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.filterContainer}
            >
              <TouchableOpacity 
                style={[styles.filterChip, sortOrder === 'relevance' && styles.filterChipActive]}
                onPress={() => setSortOrder('relevance')}
              >
                {sortOrder === 'relevance' && <Ionicons name="checkmark" size={12} color={Colors.primary} />}
                <Text style={[styles.filterChipText, sortOrder === 'relevance' && styles.filterChipTextActive]}>関連度</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterChip, sortOrder === 'newest' && styles.filterChipActive]}
                onPress={() => setSortOrder('newest')}
              >
                {sortOrder === 'newest' && <Ionicons name="checkmark" size={12} color={Colors.primary} />}
                <Text style={[styles.filterChipText, sortOrder === 'newest' && styles.filterChipTextActive]}>新しい順</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterChip, sortOrder === 'highest' && styles.filterChipActive]}
                onPress={() => setSortOrder('highest')}
              >
                {sortOrder === 'highest' && <Ionicons name="checkmark" size={12} color={Colors.primary} />}
                <Text style={[styles.filterChipText, sortOrder === 'highest' && styles.filterChipTextActive]}>評価の高い順</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterChip, sortOrder === 'lowest' && styles.filterChipActive]}
                onPress={() => setSortOrder('lowest')}
              >
                {sortOrder === 'lowest' && <Ionicons name="checkmark" size={12} color={Colors.primary} />}
                <Text style={[styles.filterChipText, sortOrder === 'lowest' && styles.filterChipTextActive]}>評価の低い順</Text>
              </TouchableOpacity>
            </ScrollView>
            
            {/* Review List */}
            <ReviewList 
              key={`${reviewKey}-${sortOrder}`} 
              parkingSpotId={Number(selectedSpot.id)}
              sortOrder={sortOrder}
            />
            </ScrollView>
          )}
          
          {/* Photos Tab Content */}
          {isParking && activeTab === 'photos' && (
            <ScrollView 
              style={styles.tabContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {photosLoading ? (
                <View style={styles.photoLoadingContainer}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.photoLoadingText}>写真を読み込み中...</Text>
                </View>
              ) : photos.length === 0 ? (
                <View style={styles.photoEmptyContainer}>
                  <Ionicons name="camera-outline" size={48} color={Colors.textSecondary} />
                  <Text style={styles.photoEmptyText}>まだ写真が投稿されていません</Text>
                  <Text style={styles.photoEmptySubText}>最初の写真を投稿してみましょう</Text>
                  {isAuthenticated && (
                    <TouchableOpacity style={styles.photoUploadButton} onPress={() => setPhotoUploadModalVisible(true)}>
                      <Ionicons name="camera" size={20} color={Colors.primary} />
                      <Text style={styles.photoUploadButtonText}>写真を追加</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <>
                  {/* ヘッダー */}
                  <View style={styles.photoHeader}>
                    <Text style={styles.photoTitle}>写真 ({photos.length}枚)</Text>
                    {isAuthenticated && (
                      <TouchableOpacity style={styles.photoUploadButton} onPress={() => setPhotoUploadModalVisible(true)}>
                        <Ionicons name="camera" size={20} color={Colors.primary} />
                        <Text style={styles.photoUploadButtonText}>写真を追加</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {/* 写真グリッド */}
                  <View style={styles.photoGrid}>
                    {photos.map((photo) => (
                      <TouchableOpacity
                        key={photo.id}
                        style={styles.photoItem}
                        onPress={() => {
                          // 写真拡大表示
                          console.log('Photo tapped:', photo.url);
                        }}
                      >
                        <Image source={{ uri: photo.thumbnail_url || photo.url }} style={styles.photoImage} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
          )}
        </View>
        
        {/* Hot Spring Info - Compact Premium Design */}
        {isHotSpring && (
          <ScrollView 
            style={styles.content}
            contentInsetAdjustmentBehavior="never"
            contentContainerStyle={{ paddingTop: 0 }}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Compact Combined Info Card */}
            <View style={styles.hotSpringCompactCard}>
              {/* Price Section - Fixed visibility */}
              {hotSpringSpot.price && (
                <View style={styles.compactPriceSection}>
                  <View style={styles.compactPriceHeader}>
                    <View style={styles.priceIconBadge}>
                      <Text style={styles.priceIconText}>¥</Text>
                    </View>
                    <Text style={styles.compactPriceLabel}>入浴料金</Text>
                  </View>
                  <Text style={styles.compactPriceValue}>{hotSpringSpot.price}</Text>
                </View>
              )}
              
              {/* Divider */}
              {hotSpringSpot.price && (
                <View style={styles.compactDivider} />
              )}
              
              {/* Facility Info - Compact Grid */}
              <View style={styles.compactInfoGrid}>
                {/* Address */}
                {selectedSpot.address && (
                  <View style={styles.compactInfoItem}>
                    <View style={styles.compactInfoIcon}>
                      <Ionicons name="location" size={14} color="#666" />
                    </View>
                    <View style={styles.compactInfoText}>
                      <Text style={styles.compactInfoLabel}>住所</Text>
                      <Text style={styles.compactInfoValue} numberOfLines={2}>
                        {selectedSpot.address}
                      </Text>
                    </View>
                  </View>
                )}
                
                {/* Operating Hours */}
                {hotSpringSpot.operatingHours && (
                  <View style={styles.compactInfoItem}>
                    <View style={styles.compactInfoIcon}>
                      <Ionicons name="time" size={14} color="#666" />
                    </View>
                    <View style={styles.compactInfoText}>
                      <Text style={styles.compactInfoLabel}>営業時間</Text>
                      <Text style={styles.compactInfoValue} numberOfLines={2}>
                        {hotSpringSpot.operatingHours}
                      </Text>
                    </View>
                  </View>
                )}
                
                {/* Facility Type */}
                {hotSpringSpot.facilityType && (
                  <View style={styles.compactInfoItem}>
                    <View style={styles.compactInfoIcon}>
                      <Ionicons name="business" size={14} color="#666" />
                    </View>
                    <View style={styles.compactInfoText}>
                      <Text style={styles.compactInfoLabel}>施設タイプ</Text>
                      <Text style={styles.compactInfoValue} numberOfLines={1}>
                        {hotSpringSpot.facilityType}
                      </Text>
                    </View>
                  </View>
                )}
                
                {/* Holiday Info */}
                {hotSpringSpot.holidayInfo && (
                  <View style={styles.compactInfoItem}>
                    <View style={styles.compactInfoIcon}>
                      <Ionicons name="calendar" size={14} color="#666" />
                    </View>
                    <View style={styles.compactInfoText}>
                      <Text style={styles.compactInfoLabel}>定休日</Text>
                      <Text style={styles.compactInfoValue} numberOfLines={1}>
                        {hotSpringSpot.holidayInfo}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
            
            {/* Reviews Section for Hot Springs */}
            <View style={styles.reviewsSection}>
              <View style={styles.reviewsHeader}>
                <Text style={styles.reviewsSectionTitle}>利用者の感想</Text>
                {isAuthenticated && (
                  <TouchableOpacity onPress={openHotSpringReviewModal} style={styles.addReviewButton}>
                    <Ionicons name="add" size={16} color={Colors.primary} />
                    <Text style={styles.addReviewText}>投稿</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <HotSpringReviewList 
                key={hotSpringReviewKey} 
                hotSpringId={selectedSpot.id} 
              />
            </View>
          </ScrollView>
        )}
        
        {/* Convenience Store Info - removed duplicate compact block (address shows below) */}
        
        {/* Gas Station Info - Compact Design */}
        {isGasStation && (
          <ScrollView 
            style={styles.content}
            contentInsetAdjustmentBehavior="never"
            contentContainerStyle={{ paddingTop: 0 }}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Premium Compact Fuel Price Card */}
            <View style={styles.premiumGasPriceCard}>
              <View style={styles.gasPriceHeaderRow}>
                <Text style={styles.gasPriceHeaderText}>⛽ 全国平均との差額</Text>
              </View>
              
              <View style={styles.fuelPriceRows}>
                {/* Regular */}
                <View style={styles.fuelPriceRow}>
                  <View style={[styles.fuelBadgeCompact, styles.regularBadgeCompact]}>
                    <Text style={styles.fuelBadgeTextCompact}>レギュラー</Text>
                  </View>
                  <Text style={[
                    styles.fuelPriceDiff,
                    { color: getPriceDifferenceColor(gasStationSpot.services?.regular_price, NATIONAL_AVERAGE_PRICES.regular) }
                  ]}>
                    {formatPriceDifference(gasStationSpot.services?.regular_price, NATIONAL_AVERAGE_PRICES.regular)}
                  </Text>
                </View>
                
                {/* Premium */}
                <View style={styles.fuelPriceRow}>
                  <View style={[styles.fuelBadgeCompact, styles.premiumBadgeCompact]}>
                    <Text style={styles.fuelBadgeTextCompact}>ハイオク</Text>
                  </View>
                  <Text style={[
                    styles.fuelPriceDiff,
                    { color: getPriceDifferenceColor(gasStationSpot.services?.premium_price, NATIONAL_AVERAGE_PRICES.premium) }
                  ]}>
                    {formatPriceDifference(gasStationSpot.services?.premium_price, NATIONAL_AVERAGE_PRICES.premium)}
                  </Text>
                </View>
                
                {/* Diesel */}
                <View style={styles.fuelPriceRow}>
                  <View style={[styles.fuelBadgeCompact, styles.dieselBadgeCompact]}>
                    <Text style={styles.fuelBadgeTextCompact}>軽油</Text>
                  </View>
                  <Text style={[
                    styles.fuelPriceDiff,
                    { color: getPriceDifferenceColor(gasStationSpot.services?.diesel_price, NATIONAL_AVERAGE_PRICES.diesel) }
                  ]}>
                    {formatPriceDifference(gasStationSpot.services?.diesel_price, NATIONAL_AVERAGE_PRICES.diesel)}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Premium Compact Station Info */}
            <View style={styles.premiumGasInfoCard}>
              <View style={styles.gasInfoHeaderCompact}>
                <Ionicons name="information-circle" size={18} color={Colors.primary} />
                <Text style={styles.gasInfoTitleCompact}>施設情報</Text>
              </View>
              
              {/* Address */}
              {selectedSpot.address && (
                <View style={styles.gasInfoItemCompact}>
                  <Ionicons name="location" size={16} color="#666" />
                  <Text style={styles.gasInfoTextCompact} numberOfLines={2}>
                    {selectedSpot.address}
                  </Text>
                </View>
              )}
              
              {/* Operating Hours */}
              {gasStationSpot.operatingHours && (
                <View style={styles.gasInfoItemCompact}>
                  <Ionicons name="time" size={16} color="#666" />
                  <Text style={styles.gasInfoTextCompact}>
                    営業時間: {gasStationSpot.operatingHours}
                  </Text>
                </View>
              )}
              
              {/* Brand */}
              {gasStationSpot.brand && (
                <View style={styles.gasInfoItemCompact}>
                  <Ionicons name="pricetag" size={16} color="#666" />
                  <Text style={styles.gasInfoTextCompact}>
                    ブランド: {gasStationSpot.brand}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}

        {/* Convenience Store Info */}
        {isConvenienceStore && (
          <ScrollView
            style={styles.content}
            contentInsetAdjustmentBehavior="never"
            contentContainerStyle={{ paddingTop: 0 }}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.convenienceStoreInfoCard}>
              {/* Address */}
              {selectedSpot.address && (
                <View style={styles.convenienceInfoRow}>
                  <View style={styles.convenienceInfoIconContainer}>
                    <Ionicons name="location-outline" size={20} color="#666" />
                  </View>
                  <View style={styles.convenienceInfoContent}>
                    <Text style={styles.convenienceInfoLabel}>住所</Text>
                    <Text style={styles.convenienceInfoValue} numberOfLines={2}>
                      {selectedSpot.address}
                    </Text>
                  </View>
                </View>
              )}

              {/* Phone */}
              {convenienceStoreSpot.phone && (
                <View style={styles.convenienceInfoRow}>
                  <View style={styles.convenienceInfoIconContainer}>
                    <Ionicons name="call-outline" size={20} color="#666" />
                  </View>
                  <View style={styles.convenienceInfoContent}>
                    <Text style={styles.convenienceInfoLabel}>電話番号</Text>
                    <Text style={styles.convenienceInfoValue}>
                      {convenienceStoreSpot.phone}
                    </Text>
                  </View>
                </View>
              )}

              {/* Operating Hours */}
              {convenienceStoreSpot.hours && (
                <View style={styles.convenienceInfoRow}>
                  <View style={styles.convenienceInfoIconContainer}>
                    <Ionicons name="time-outline" size={20} color="#666" />
                  </View>
                  <View style={styles.convenienceInfoContent}>
                    <Text style={styles.convenienceInfoLabel}>営業時間</Text>
                    <Text style={styles.convenienceInfoValue}>
                      {typeof convenienceStoreSpot.hours === 'string'
                        ? convenienceStoreSpot.hours
                        : convenienceStoreSpot.hours.text || convenienceStoreSpot.hours.hours || '24時間営業'}
                    </Text>
                  </View>
                </View>
              )}
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
      
      {/* Hot Spring Review Modal */}
      {isHotSpring && (
        <HotSpringReviewModal
          visible={hotSpringReviewModalVisible}
          onClose={() => setHotSpringReviewModalVisible(false)}
          hotSpringId={selectedSpot.id}
          hotSpringName={selectedSpot.name}
          onReviewSubmitted={handleHotSpringReviewSubmitted}
        />
      )}

      {/* 写真アップロードモーダル */}
      {selectedSpot && (
        <PhotoUploadModal
          visible={photoUploadModalVisible}
          onClose={() => setPhotoUploadModalVisible(false)}
          onPhotoUploaded={handlePhotoUploaded}
          spotId={selectedSpot.id.toString()}
          spotType={selectedSpot.type === 'parking' ? 'parking' : selectedSpot.type === 'hotspring' ? 'hotspring' : 'gasstation'}
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
  sheetNonParking: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 0,
  },
  handle: {
    width: 32,
    height: 3,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  titleSectionParking: {
    paddingTop: 4,
    paddingBottom: 2,
    borderBottomWidth: 1,
  },
  titleSectionNonParking: {
    paddingTop: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
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
    fontSize: 15,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  updateActionButton: {
    backgroundColor: '#FF9500', // オレンジ（更新・編集を連想）
  },
  searchActionButton: {
    backgroundColor: '#4285F4', // Google Blue
  },
  mapActionButton: {
    backgroundColor: '#DB4437', // Google Red (ピン連想)
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 0, // 上に詰める
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  pricingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
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
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '700',
  },
  pricingMainLabel: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
  pricingMainValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  pricingDivider: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginVertical: 8,
  },
  pricingSubLabel: {
    fontSize: 15,
    color: '#888',
  },
  pricingSubValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  // Max rate summary styles
  maxRateContainer: {
    marginTop: 6,
  },
  maxRateLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  maxRateLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  maxRateChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  maxRateChip: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FBC02D',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  maxRateChipText: {
    color: '#8D6E63',
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  rateSection: {
    gap: 4,
  },
  rateSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  rateItem: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    paddingLeft: 8,
    fontWeight: '600',
  },
  maxRateBlock: {
    paddingLeft: 8,
    marginBottom: 4,
  },
  rateItemPrimary: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  rateItemInlineRange: {
    fontSize: 14, // 料金と同サイズ
    color: '#555',
    fontWeight: '600',
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
  // Parking Details Styles
  parkingDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  // 下部の基本情報（枠なしのリスト表示）
  bottomInfoContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  // 大枠（周辺施設と同等のカード枠）
  bottomInfoSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  parkingDetailsContent: {
    padding: 16,
  },
  parkingDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  // Compact stats chips
  compactStatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statsPair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  parkingDetailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
  },
  parkingDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  parkingDetailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  parkingDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    fontWeight: '600',
  },
  parkingDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'right',
    flex: 1,
  },
  // Compact Hot Spring Styles
  hotSpringCompactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  compactPriceSection: {
    backgroundColor: '#F8FAFE',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF0',
  },
  compactPriceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  priceIconText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  compactPriceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  compactPriceValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 32,
  },
  compactDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  compactInfoGrid: {
    padding: 12,
  },
  compactInfoItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  compactInfoIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5F6F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  compactInfoText: {
    flex: 1,
  },
  compactInfoLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
    fontWeight: '500',
  },
  compactInfoValue: {
    fontSize: 13,
    color: '#1A1A1A',
    fontWeight: '600',
    lineHeight: 18,
  },
  nearbySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  nearbyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  nearbyTitle: {
    fontSize: 15,
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
  nearbyIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nearbyNameCompact: {
    flex: 1,
    fontSize: 15,
    color: '#666',
  },
  nearbyDistanceCompact: {
    fontSize: 15,
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
  // Gas Station Styles - Compact Premium Design
  gasStationPriceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  gasPriceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gasPriceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  nationalAvgNote: {
    fontSize: 10,
    color: '#999',
    fontWeight: '500',
  },
  compactFuelGrid: {
    gap: 8,
  },
  compactFuelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  compactFuelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  regularBadge: {
    backgroundColor: '#E8F5E9',
  },
  premiumBadge: {
    backgroundColor: '#FFF3E0',
  },
  dieselBadge: {
    backgroundColor: '#E3F2FD',
  },
  compactFuelBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  compactPriceInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  compactFuelPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  priceDifference: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Premium Compact Gas Station Styles
  premiumGasPriceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  gasPriceHeaderRow: {
    marginBottom: 14,
  },
  gasPriceHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  fuelPriceRows: {
    gap: 10,
  },
  fuelPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fuelBadgeCompact: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    minWidth: 85,
    alignItems: 'center',
  },
  regularBadgeCompact: {
    backgroundColor: '#E8F5E9',
  },
  premiumBadgeCompact: {
    backgroundColor: '#FFF3E0',
  },
  dieselBadgeCompact: {
    backgroundColor: '#E3F2FD',
  },
  fuelBadgeTextCompact: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  fuelPriceDiff: {
    fontSize: 20,
    fontWeight: '700',
    minWidth: 80,
    textAlign: 'right',
  },
  premiumGasInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  gasInfoHeaderCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  gasInfoTitleCompact: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  gasInfoItemCompact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 10,
  },
  gasInfoTextCompact: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },

  // Convenience Store styles
  convenienceStoreInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 0, // 上に詰める
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  convenienceInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  convenienceInfoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  convenienceInfoContent: {
    flex: 1,
  },
  convenienceInfoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    fontWeight: '500',
  },
  convenienceInfoValue: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    fontWeight: '600',
  },

  // Tab Bar Styles
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    position: 'relative',
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#999',
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  reviewCountBadge: {
    marginLeft: 6,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  reviewCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  // Review Stats Styles - More Compact
  reviewStatsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  reviewStatsLeft: {
    alignItems: 'center',
    marginRight: 20,
  },
  reviewAverageScore: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  reviewStarsContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  reviewCountLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  reviewDistribution: {
    flex: 1,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  distributionLabel: {
    fontSize: 11,
    color: '#666',
    width: 10,
    marginRight: 6,
  },
  distributionBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  distributionBar: {
    height: '100%',
    backgroundColor: '#FFB800',
    borderRadius: 3,
  },
  reviewActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  reviewSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    gap: 4,
  },
  writeReviewText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    marginRight: 6,
    gap: 3,
  },
  filterChipActive: {
    backgroundColor: '#E8F5FF',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  filterChipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: Colors.primary,
  },
  photoLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  photoLoadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  photoEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  photoEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  photoEmptySubText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
  },
  photoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  photoUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 16,
  },
  photoUploadButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoItem: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  photoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  photoModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  photoModalContent: {
    padding: 20,
  },
  photoModalInstruction: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  photoOptionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  photoOptionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  photoOptionText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  photoPreview: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#F0F0F0',
  },
  photoActionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoChangeButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    alignItems: 'center',
  },
  photoChangeButtonText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  photoUploadModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  photoUploadButtonDisabled: {
    opacity: 0.6,
  },
  photoUploadModalButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  photosPreviewSection: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  photosPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  photosPreviewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  photosPreviewMore: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  photosPreviewScroll: {
    flexDirection: 'row',
  },
  photoPreviewItem: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  photoPreviewMoreButton: {
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  photoPreviewMoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
});
