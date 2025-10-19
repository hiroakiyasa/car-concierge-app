import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { CrossPlatformMap } from '@/components/Map/CrossPlatformMap';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useMainStore } from '@/stores/useMainStore';
import { LocationService } from '@/services/location.service';
import { SupabaseService } from '@/services/supabase.service';
import { SearchService } from '@/services/search.service';
import { ParkingFeeCalculator } from '@/services/parking-fee.service';
import { CustomMarker } from '@/components/Map/CustomMarker';
import { CurrentLocationMarker } from '@/components/Map/CurrentLocationMarker';
// Right-side category buttons are replaced by top chips
// import { CategoryButtons } from '@/components/Map/CategoryButtons';
import { MapScale } from '@/components/Map/MapScale';
import { PremiumMapControls } from '@/components/Map/PremiumMapControls';
import { MenuModal } from '@/components/MenuModal';
import { CompactBottomPanel } from '@/components/FilterPanel/CompactBottomPanel';
import { SpotDetailBottomSheet } from '@/screens/SpotDetailBottomSheet';
import { RankingListModal } from '@/screens/RankingListModal';
import { Colors } from '@/utils/constants';
import { Region, Spot, CoinParking } from '@/types';
import { TopSearchBar } from '@/components/Map/TopSearchBar';
import { TopCategoryTabs } from '@/components/Map/TopCategoryTabs';
import { PlaceSearchResult } from '@/services/places-search.service';

// 同率順位を計算するヘルパー関数
const calculateParkingRanks = (parkingSpots: CoinParking[]): CoinParking[] => {
  const rankedSpots: CoinParking[] = [];
  let currentRank = 1;

  for (let i = 0; i < parkingSpots.length; i++) {
    if (i === 0) {
      rankedSpots.push({ ...parkingSpots[i], rank: currentRank });
    } else {
      const currentFee = parkingSpots[i].calculatedFee ?? -1;
      const prevFee = parkingSpots[i - 1].calculatedFee ?? -1;

      if (currentFee === prevFee) {
        // 同じ料金なら同じ順位
        rankedSpots.push({ ...parkingSpots[i], rank: rankedSpots[i - 1].rank });
      } else {
        // 料金が異なる場合は実際のインデックス+1
        currentRank = i + 1;
        rankedSpots.push({ ...parkingSpots[i], rank: currentRank });
      }
    }
  }

  return rankedSpots;
};

interface MapScreenProps {
  navigation: any;
  route?: any;
}

export const MapScreen: React.FC<MapScreenProps> = ({ navigation, route }) => {
  const mapRef = useRef<any>(null);
  const [dismissSearchUI, setDismissSearchUI] = useState(0);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'complete'>('idle');
  const [shouldReopenRanking, setShouldReopenRanking] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [nearbyFacilities, setNearbyFacilities] = useState<Spot[]>([]);

  // 地図の初期化状態（AsyncStorageから前回の位置を読み込むまでtrue）
  const [isInitializingMap, setIsInitializingMap] = useState(true);

  // リアルタイム位置追跡の状態
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // マーカータップ処理の再入防止用
  const isProcessingMarkerPress = useRef(false);

  // 位置情報取得の状態管理
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'error' | 'denied'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // ストア（render前に参照する値はここで初期化してTDZを回避）
  const {
    mapRegion,
    setMapRegion,
    searchResults,
    setSearchResults,
    userLocation,
    setUserLocation,
    isLoading,
    setIsLoading,
    searchFilter,
    selectedSpot,
    selectSpot,
  } = useMainStore();
  // Androidで検索中に一瞬マーカーが消える現象を防ぐため、最後に取得した非空の結果を保持
  const [stableResults, setStableResults] = useState<Spot[]>([]);
  
  // 詳細シート表示中に、パネルのアニメーション完了後もう一度確実に25%位置へ再センタリング
  useEffect(() => {
    if (showDetailSheet && selectedSpot) {
      const t = setTimeout(() => {
        animateMarkerToTopFractionCenter(selectedSpot, 0.5);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [showDetailSheet, selectedSpot, mapRegion?.latitudeDelta, mapRegion?.longitudeDelta]);

  // 詳細シート表示時に、駐車場の周辺施設マーカーを地図に出す（お気に入り遷移などの非マーカー起点でも確実に表示）
  useEffect(() => {
    (async () => {
      try {
        if (!showDetailSheet || !selectedSpot) return;
        if (selectedSpot.category !== 'コインパーキング') return;
        if (nearbyFacilities && nearbyFacilities.length > 0) return;

        const parking = selectedSpot as CoinParking;
        const facilities: Spot[] = [];

        // コンビニ
        if (parking.nearestConvenienceStore) {
          const raw: any = parking.nearestConvenienceStore;
          if (raw.lat && raw.lng) {
            facilities.push({ ...(raw as any), category: 'コンビニ' } as Spot);
          } else if (raw.id || raw.store_id || raw.facility_id) {
            const id = String(raw.id || raw.store_id || raw.facility_id);
            try {
              const store = await SupabaseService.fetchConvenienceStoreById(id);
              if (store) facilities.push(store as any);
            } catch {}
          }
        } else {
          try {
            const stores = await SupabaseService.fetchNearbyConvenienceStoresAround(parking.lat, parking.lng, 500, 1);
            if (stores && stores.length > 0) facilities.push(stores[0] as any);
          } catch {}
        }

        // 温泉
        if (parking.nearestHotspring) {
          const raw: any = parking.nearestHotspring;
          if (raw.lat && raw.lng) {
            facilities.push({ ...(raw as any), category: '温泉' } as Spot);
          } else if (raw.id || raw.spring_id || raw.facility_id) {
            const id = String(raw.id || raw.spring_id || raw.facility_id);
            try {
              const spring = await SupabaseService.fetchHotSpringById(id);
              if (spring) facilities.push(spring as any);
            } catch {}
          }
        } else {
          try {
            const springs = await SupabaseService.fetchNearbyHotSpringsAround(parking.lat, parking.lng, 2000, 1);
            if (springs && springs.length > 0) facilities.push(springs[0] as any);
          } catch {}
        }

        // トイレ
        const rawToilet: any = (parking as any).nearest_toilet;
        if (rawToilet) {
          if (rawToilet.lat && rawToilet.lng) {
            facilities.push({ ...(rawToilet as any), category: 'トイレ', id: rawToilet.id || `toilet_${rawToilet.toilet_id}` } as any);
          } else if (rawToilet.id || rawToilet.toilet_id || rawToilet.facility_id) {
            const id = String(rawToilet.id || rawToilet.toilet_id || rawToilet.facility_id);
            try {
              const toilet = await SupabaseService.fetchToiletById(id);
              if (toilet) facilities.push(toilet as any);
            } catch {}
          }
        } else {
          try {
            const toilets = await SupabaseService.fetchNearbyToiletsAround(parking.lat, parking.lng, 1000, 1);
            if (toilets && toilets.length > 0) facilities.push(toilets[0] as any);
          } catch {}
        }

        if (facilities.length > 0) setNearbyFacilities(facilities);
      } catch (e) {
        console.warn('周辺施設マーカー初期化失敗:', e);
      }
    })();
  }, [showDetailSheet, selectedSpot]);
  
  // （上で初期化済み）

  // 検索結果が非空の時にのみ、描画用の安定配列を更新
  useEffect(() => {
    if (Array.isArray(searchResults) && searchResults.length > 0) {
      setStableResults(searchResults);
    }
  }, [searchResults]);
  
  // Initialize location
  useEffect(() => {
    initializeLocation();
  }, []);

  // 管理画面から戻った時に地図データを更新
  useFocusEffect(
    useCallback(() => {
      const checkMapRefresh = async () => {
        try {
          const needsRefresh = await AsyncStorage.getItem('needsMapRefresh');
          if (needsRefresh === 'true') {
            console.log('🔄 管理画面での承認により地図データを更新します');
            await AsyncStorage.removeItem('needsMapRefresh');

            // 地図データを再取得（現在のフィルター設定を維持）
            if (mapRegion && isMapReady) {
              await handleSearch(false);
            }
          }
        } catch (error) {
          console.error('地図更新フラグのチェックエラー:', error);
        }
      };

      checkMapRefresh();
    }, [mapRegion, isMapReady])
  );

  // リアルタイム位置追跡を開始（初期化完了後のみ）
  useEffect(() => {
    // 初期化が完了し、位置情報が取得できた場合のみリアルタイム追跡を開始
    if (locationStatus !== 'success') {
      console.log('📍 リアルタイム追跡スキップ: locationStatus =', locationStatus);
      return;
    }

    let mounted = true;

    const startLocationTracking = async () => {
      try {
        console.log('📍 リアルタイム位置追跡を開始...');

        // 位置情報の権限を確認
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('⚠️ 位置情報の権限が許可されていません');
          return;
        }

        // リアルタイム位置追跡を開始
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 2000, // 2秒ごとに更新
            distanceInterval: 10, // 10m移動したら更新
          },
          (location) => {
            if (!mounted) return;

            const { latitude, longitude, accuracy } = location.coords;
            console.log('📍 リアルタイム位置更新:', {
              latitude,
              longitude,
              accuracy,
            });

            // ストアに保存
            setUserLocation({
              latitude,
              longitude,
              accuracy,
              timestamp: location.timestamp,
            });

            // GPS信号受信中フラグを設定
            if (!isLocationTracking) {
              setIsLocationTracking(true);
            }
          }
        );

        locationSubscription.current = subscription;
        console.log('✅ リアルタイム位置追跡を開始しました');
      } catch (error) {
        console.error('❌ リアルタイム位置追跡の開始に失敗:', error);
        setIsLocationTracking(false);
      }
    };

    startLocationTracking();

    // クリーンアップ: コンポーネントのアンマウント時に位置追跡を停止
    return () => {
      mounted = false;
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        console.log('🛑 リアルタイム位置追跡を停止しました');
        locationSubscription.current = null;
      }
      setIsLocationTracking(false);
    };
  }, [locationStatus, setUserLocation]);

  // トーストメッセージを3秒後に自動で消す
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Handle navigation from favorites
  useEffect(() => {
    if (route?.params?.selectedSpot && isMapReady) {
      const { selectedSpot: spotFromFavorites, centerOnSpot, showDetail } = route.params;
      
      console.log('📍 お気に入りから選択されたスポット:', spotFromFavorites);
      
      // 地図を選択されたスポットの位置に移動
      if (centerOnSpot && spotFromFavorites.lat && spotFromFavorites.lng) {
        const newRegion = {
          latitude: spotFromFavorites.lat,
          longitude: spotFromFavorites.lng,
          latitudeDelta: 0.005, // ズームレベルを調整
          longitudeDelta: 0.005,
        };
        
        setMapRegion(newRegion);
        
        // アニメーション付きで地図を移動
        if (mapRef.current) {
          mapRef.current.animateToRegion(newRegion, 1000);
        }
        
        // スポットを選択状態にする
        selectSpot(spotFromFavorites);
        
        // 少し遅延してから詳細画面を表示
        if (showDetail) {
          setTimeout(() => {
            setShowDetailSheet(true);
            // マーカーを画面上から25%の位置に強制移動
            if (spotFromFavorites) animateMarkerToTopFractionCenter(spotFromFavorites, 0.5);
          }, 1500);
        }
        
        // 自動検索は行わない（ユーザーが手動で検索ボタンを押すまで待つ）
        console.log('📍 お気に入りから選択されたスポットの位置に移動完了');
      }
      
      // パラメータをクリア（再度実行されないように）
      navigation.setParams({ selectedSpot: null, centerOnSpot: false, showDetail: false });
    }
  }, [route?.params?.selectedSpot, isMapReady]);
  
  // 地図がレンダリングされたときの処理（自動検索は無効化）
  useEffect(() => {
    if (isMapReady && mapRegion.latitude && mapRegion.longitude &&
        mapRegion.latitude !== 0 && mapRegion.longitude !== 0 &&
        !isNaN(mapRegion.latitude) && !isNaN(mapRegion.longitude) &&
        !hasInitialized) {
      setHasInitialized(true);
      console.log('📍 地図の準備完了 - 現在の位置:', mapRegion);
      // 自動検索は行わない
    }
    if (isMapReady && mapRegion.latitude && mapRegion.longitude && !hasInitialized) {
      // Appブート完了としてスプラッシュを閉じる合図
      try { useMainStore.getState().setAppBootReady(true); } catch {}
    }
  }, [isMapReady, mapRegion.latitude, mapRegion.longitude, hasInitialized]);
  
  const initializeLocation = async () => {
    try {
      setLocationStatus('loading');
      setErrorMessage(null);
      setToastMessage('📍 現在地を取得中...');
      console.log('📍 位置情報の初期化を開始...');

      // 1) まず保存済みの地図範囲を復元（即座に表示）
      const savedRegion = await AsyncStorage.getItem('lastMapRegion');
      if (savedRegion) {
        const initialRegion = JSON.parse(savedRegion);
        console.log('📍 前回の地図範囲を即座に復元:', initialRegion);
        setMapRegion(initialRegion);
        setIsInitializingMap(false); // 地図を表示

        // 保存された地図範囲に移動
        if (mapRef.current && isMapReady) {
          mapRef.current.animateToRegion(initialRegion, 500);
        }
      } else {
        // 前回の位置がない場合も初期化完了
        setIsInitializingMap(false);
      }

      // 2) 並行して現在地を取得し、成功したら更新
      const location = await LocationService.getCurrentLocation();
      if (location) {
        console.log('✅ 現在地を取得成功:', location);
        setUserLocation(location);
        setLocationStatus('success');
        setToastMessage(null);

        const currentRegion = {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };
        console.log('📍 現在地を中心に更新:', currentRegion);
        setMapRegion(currentRegion);
        await saveMapRegion(currentRegion);

        if (mapRef.current && isMapReady) {
          mapRef.current.animateToRegion(currentRegion, 1000);
        }
        return;
      }

      // 3) 現在地取得失敗、保存済み地図範囲も使用済み
      if (savedRegion) {
        console.log('⚠️ 現在地の取得に失敗 - 前回の位置を継続使用');
        setLocationStatus('error');
        setToastMessage('⚠️ 現在地を取得できませんでした');
        return;
      }

      // 4) 保存済み地図範囲もなく、現在地も取得できない → デフォルト位置（東京駅）
      const defaultRegion = {
        latitude: 35.6812,
        longitude: 139.7671,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      console.log('📍 デフォルト位置（東京駅）を使用');
      setMapRegion(defaultRegion);
      await saveMapRegion(defaultRegion);
      setLocationStatus('denied');
      setToastMessage('⚠️ 現在地を取得できませんでした');

      if (mapRef.current && isMapReady) {
        mapRef.current.animateToRegion(defaultRegion, 500);
      }
    } catch (error) {
      console.error('❌ 初期位置の設定エラー:', error);
      setLocationStatus('error');
      setToastMessage('⚠️ 現在地を取得できませんでした');

      const defaultRegion = {
        latitude: 35.6812,
        longitude: 139.7671,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      setMapRegion(defaultRegion);
    }
  };

  // 地図範囲をAsyncStorageに保存
  const saveMapRegion = async (region: Region) => {
    try {
      await AsyncStorage.setItem('lastMapRegion', JSON.stringify(region));
    } catch (error) {
      console.error('❌ 地図範囲の保存エラー:', error);
    }
  };

  // 指定された地域で検索を実行
  const handleSearchWithRegion = async (region: Region) => {
    console.log('🔍 指定された地域で検索開始:', region);
    setSearchStatus('searching');
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await SearchService.search(
        region,
        searchFilter,
        userLocation
      );

      const { results, stats } = data;
      console.log('📊 検索完了:', stats);

      if (results.length === 0) {
        console.log('⚠️ 検索結果なし');
        setErrorMessage('この地域には該当する施設が見つかりませんでした');
      }

      // 駐車場に同率順位を計算して設定
      const parkingSpots = results.filter(s => s.category === 'コインパーキング') as CoinParking[];
      const rankedParkingSpots = calculateParkingRanks(parkingSpots);
      const finalResults = results.map(spot => {
        if (spot.category === 'コインパーキング') {
          const rankedSpot = rankedParkingSpots.find(p => p.id === spot.id);
          return rankedSpot || spot;
        }
        return spot;
      });

      setSearchResults(finalResults);
      setStableResults(results.filter(r => r != null));
    } catch (error) {
      console.error('❌ 検索エラー:', error);
      setErrorMessage('検索中にエラーが発生しました');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
      setSearchStatus('complete');
    }
  };

  const handleSearch = async (isExpanded?: boolean, overrideFilter?: any) => {
    setIsLoading(true);
    setSearchStatus('searching');
    try {
      // 引数で渡されたフィルターを優先的に使用、なければstoreから取得
      const currentFilter = overrideFilter || searchFilter;
      
      // onRegionChangeCompleteで保存された最新のregionを使用
      const fullScreenRegion = { ...mapRegion };
      
      // mapRegionが正しく設定されているか確認
      if (!fullScreenRegion.latitude || !fullScreenRegion.longitude || 
          !fullScreenRegion.latitudeDelta || !fullScreenRegion.longitudeDelta ||
          isNaN(fullScreenRegion.latitude) || isNaN(fullScreenRegion.longitude) ||
          isNaN(fullScreenRegion.latitudeDelta) || isNaN(fullScreenRegion.longitudeDelta)) {
        console.error('無効なmapRegion:', fullScreenRegion);
        Alert.alert('エラー', '地図の位置情報が取得できませんでした');
        setIsLoading(false);
        return;
      }
      
      // UI要素を考慮した検索範囲を計算
      let searchRegion = { ...fullScreenRegion };
      
      // 画面オーバーレイ(UI)を考慮したマージン設定（実測pxを画面比に変換）
      const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
      // 検索バー + カテゴリーチップの合計高さ（余白含む）
      const SEARCH_BAR_HEIGHT = 52;
      const SEARCH_BAR_TOP = Platform.OS === 'ios' ? 6 : 4;
      const CHIPS_HEIGHT = 48;
      const CHIPS_GAP = 6; // 少しの余白
      const topOverlayPx = SEARCH_BAR_TOP + SEARCH_BAR_HEIGHT + CHIPS_GAP + CHIPS_HEIGHT;
      const topInset = Math.min(0.35, topOverlayPx / Math.max(1, SCREEN_HEIGHT));

      // 右側はマーカー1つ分だけ内側へ
      const MARKER_SIZE = 40; // 近似
      const RIGHT_PADDING = 8;
      const rightMargin = Math.min(0.25, (MARKER_SIZE + RIGHT_PADDING) / Math.max(1, SCREEN_WIDTH));
      const leftMargin = 0; // 左は変更なし
      const bottomLabelMargin = 0; // 下側はパネル境界まで（変更なし）
      
      // パネルが展開されている場合
      if (isExpanded) {
        // 画面の1/3がパネルで隠れている
        const bottomPanelRatio = 0.33; // パネルが占める割合
        const bottomExclusionRatio = bottomPanelRatio + bottomLabelMargin; // パネル境界まで
        // 左右マージン（上で定義済み）
        
        // 境界を計算
        // 上側：画面上端から1ラベル分内側（画面内に制限）
        // 下側：パネル境界まで（変更なし）
        const visibleTopRatio = 1 - topInset; // 上側は検索バー+カテゴリの直下まで
        const visibleBottomRatio = 1 - bottomExclusionRatio; // 下側はパネル境界まで
        
        // 緯度の調整（上下）
        const adjustedLatitudeDelta = fullScreenRegion.latitudeDelta * (visibleTopRatio - bottomExclusionRatio);
        
        // 経度の調整（左右）
        const adjustedLongitudeDelta = fullScreenRegion.longitudeDelta * (1 - leftMargin - rightMargin);
        
        // 検索範囲の中心を計算（上にシフト + 境界調整）
        const centerLatitudeShift = fullScreenRegion.latitudeDelta * ((bottomExclusionRatio - topInset) / 2);
        
        searchRegion = {
          latitude: fullScreenRegion.latitude + centerLatitudeShift,
          // 右側に余白を設けたぶん中央を左に補正
          longitude: fullScreenRegion.longitude - (fullScreenRegion.longitudeDelta * (rightMargin - leftMargin) / 2),
          latitudeDelta: adjustedLatitudeDelta,
          longitudeDelta: adjustedLongitudeDelta,
        };
        
        console.log('📦 パネル展開時: 下側=パネル境界、上側=画面上端から1ラベル分内側（' + (bottomExclusionRatio * 100).toFixed(0) + '%除外）');
      } else {
        // パネル最小時でも約100pxは隠れている
        const bottomPanelRatio = 0.17; // 最小パネルが占める割合
        const bottomExclusionRatio = bottomPanelRatio + bottomLabelMargin; // パネル境界まで
        // 左右マージン（上で定義済み）
        
        // 境界を計算
        // 上側：画面上端から1ラベル分内側（画面内に制限）
        // 下側：パネル境界まで（変更なし）
        const visibleTopRatio = 0.97 - topInset; // 上側は検索バー+カテゴリの直下まで
        const visibleBottomRatio = 1 - bottomExclusionRatio; // 下側はパネル境界まで
        
        // 緯度の調整（上下）
        const adjustedLatitudeDelta = fullScreenRegion.latitudeDelta * (visibleTopRatio - bottomExclusionRatio);
        
        // 経度の調整（左右）
        const adjustedLongitudeDelta = fullScreenRegion.longitudeDelta * (1 - leftMargin - rightMargin);
        
        // 検索範囲の中心を計算（上にシフト + 境界調整）
        const centerLatitudeShift = fullScreenRegion.latitudeDelta * ((bottomExclusionRatio - topInset) / 2);
        
        searchRegion = {
          latitude: fullScreenRegion.latitude + centerLatitudeShift,
          longitude: fullScreenRegion.longitude - (fullScreenRegion.longitudeDelta * (rightMargin - leftMargin) / 2),
          latitudeDelta: adjustedLatitudeDelta,
          longitudeDelta: adjustedLongitudeDelta,
        };
        
        console.log('📦 パネル最小時: 下側=パネル境界、上側=画面上端から1ラベル分内側（' + (bottomExclusionRatio * 100).toFixed(0) + '%除外）');
      }
      
      console.log('🎯 検索にSupabaseに送るregion:', {
        中心緯度: searchRegion.latitude.toFixed(6),
        中心経度: searchRegion.longitude.toFixed(6),
        緯度幅: searchRegion.latitudeDelta.toFixed(6),
        経度幅: searchRegion.longitudeDelta.toFixed(6),
        北端: (searchRegion.latitude + searchRegion.latitudeDelta/2).toFixed(6),
        南端: (searchRegion.latitude - searchRegion.latitudeDelta/2).toFixed(6),
        東端: (searchRegion.longitude + searchRegion.longitudeDelta/2).toFixed(6),
        西端: (searchRegion.longitude - searchRegion.longitudeDelta/2).toFixed(6),
      });
      
      // 選択されたカテゴリーを検索
      let selectedCategories = currentFilter.selectedCategories;

      // 周辺検索が有効でも、自動でカテゴリーを追加しない（チェックされているカテゴリのみ）
      // 選択状態はCategoryButtonsのチェックに厳密に従う

      console.log('🔍 選択されたカテゴリー:', Array.from(selectedCategories));
      
      // 標高フィルターが有効な場合はminElevationを渡す
      const minElevation = currentFilter.elevationFilterEnabled ? currentFilter.minElevation : undefined;
      
      if (currentFilter.elevationFilterEnabled) {
        console.log(`🏔️ 標高フィルター有効: ${currentFilter.minElevation}m以上の駐車場のみ表示`);
      }
      
      // 周辺検索が有効な場合は、関連施設も取得するためにカテゴリーを追加
      const categoriesForFetch = new Set<string>(selectedCategories);
      
      const spots = await SupabaseService.fetchSpotsByCategories(
        searchRegion,
        categoriesForFetch,
        minElevation
      );
      
      // spotsがnullまたはundefinedの場合は空配列として処理
      const validSpots = spots || [];
      
      // 周辺検索・料金フィルターのフラグを先に計算（以降の処理で参照）
      const hasNearbyFilter = currentFilter.nearbyFilterEnabled &&
        (((currentFilter.convenienceStoreRadius || 0) > 0) || ((currentFilter.toiletRadius || 0) > 0));
      const hasParkingTimeFilter = currentFilter.parkingTimeFilterEnabled;

      // 近傍検索（新アルゴリズム）: 周辺検索チェックON時のみ実行
      // タブの表示状態やカテゴリ選択とは独立して、チェックボックスの状態（nearbyFilterEnabled）と半径で判定
      const nearbyOn = hasNearbyFilter;
      if (nearbyOn) {
        const requireConv = (currentFilter.convenienceStoreRadius || 0) > 0;
        const requireToilet = (currentFilter.toiletRadius || 0) > 0;

        // 1) 駐車場は地図範囲内、施設は範囲+半径分を取得
        const parkings = await SupabaseService.fetchParkingSpots(searchRegion, minElevation);
        const metersToLat = (m: number) => m / 111000;
        const metersToLng = (m: number, lat: number) => m / (111000 * Math.cos((lat * Math.PI)/180));
        const maxR = Math.max(currentFilter.convenienceStoreRadius || 0, currentFilter.toiletRadius || 0);
        const expanded: Region = {
          latitude: searchRegion.latitude,
          longitude: searchRegion.longitude,
          latitudeDelta: searchRegion.latitudeDelta + metersToLat(maxR) * 2,
          longitudeDelta: searchRegion.longitudeDelta + metersToLng(maxR, searchRegion.latitude) * 2,
        };
        // 取得した施設の座標は数値化して扱う
        const conveniencesRaw = requireConv ? await SupabaseService.fetchConvenienceStores(expanded) : [];
        const toiletsRaw = requireToilet ? await SupabaseService.fetchToilets(expanded) : [];
        const conveniences = conveniencesRaw.map(s => ({
          ...s,
          lat: Number((s as any).lat),
          lng: Number((s as any).lng),
        }));
        const toilets = toiletsRaw.map(s => ({
          ...s,
          lat: Number((s as any).lat),
          lng: Number((s as any).lng),
        }));

        const toRad = (d: number) => d * Math.PI / 180;
        const distM = (aLat: number, aLng: number, bLat: number, bLng: number) => {
          const R = 6371000;
          const dLat = toRad(bLat - aLat);
          const dLng = toRad(bLng - aLng);
          const lat1 = toRad(aLat), lat2 = toRad(bLat);
          const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
          return 2*R*Math.asin(Math.sqrt(h));
        };

        const matchedConv: Array<{ pk: CoinParking, conv: Spot, fee: number }> = [];
        const matchedToilet: Array<{ pk: CoinParking, toilet: Spot, fee: number }> = [];

        for (const p of parkings) {
          // 営業時間チェック（指定時間中に1分でも営業時間外なら除外）
          if (hasParkingTimeFilter) {
            const open = ParkingFeeCalculator.isParkingOpenForEntireDuration(p, currentFilter.parkingDuration);
            if (!open) continue;
          }
          let conv: Spot | undefined;
          let toilet: Spot | undefined;
          const pLat = Number((p as any).lat);
          const pLng = Number((p as any).lng);
          if (requireConv) {
            let best: any, bestD = Infinity;
            for (const s of conveniences) {
              const d = distM(pLat, pLng, Number((s as any).lat), Number((s as any).lng));
              if (d <= (currentFilter.convenienceStoreRadius || 0) && d < bestD) { best = s; bestD = d; }
            }
            conv = best as Spot | undefined;
            if (!conv) {
              console.log(`🔍 コンビニ半径NG: ${p.name} 半径=${currentFilter.convenienceStoreRadius}m`);
            } else {
              const d = distM(pLat, pLng, (conv as any).lat, (conv as any).lng);
              console.log(`✅ コンビニ半径OK: ${p.name} → ${(conv as any).name} 距離=${Math.round(d)}m (半径=${currentFilter.convenienceStoreRadius}m)`);
            }
          }
          if (requireToilet) {
            let best: any, bestD = Infinity;
            for (const s of toilets) {
              const d = distM(pLat, pLng, Number((s as any).lat), Number((s as any).lng));
              if (d <= (currentFilter.toiletRadius || 0) && d < bestD) { best = s; bestD = d; }
            }
            toilet = best as Spot | undefined;
            if (!toilet) {
              console.log(`🔍 トイレ半径NG: ${p.name} 半径=${currentFilter.toiletRadius}m`);
            } else {
              const d = distM(pLat, pLng, (toilet as any).lat, (toilet as any).lng);
              console.log(`✅ トイレ半径OK: ${p.name} → ${(toilet as any).name} 距離=${Math.round(d)}m (半径=${currentFilter.toiletRadius}m)`);
            }
          }
          const fee = ParkingFeeCalculator.calculateFee(p, currentFilter.parkingDuration);
          if (fee >= 0) {
            if (requireConv && conv) matchedConv.push({ pk: p, conv, fee });
            if (requireToilet && toilet) matchedToilet.push({ pk: p, toilet, fee });
          }
        }

        // それぞれ最大20件ずつ抽出（OR表示）
        matchedConv.sort((a,b) => a.fee - b.fee);
        matchedToilet.sort((a,b) => a.fee - b.fee);
        const topConv = matchedConv.slice(0, 20);
        const topToilet = matchedToilet.slice(0, 20);

        // まとめて安い順（OR）: 2集合を統合し、駐車場を安い順で一意化+連番rank
        type Combined = { pk: CoinParking; fee: number; conv?: Spot; toilet?: Spot };
        const combinedMap = new Map<string, Combined>();
        const upsert = (id: string, rec: Combined) => {
          const existing = combinedMap.get(id);
          if (!existing) {
            combinedMap.set(id, rec);
          } else {
            // より安い方を採用、施設情報は補完
            if (rec.fee < existing.fee) {
              combinedMap.set(id, { ...existing, ...rec });
            } else {
              if (rec.conv && !existing.conv) existing.conv = rec.conv;
              if (rec.toilet && !existing.toilet) existing.toilet = rec.toilet;
              combinedMap.set(id, existing);
            }
          }
        };
        topConv.forEach(m => upsert(String(m.pk.id), { pk: m.pk, fee: m.fee, conv: m.conv }));
        topToilet.forEach(m => upsert(String(m.pk.id), { pk: m.pk, fee: m.fee, toilet: m.toilet }));
        const combined = Array.from(combinedMap.values()).sort((a, b) => a.fee - b.fee);

        const resultSpots: Spot[] = [];
        combined.forEach((m, idx) => {
          resultSpots.push({ ...(m.pk as any), calculatedFee: m.fee, rank: idx + 1 } as any);
          if (m.conv) resultSpots.push(m.conv);
          if (m.toilet) resultSpots.push(m.toilet);
        });

        // 重複排除（施設含む）
        const output = Array.from(new Map(resultSpots.map(s => [s.id, s])).values());
        console.log(`✅ 新アルゴ(OR/統合ランク): 駐車場${combined.length}件 + 施設, 合計ユニーク${output.length}件`);

        // 駐車場に同率順位を計算して設定
        const parkingSpots = output.filter(s => s.category === 'コインパーキング') as CoinParking[];
        const rankedParkingSpots = calculateParkingRanks(parkingSpots);
        const finalOutput = output.map(spot => {
          if (spot.category === 'コインパーキング') {
            const rankedSpot = rankedParkingSpots.find(p => p.id === spot.id);
            return rankedSpot || spot;
          }
          return spot;
        });

        setSearchResults(finalOutput);
        setSearchStatus('complete');
        setTimeout(() => setSearchStatus('idle'), 3000);
        return;
      }

      // カテゴリー別に処理（通常フロー）
      let displaySpots: Spot[] = [];
      
      if (selectedCategories.has('コインパーキング')) {
        let parkingSpots: CoinParking[] = [];
        
        // フィルターの組み合わせを判定
        // 先に算出済みのフラグを使用
        
        console.log('🔍 フィルター状態:', {
          周辺検索: hasNearbyFilter,
          駐車料金: hasParkingTimeFilter,
          標高: currentFilter.elevationFilterEnabled
        });
        
        // 両方のフィルターが有効な場合（周辺検索 + 駐車料金）
        if (hasNearbyFilter && hasParkingTimeFilter) {
          console.log('🎯 周辺検索 + 料金フィルター有効 - バックエンドで複合処理');
          // OR検索: コンビニまたはトイレの近くにある駐車場を検索
          parkingSpots = await SupabaseService.fetchParkingSpotsByNearbyFilter(
            searchRegion,
            currentFilter.parkingDuration.durationInMinutes,
            currentFilter.convenienceStoreRadius,
            currentFilter.toiletRadius,
            minElevation
          );
          // 営業時間チェック
          parkingSpots = parkingSpots.filter(p =>
            ParkingFeeCalculator.isParkingOpenForEntireDuration(p, currentFilter.parkingDuration)
          );

          // 料金順にソートして上位20件のみ取得
          parkingSpots = parkingSpots.slice(0, 20);
          console.log(`🅿️ 周辺検索+料金フィルター結果: ${parkingSpots.length}件（上位20件）`);

          // 選択された駐車場の最寄りのコンビニとトイレを取得して表示
          if (parkingSpots.length > 0 &&
              currentFilter.nearbyCategories.has('コンビニ') &&
              currentFilter.nearbyCategories.has('トイレ')) {

            // 各駐車場の最寄りコンビニとトイレの情報を収集
            const relatedConvenienceIds = new Set<string>();
            const relatedToiletIds = new Set<string>();

            parkingSpots.forEach(parking => {
              // 最寄りコンビニ情報を解析
              if (parking.nearest_convenience_store) {
                try {
                  const storeInfo = typeof parking.nearest_convenience_store === 'string'
                    ? JSON.parse(parking.nearest_convenience_store)
                    : parking.nearest_convenience_store;
                  if (storeInfo.id) relatedConvenienceIds.add(storeInfo.id);
                } catch {}
              }

              // 最寄りトイレ情報を解析
              if (parking.nearest_toilet) {
                try {
                  const toiletInfo = typeof parking.nearest_toilet === 'string'
                    ? JSON.parse(parking.nearest_toilet)
                    : parking.nearest_toilet;
                  if (toiletInfo.id) relatedToiletIds.add(toiletInfo.id);
                } catch {}
              }
            });

            // 関連するコンビニとトイレを取得
            if (relatedConvenienceIds.size > 0) {
              const stores = await SupabaseService.fetchConvenienceStoresByIds(
                Array.from(relatedConvenienceIds)
              );
              displaySpots.push(...stores);
              console.log(`🏪 関連コンビニ: ${stores.length}件`);
            }

            if (relatedToiletIds.size > 0) {
              const toilets = await SupabaseService.fetchToiletsByIds(
                Array.from(relatedToiletIds)
              );
              displaySpots.push(...toilets);
              console.log(`🚻 関連トイレ: ${toilets.length}件`);
            }
          }

          displaySpots.push(...parkingSpots);
        }
        // 周辺検索のみ有効な場合
        else if (hasNearbyFilter) {
          console.log('🎯 周辺検索フィルターのみ有効 - バックエンドで処理');
          parkingSpots = await SupabaseService.fetchParkingSpotsByNearbyFilter(
            searchRegion,
            currentFilter.parkingDuration.durationInMinutes,
            currentFilter.convenienceStoreRadius,
            currentFilter.toiletRadius,
            minElevation
          );
          parkingSpots = parkingSpots.filter(p =>
            !hasParkingTimeFilter || ParkingFeeCalculator.isParkingOpenForEntireDuration(p, currentFilter.parkingDuration)
          );

          // 料金順にソートして上位20件のみ取得
          parkingSpots = parkingSpots.slice(0, 20);
          console.log(`🅿️ 周辺検索結果: ${parkingSpots.length}件（上位20件）`);

          // 選択された駐車場の最寄りのコンビニとトイレを取得して表示
          if (parkingSpots.length > 0 &&
              currentFilter.nearbyCategories.has('コンビニ') &&
              currentFilter.nearbyCategories.has('トイレ')) {

            // 各駐車場の最寄りコンビニとトイレの情報を収集
            const relatedConvenienceIds = new Set<string>();
            const relatedToiletIds = new Set<string>();

            parkingSpots.forEach(parking => {
              // 最寄りコンビニ情報を解析
              if (parking.nearest_convenience_store) {
                try {
                  const storeInfo = typeof parking.nearest_convenience_store === 'string'
                    ? JSON.parse(parking.nearest_convenience_store)
                    : parking.nearest_convenience_store;
                  if (storeInfo.id) relatedConvenienceIds.add(storeInfo.id);
                } catch {}
              }

              // 最寄りトイレ情報を解析
              if (parking.nearest_toilet) {
                try {
                  const toiletInfo = typeof parking.nearest_toilet === 'string'
                    ? JSON.parse(parking.nearest_toilet)
                    : parking.nearest_toilet;
                  if (toiletInfo.id) relatedToiletIds.add(toiletInfo.id);
                } catch {}
              }
            });

            // 関連するコンビニとトイレを取得
            if (relatedConvenienceIds.size > 0) {
              const stores = await SupabaseService.fetchConvenienceStoresByIds(
                Array.from(relatedConvenienceIds)
              );
              displaySpots.push(...stores);
              console.log(`🏪 関連コンビニ: ${stores.length}件`);
            }

            if (relatedToiletIds.size > 0) {
              const toilets = await SupabaseService.fetchToiletsByIds(
                Array.from(relatedToiletIds)
              );
              displaySpots.push(...toilets);
              console.log(`🚻 関連トイレ: ${toilets.length}件`);
            }
          }

          displaySpots.push(...parkingSpots);
        }
        // 料金時間フィルターのみ有効な場合
        else if (hasParkingTimeFilter) {
          console.log('💰 料金時間フィルターのみ有効 - バックエンドで料金計算・ソート実行');
          let result = await SupabaseService.fetchParkingSpotsSortedByFee(
            searchRegion,
            currentFilter.parkingDuration.durationInMinutes,
            minElevation,
            currentFilter.parkingDuration.startDate // 入庫日時を渡す
          );

          // タイムアウトなどで結果が返らない場合、自動的にズームインして再試行
          if ((result as any).error || result.totalCount === -1) {
            console.log('⏳ RPCがタイムアウト/失敗。自動で範囲を縮小して再実行');
            let zoomRegion = { ...searchRegion };
            let zoomFactor = 0.6;
            let attempts = 0;
            const maxAttempts = 5;
            while (attempts < maxAttempts) {
              attempts++;
              zoomRegion = {
                ...zoomRegion,
                latitudeDelta: zoomRegion.latitudeDelta * zoomFactor,
                longitudeDelta: zoomRegion.longitudeDelta * zoomFactor,
              };
              if (mapRef.current) mapRef.current.animateToRegion(zoomRegion, 400);
              result = await SupabaseService.fetchParkingSpotsSortedByFee(
                zoomRegion,
                currentFilter.parkingDuration.durationInMinutes,
                minElevation,
                currentFilter.parkingDuration.startDate
              );
              if (!(result as any).error && result.totalCount !== -1) {
                console.log(`✅ RPC成功（試行${attempts}回目）: ${result.totalCount}件`);
                searchRegion = zoomRegion;
                break;
              }
            }
            if ((result as any).error || result.totalCount === -1) {
              console.error('❌ RPC再試行に失敗。ユーザーに地図拡大を促します');
              Alert.alert('検索範囲を拡大', '検索範囲が広すぎます。地図を拡大してから再度検索してください。');
              return;
            }
          }

          // 2000件を超えた場合、自動でズームイン（2000件以下になるまで段階的にズーム）
          if (result.totalCount > 2000) {
            console.log(`⚠️ 駐車場が${result.totalCount}件あります。2000件以下になるまで自動でズームインします`);

            // 2000件以下になるまで段階的にズームイン（アラートなしでシームレスに実行）
            let zoomRegion = { ...searchRegion };
            let zoomFactor = 0.5; // 初回は50%ズーム
            let maxZoomAttempts = 5; // 最大5回まで試行
            let currentAttempt = 0;

            const performAutoZoom = async () => {
              currentAttempt++;

              // 地図をズームイン
              zoomRegion = {
                ...zoomRegion,
                latitudeDelta: zoomRegion.latitudeDelta * zoomFactor,
                longitudeDelta: zoomRegion.longitudeDelta * zoomFactor,
              };

              // mapRefが存在する場合はアニメーション付きでズーム
              if (mapRef.current) {
                mapRef.current.animateToRegion(zoomRegion, 500);
              }

              // ズーム後の範囲で再検索
              const retryResult = await SupabaseService.fetchParkingSpotsSortedByFee(
                zoomRegion,
                currentFilter.parkingDuration.durationInMinutes,
                minElevation,
                currentFilter.parkingDuration.startDate
              );

              console.log(`🔍 ズーム試行${currentAttempt}: 駐車場${retryResult.totalCount}件`);

              // 2000件以下になった、または最大試行回数に達した場合は結果を表示
              if (retryResult.totalCount <= 2000 || currentAttempt >= maxZoomAttempts) {
                parkingSpots = retryResult.spots.filter(p =>
                  ParkingFeeCalculator.isParkingOpenForEntireDuration(p, currentFilter.parkingDuration)
                );
                console.log(`🅿️ 最終料金フィルター結果: ${parkingSpots.length}件 (総数: ${retryResult.totalCount}件)`);
                displaySpots.push(...parkingSpots);

                // 駐車場に同率順位を計算して設定
                const allParkingSpots = displaySpots.filter(s => s.category === 'コインパーキング') as CoinParking[];
                const rankedParkingSpots = calculateParkingRanks(allParkingSpots);
                const finalDisplaySpots = displaySpots.map(spot => {
                  if (spot.category === 'コインパーキング') {
                    const rankedSpot = rankedParkingSpots.find(p => p.id === spot.id);
                    return rankedSpot || spot;
                  }
                  return spot;
                });

                // 結果を更新
                setSearchResults(finalDisplaySpots);
                setSearchStatus('complete');
                setTimeout(() => setSearchStatus('idle'), 3000);
              } else {
                // まだ2000件を超えている場合は、さらにズームイン
                // 次回は60%ズーム（徐々に細かくズーム）
                zoomFactor = 0.6;
                setTimeout(() => performAutoZoom(), 600);
              }
            };

            // 初回のズーム実行（即座にシームレスに実行）
            performAutoZoom();

            return; // 早期リターン
          }

          // 10件未満の場合、10件以上見つかるまで自動でズームアウト
          if (result.totalCount < 10) {
            console.log(`⚠️ 駐車場が${result.totalCount}件しかありません。10件以上見つかるまで自動でズームアウトします`);

            let zoomOutRegion = { ...searchRegion };
            let zoomOutFactor = 1.5; // 初回は150%ズームアウト
            let maxZoomOutAttempts = 5; // 最大5回まで試行
            let currentZoomOutAttempt = 0;

            const performAutoZoomOut = async () => {
              currentZoomOutAttempt++;

              // 地図をズームアウト
              zoomOutRegion = {
                ...zoomOutRegion,
                latitudeDelta: zoomOutRegion.latitudeDelta * zoomOutFactor,
                longitudeDelta: zoomOutRegion.longitudeDelta * zoomOutFactor,
              };

              // mapRefが存在する場合はアニメーション付きでズーム
              if (mapRef.current) {
                mapRef.current.animateToRegion(zoomOutRegion, 500);
              }

              // ズームアウト後の範囲で再検索
              const retryResult = await SupabaseService.fetchParkingSpotsSortedByFee(
                zoomOutRegion,
                currentFilter.parkingDuration.durationInMinutes,
                minElevation,
                currentFilter.parkingDuration.startDate
              );

              console.log(`🔍 ズームアウト試行${currentZoomOutAttempt}: 駐車場${retryResult.totalCount}件`);

              // 10件以上見つかった、または最大試行回数に達した場合は結果を表示
              // ただし2000件を超えない範囲で
              if ((retryResult.totalCount >= 10 && retryResult.totalCount <= 2000) || currentZoomOutAttempt >= maxZoomOutAttempts) {
                parkingSpots = retryResult.spots.filter(p =>
                  ParkingFeeCalculator.isParkingOpenForEntireDuration(p, currentFilter.parkingDuration)
                );
                console.log(`🅿️ 最終料金フィルター結果: ${parkingSpots.length}件 (総数: ${retryResult.totalCount}件)`);
                displaySpots.push(...parkingSpots);

                // 駐車場に同率順位を計算して設定
                const allParkingSpots = displaySpots.filter(s => s.category === 'コインパーキング') as CoinParking[];
                const rankedParkingSpots = calculateParkingRanks(allParkingSpots);
                const finalDisplaySpots = displaySpots.map(spot => {
                  if (spot.category === 'コインパーキング') {
                    const rankedSpot = rankedParkingSpots.find(p => p.id === spot.id);
                    return rankedSpot || spot;
                  }
                  return spot;
                });

                // 結果を更新
                setSearchResults(finalDisplaySpots);
                setSearchStatus('complete');
                setTimeout(() => setSearchStatus('idle'), 3000);
              } else if (retryResult.totalCount > 2000) {
                // 2000件を超えてしまった場合は少し縮小
                zoomOutRegion = {
                  ...zoomOutRegion,
                  latitudeDelta: zoomOutRegion.latitudeDelta * 0.8,
                  longitudeDelta: zoomOutRegion.longitudeDelta * 0.8,
                };
                if (mapRef.current) {
                  mapRef.current.animateToRegion(zoomOutRegion, 500);
                }

                // 再度検索して結果を表示
                const finalResult = await SupabaseService.fetchParkingSpotsSortedByFee(
                  zoomOutRegion,
                  currentFilter.parkingDuration.durationInMinutes,
                  minElevation,
                  currentFilter.parkingDuration.startDate
                );

                parkingSpots = finalResult.spots.filter(p =>
                  ParkingFeeCalculator.isParkingOpenForEntireDuration(p, currentFilter.parkingDuration)
                );
                console.log(`🅿️ 最終料金フィルター結果: ${parkingSpots.length}件 (総数: ${finalResult.totalCount}件)`);
                displaySpots.push(...parkingSpots);

                // 駐車場に同率順位を計算して設定
                const allParkingSpots = displaySpots.filter(s => s.category === 'コインパーキング') as CoinParking[];
                const rankedParkingSpots = calculateParkingRanks(allParkingSpots);
                const finalDisplaySpots = displaySpots.map(spot => {
                  if (spot.category === 'コインパーキング') {
                    const rankedSpot = rankedParkingSpots.find(p => p.id === spot.id);
                    return rankedSpot || spot;
                  }
                  return spot;
                });

                setSearchResults(finalDisplaySpots);
                setSearchStatus('complete');
                setTimeout(() => setSearchStatus('idle'), 3000);
              } else {
                // まだ10件未満の場合は、さらにズームアウト
                // 次回は40%ズームアウト（徐々に細かく調整）
                zoomOutFactor = 1.4;
                setTimeout(() => performAutoZoomOut(), 600);
              }
            };

            // 初回のズームアウト実行（即座にシームレスに実行）
            performAutoZoomOut();

            return; // 早期リターン
          }

          parkingSpots = result.spots.filter(p =>
            ParkingFeeCalculator.isParkingOpenForEntireDuration(p, currentFilter.parkingDuration)
          );
          console.log(`🅿️ 料金フィルター結果: ${parkingSpots.length}件 (総数: ${result.totalCount}件)`);
          displaySpots.push(...parkingSpots);
        } 
        // どちらのフィルターも無効な場合
        else {
          // 通常の検索（フロントエンド処理）
          parkingSpots = validSpots.filter(spot => spot.category === 'コインパーキング') as CoinParking[];
          console.log(`🅿️ 通常検索駐車場: ${parkingSpots.length}件`);
        }
        
        // フィルターが無効な場合のみフロントエンド処理を実行
        if (!hasNearbyFilter && !hasParkingTimeFilter) {
          
          // 300件を超える場合は警告を表示
          if (parkingSpots.length >= 300) {
            Alert.alert(
              '検索範囲が広すぎます',
              '地図を拡大してください。',
              [{ text: 'OK', style: 'default' }]
            );
          }
          
          // フロントエンド処理（フィルターが無効な場合のみ）
          if (parkingSpots.length > 0) {
            // 通常のフロントエンド処理
            const parkingSpotsWithFee = parkingSpots.map(spot => ({
              ...spot,
              calculatedFee: ParkingFeeCalculator.calculateFee(spot, currentFilter.parkingDuration)
            }));
            
            // 料金計算可能な駐車場と不可能な駐車場を分ける
            const validParkingSpots = [];
            const invalidParkingSpots = [];
            
            for (const spot of parkingSpotsWithFee) {
              if (spot.calculatedFee >= 0) {
                // 0円の無料駐車場も含む
                validParkingSpots.push(spot);
              } else {
                // 料金計算できない場合は-1として保持（後で末尾に追加）
                console.log(`💭 ${spot.name}は料金情報が不完全ですが表示します。`);
                invalidParkingSpots.push(spot);
              }
            }
            
            console.log(`🏦 料金計算結果: ${parkingSpots.length}件中 有効${validParkingSpots.length}件、料金情報なし${invalidParkingSpots.length}件`);
            
            // 有効な駐車場を料金でソート（安い順）
            const sortedValidSpots = validParkingSpots.sort((a, b) => a.calculatedFee - b.calculatedFee);
            
            // 料金計算できない駐車場を末尾に追加
            const sortedParkingSpots = [...sortedValidSpots, ...invalidParkingSpots];
            
            // 重複した駐車場を除外（同じ名前と座標の組み合わせ）
            const uniqueParkingSpots = [];
            const seenSpots = new Set<string>();
            
            for (const spot of sortedParkingSpots) {
              const key = `${spot.name}_${spot.lat.toFixed(6)}_${spot.lng.toFixed(6)}`;
              if (!seenSpots.has(key)) {
                seenSpots.add(key);
                uniqueParkingSpots.push(spot);
              } else {
                console.warn(`📍 ${spot.name}の重複エントリをスキップしました (ID: ${spot.id})`);
              }
            }
            
            console.log(`🧩 重複除外結果: ${sortedParkingSpots.length}件から${uniqueParkingSpots.length}件に絞り込み`);
            
            // 上位20件にランキングを付与（同率順位対応）
            const maxDisplayCount = 20;
            const top20ParkingSpots = calculateParkingRanks(uniqueParkingSpots.slice(0, maxDisplayCount));
            
            displaySpots.push(...top20ParkingSpots);
          }
        }
        
        console.log(`🏆 駐車場を地図に表示完了`);

        // 周辺検索が有効な場合、関連施設も地図に表示
        if (currentFilter.nearbyFilterEnabled) {
          const nearbyFacilities: Spot[] = [];

          // 表示される駐車場（最大20件）
          const displayedParkingSpots = displaySpots
            .filter(spot => spot.category === 'コインパーキング')
            .slice(0, 20) as CoinParking[];

          console.log(`🎯 周辺検索モード: ${displayedParkingSpots.length}件の駐車場に紐付く施設を表示`);

          // 各駐車場にランキング番号を付与（同率順位対応）
          const rankedParkingSpots = calculateParkingRanks(displayedParkingSpots);
          rankedParkingSpots.forEach((rankedSpot, index) => {
            displayedParkingSpots[index].rank = rankedSpot.rank;
          });

          // 施設IDを収集するためのMapを使用（重複防止）
          const facilitiesToFetch = new Map<string, {
            type: 'コンビニ' | '温泉',
            parkingName: string,
            distance: number
          }>();

          // 各駐車場から施設IDを収集
          displayedParkingSpots.forEach((parking: CoinParking) => {
            // コンビニのID収集
            if ((currentFilter.convenienceStoreRadius || 0) > 0 && parking.nearestConvenienceStore) {
              const convenienceData = parking.nearestConvenienceStore as any;
              const storeId = convenienceData?.id || convenienceData?.store_id || convenienceData?.facility_id;
              const distance = convenienceData?.distance || convenienceData?.distance_m || convenienceData?.distance_meters || 0;

              if (storeId) {
                facilitiesToFetch.set(storeId, {
                  type: 'コンビニ',
                  parkingName: parking.name,
                  distance: distance
                });
                console.log(`🏪 コンビニID収集: ${storeId} (${parking.name}から${distance}m)`);
              }
            }

            // トイレのID収集
            if ((currentFilter.toiletRadius || 0) > 0 && parking.nearestToilet) {
              const hotspringData = parking.nearestHotspring as any;
              const springId = hotspringData?.id || hotspringData?.spring_id || hotspringData?.facility_id;
              const distance = hotspringData?.distance || hotspringData?.distance_m || hotspringData?.distance_meters || 0;

              if (springId) {
                facilitiesToFetch.set(springId, {
                  type: '温泉',
                  parkingName: parking.name,
                  distance: distance
                });
                console.log(`♨️ 温泉ID収集: ${springId} (${parking.name}から${distance}m)`);
              }
            }
          });

          console.log(`📋 収集されたユニーク施設ID: ${facilitiesToFetch.size}件`);

          // 施設IDから実際のデータを取得
          for (const [facilityId, info] of facilitiesToFetch) {
            try {
              if (info.type === 'コンビニ') {
                const store = await SupabaseService.fetchConvenienceStoreById(String(facilityId));
                if (store && store.lat && store.lng) {
                  // 重複チェック（念のため）
                  const exists = nearbyFacilities.some(f => f.id === store.id);
                  if (!exists) {
                    nearbyFacilities.push({
                      ...store,
                      description: `${info.parkingName}から${info.distance}m`
                    } as Spot);
                    console.log(`✅ コンビニ取得成功: ${store.name} (${store.lat}, ${store.lng})`);
                  }
                } else {
                  console.log(`❌ コンビニ取得失敗: ID=${facilityId} (座標なし)`);
                }
              } else if (info.type === '温泉') {
                const spring = await SupabaseService.fetchHotSpringById(String(facilityId));
                if (spring && spring.lat && spring.lng) {
                  // 重複チェック（念のため）
                  const exists = nearbyFacilities.some(f => f.id === spring.id);
                  if (!exists) {
                    nearbyFacilities.push({
                      ...spring,
                      description: `${info.parkingName}から${info.distance}m`
                    } as Spot);
                    console.log(`✅ 温泉取得成功: ${spring.name} (${spring.lat}, ${spring.lng})`);
                  }
                } else {
                  console.log(`❌ 温泉取得失敗: ID=${facilityId} (座標なし)`);
                }
              }
            } catch (error) {
              console.error(`❌ 施設データ取得エラー: ID=${facilityId}`, error);
            }
          }


          // 取得した施設を表示リストに追加
          if (nearbyFacilities.length > 0) {
            displaySpots.push(...nearbyFacilities);

            const convenienceCount = nearbyFacilities.filter(f => f.category === 'コンビニ').length;
            const hotspringCount = nearbyFacilities.filter(f => f.category === '温泉').length;

            console.log(`📊 施設取得結果:`);
            console.log(`  - コンビニ: ${convenienceCount}件`);
            console.log(`  - 温泉: ${hotspringCount}件`);
            console.log(`  - 合計: ${nearbyFacilities.length}件`);
            console.log(`🗺️ 地図表示: 駐車場${displayedParkingSpots.length}件 + 施設${nearbyFacilities.length}件 = 合計${displayedParkingSpots.length + nearbyFacilities.length}件`);
          } else {
            console.log('⚠️ 関連施設の取得に失敗しました');
          }

          // 周辺検索時はnearbyFacilitiesステートをクリア
          setNearbyFacilities([]);
        }
      }
      
      // 駐車場以外のカテゴリーは絞り込みに関係なく全て表示（最大100件）
      let nonParkingSpots: Spot[] = [];
      
      // コンビニ（周辺検索で既に追加されている場合はスキップ）
      if (selectedCategories.has('コンビニ') &&
          !(currentFilter.nearbyFilterEnabled && (currentFilter.convenienceStoreRadius || 0) > 0)) {
        const convenienceStores = validSpots.filter(spot => spot.category === 'コンビニ').slice(0, 100);
        nonParkingSpots.push(...convenienceStores);
        displaySpots.push(...convenienceStores);
        console.log(`🏪 コンビニ: ${convenienceStores.length}件（最大100件）`);
      }

      // トイレ（絞り込みに関係なく表示）
      if (selectedCategories.has('トイレ')) {
        const toilets = validSpots.filter(spot => spot.category === 'トイレ').slice(0, 100);
        nonParkingSpots.push(...toilets);
        displaySpots.push(...toilets);
        console.log(`🚻 トイレ: ${toilets.length}件（最大100件）`);
      }

      // ガソリンスタンド（絞り込みに関係なく表示）
      if (selectedCategories.has('ガソリンスタンド')) {
        const gasStations = validSpots.filter(spot => spot.category === 'ガソリンスタンド').slice(0, 100);
        nonParkingSpots.push(...gasStations);
        displaySpots.push(...gasStations);
        console.log(`⛽ ガソリンスタンド: ${gasStations.length}件（最大100件）`);
      }

      // 温泉（周辺検索で既に追加されている場合はスキップ）
      if (selectedCategories.has('温泉') &&
          !(currentFilter.nearbyFilterEnabled && (currentFilter.hotSpringRadius || 0) > 0)) {
        const hotSprings = validSpots.filter(spot => spot.category === '温泉').slice(0, 100);
        nonParkingSpots.push(...hotSprings);
        displaySpots.push(...hotSprings);
        console.log(`♨️ 温泉: ${hotSprings.length}件（最大100件）`);
      }
      
      // お祭り・花火大会（絞り込みに関係なく表示）
      if (selectedCategories.has('お祭り・花火大会')) {
        const festivals = validSpots.filter(spot => spot.category === 'お祭り・花火大会').slice(0, 100);
        nonParkingSpots.push(...festivals);
        displaySpots.push(...festivals);
        console.log(`🎆 お祭り・花火大会: ${festivals.length}件（最大100件）`);
      }
      
      // 駐車場以外のスポットが多い場合の警告（100件を超える前の元データをチェック）
      const totalNonParkingInArea = validSpots.filter(spot => 
        spot.category !== 'コインパーキング' && selectedCategories.has(spot.category)
      ).length;
      
      if (totalNonParkingInArea > 100) {
        console.log(`⚠️ エリア内に${totalNonParkingInArea}件の施設があります。各カテゴリー最大100件ずつ表示`);
      }
      
      // 重複を除去
      let uniqueDisplaySpots = Array.from(
        new Map(displaySpots.map(spot => [spot.id, spot])).values()
      );
      console.log(`🗺️ 合計${uniqueDisplaySpots.length}件を地図に表示（重複除去前: ${displaySpots.length}件）`);
      // フィルタの優先順位: 標高 → 周辺検索 → 駐車料金
      // 1) 標高フィルター（最優先）: 駐車場カテゴリーに対して適用
      if (currentFilter.elevationFilterEnabled && (currentFilter.minElevation || 0) > 0) {
        const minElev = currentFilter.minElevation || 0;
        uniqueDisplaySpots = uniqueDisplaySpots.filter(s =>
          s.category !== 'コインパーキング' || ( (s as any).elevation == null || (s as any).elevation >= minElev )
        );
        console.log(`🏔️ 標高フィルター後: ${uniqueDisplaySpots.length}件 (>= ${minElev}m, 未登録は温存)`);
      }

      // 2) 周辺検索はサービス側ですでに適用済み（fetchParkingSpotsByNearbyFilter）
      // 3) 駐車料金はサービス側の計算結果を利用（ソート/上位抽出はサービスで実施）

      // 駐車場に同率順位を計算して設定
      const parkingSpots = uniqueDisplaySpots.filter(s => s.category === 'コインパーキング') as CoinParking[];
      const rankedParkingSpots = calculateParkingRanks(parkingSpots);

      // 駐車場を更新した順位で置き換え
      const finalResults = uniqueDisplaySpots.map(spot => {
        if (spot.category === 'コインパーキング') {
          const rankedSpot = rankedParkingSpots.find(p => p.id === spot.id);
          return rankedSpot || spot;
        }
        return spot;
      });

      setSearchResults(finalResults);

      // 周辺検索時でも地図の範囲は変更しない（ユーザーの操作を尊重）

      // デバッグ: カテゴリ別の内訳を確認
      const categoryCounts = finalResults.reduce((acc, spot) => {
        acc[spot.category] = (acc[spot.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('📊 searchResultsのカテゴリ別内訳:', categoryCounts);

      // コンビニの詳細を確認
      const convenienceStores = finalResults.filter(s => s.category === 'コンビニ');
      if (convenienceStores.length > 0) {
        console.log(`🏪 searchResultsのコンビニ ${convenienceStores.length}件:`,
          convenienceStores.map(s => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng }))
        );

        // 重複IDチェック
        const idCounts = convenienceStores.reduce((acc, store) => {
          acc[store.id] = (acc[store.id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const duplicateIds = Object.entries(idCounts).filter(([_, count]) => count > 1);
        if (duplicateIds.length > 0) {
          console.warn('⚠️ 重複IDを持つコンビニが存在:', duplicateIds);
        }
      }

      setSearchStatus('complete');
      // 3秒後に状態をリセット
      setTimeout(() => setSearchStatus('idle'), 3000);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert(
        'ネットワークエラー', 
        'データを取得できませんでした。インターネット接続を確認してください。',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setIsLoading(false);
      if (searchStatus === 'searching') {
        setSearchStatus('idle');
      }
    }
  };
  
  const handleLocationPress = async () => {
    const location = await LocationService.getCurrentLocation();
    if (location) {
      setUserLocation(location);
      const newRegion = {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setMapRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 500);
      // 自動検索は行わない（ユーザーが手動で検索ボタンを押すまで待つ）
      console.log('📍 現在地に移動完了');
    } else {
      setToastMessage('⚠️ 現在地を取得できませんでした');
    }
  };
  
  const handleRegionChangeComplete = (region: Region) => {
    // 日本国外に出ないようにクランプ
    const JAPAN_BOUNDS = {
      minLat: 20.0,
      maxLat: 46.5,
      minLng: 122.0,
      maxLng: 154.0,
    };

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
    const halfLat = region.latitudeDelta / 2;
    const halfLng = region.longitudeDelta / 2;

    // ズームアウトし過ぎを制御（日本全域に収まる程度）
    const maxLatDelta = (JAPAN_BOUNDS.maxLat - JAPAN_BOUNDS.minLat) * 0.98;
    const maxLngDelta = (JAPAN_BOUNDS.maxLng - JAPAN_BOUNDS.minLng) * 0.98;
    const latitudeDelta = Math.min(region.latitudeDelta, maxLatDelta);
    const longitudeDelta = Math.min(region.longitudeDelta, maxLngDelta);

    const halfLatNew = latitudeDelta / 2;
    const halfLngNew = longitudeDelta / 2;

    const minCenterLat = JAPAN_BOUNDS.minLat + halfLatNew;
    const maxCenterLat = JAPAN_BOUNDS.maxLat - halfLatNew;
    const minCenterLng = JAPAN_BOUNDS.minLng + halfLngNew;
    const maxCenterLng = JAPAN_BOUNDS.maxLng - halfLngNew;

    const clamped: Region = {
      latitude: clamp(region.latitude, minCenterLat, maxCenterLat),
      longitude: clamp(region.longitude, minCenterLng, maxCenterLng),
      latitudeDelta,
      longitudeDelta,
    };

    // 地図の移動が完了したら最新のregionを保存（必要ならアニメート）
    const epsilon = 1e-6;
    const changed =
      Math.abs(clamped.latitude - region.latitude) > epsilon ||
      Math.abs(clamped.longitude - region.longitude) > epsilon ||
      Math.abs(clamped.latitudeDelta - region.latitudeDelta) > epsilon ||
      Math.abs(clamped.longitudeDelta - region.longitudeDelta) > epsilon;

    if (changed && mapRef.current) {
      mapRef.current.animateToRegion(clamped, 180);
      setMapRegion(clamped);
      saveMapRegion(clamped);
      return;
    }

    // 地図の移動が完了したら最新のregionを保存
    setMapRegion(region);

    // AsyncStorageに現在の地図範囲を保存
    saveMapRegion(region);

    console.log('📱 地図移動完了 (この値を検索に使用):', {
      中心緯度: region.latitude.toFixed(6),
      中心経度: region.longitude.toFixed(6),
      緯度幅: region.latitudeDelta.toFixed(6),
      経度幅: region.longitudeDelta.toFixed(6),
      計算北端: (region.latitude + region.latitudeDelta/2).toFixed(6),
      計算南端: (region.latitude - region.latitudeDelta/2).toFixed(6),
    });
  };

  // 指定したスポットを画面上から25%の位置に強制的に配置
  const animateMarkerToTopFractionCenter = (
    spot: Spot,
    visibleTopFraction = 0.5,
    options?: { zoomScale?: number }
  ) => {
    if (!mapRef.current || !mapRegion) return;
    const current = mapRegion;
    const targetLatDelta = (current.latitudeDelta || 0.01) * (options?.zoomScale ?? 1);
    const targetLngDelta = (current.longitudeDelta || 0.01) * (options?.zoomScale ?? 1);

    // マーカーを画面上から25%の位置に強制配置
    // スクリーン座標0.25の位置にマーカーが来るように計算
    // centerLat = markerLat + (0.25 - 0.5) * latDelta = markerLat - 0.25 * latDelta
    const centerLat = spot.lat - 0.25 * targetLatDelta;

    mapRef.current.animateToRegion(
      {
        latitude: centerLat,
        longitude: spot.lng,
        latitudeDelta: targetLatDelta,
        longitudeDelta: targetLngDelta,
      },
      200
    );
  };
  
  // テキスト検索機能
  const handleTextSearch = async (query: string) => {
    const q = (query || '').trim();
    if (!q) return;

    // 1) 既存の検索結果から名前一致のスポットを探す
    const lower = q.toLowerCase();
    const matched = searchResults.find(s => (s.name || '').toLowerCase().includes(lower));

    if (matched) {
      // スポットが見つかった場合はその場所へ移動
      const newRegion = {
        latitude: matched.lat,
        longitude: matched.lng,
        latitudeDelta: mapRegion?.latitudeDelta || 0.01,
        longitudeDelta: mapRegion?.longitudeDelta || 0.01,
      };
      setMapRegion(newRegion);

      // 駐車場の場合は詳細を開き、マーカーを上側に
      selectSpot(matched);
      if (matched.category === 'コインパーキング') {
        setShowDetailSheet(true);
      }
      animateMarkerToTopFractionCenter(matched, 0.5);
      return;
    }

    // 2) 地名としてジオコーディングし、地図中心を移動
    const geocoded = await LocationService.geocode(q);
    if (geocoded) {
      const newRegion = {
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        latitudeDelta: mapRegion?.latitudeDelta || 0.02,
        longitudeDelta: mapRegion?.longitudeDelta || 0.02,
      };
      setMapRegion(newRegion);
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 800);
      }
      // 新しい中心で検索を実行
      await handleSearch(false);
      return;
    }

    Alert.alert('検索', '該当する場所やスポットが見つかりませんでした。');
  };

  // 予測検索で選択された場所へ移動
  const handlePlaceSelect = async (place: PlaceSearchResult) => {
    console.log('📍 場所選択:', place.displayName);
    console.log('   座標:', `緯度 ${place.latitude}, 経度 ${place.longitude}`);
    console.log('   タイプ:', place.type);

    // 日本の範囲チェック
    const JAPAN_BOUNDS = {
      minLat: 20.0,
      maxLat: 46.5,
      minLng: 122.0,
      maxLng: 154.0,
    };

    const isInJapan =
      place.latitude >= JAPAN_BOUNDS.minLat &&
      place.latitude <= JAPAN_BOUNDS.maxLat &&
      place.longitude >= JAPAN_BOUNDS.minLng &&
      place.longitude <= JAPAN_BOUNDS.maxLng;

    if (!isInJapan) {
      console.warn('⚠️ 警告: 選択された場所が日本国外です！', {
        緯度: place.latitude,
        経度: place.longitude,
        場所: place.displayName,
      });
      Alert.alert(
        '場所が見つかりません',
        `選択された場所（${place.displayName}）が日本国外の可能性があります。別の検索語句をお試しください。`,
        [{ text: 'OK' }]
      );
      return;
    }

    // 統一されたズームレベル（0.02）を使用
    const delta = 0.02;

    // 地図を選択された場所へ移動
    const newRegion = {
      latitude: place.latitude,
      longitude: place.longitude,
      latitudeDelta: delta,
      longitudeDelta: delta,
    };

    console.log('🗺️ 地図を移動:', newRegion);

    // 状態を更新
    setMapRegion(newRegion);

    // 地図をアニメーションで移動
    if (mapRef.current) {
      mapRef.current.animateToRegion(newRegion, 1000);
    }

    // 地図範囲を保存
    await saveMapRegion(newRegion);

    // 自動検索は行わない（ユーザーが手動で検索ボタンを押すまで待つ）
  };

  // カテゴリートグル機能
  const handleCategoryToggle = (category: string) => {
    const newCategories = new Set(searchFilter.selectedCategories);
    if (newCategories.has(category)) {
      newCategories.delete(category);
    } else {
      newCategories.add(category);
    }

    // ストアを更新
    useMainStore.setState(state => ({
      searchFilter: {
        ...state.searchFilter,
        selectedCategories: newCategories
      }
    }));

    console.log('📝 カテゴリー選択更新:', Array.from(newCategories));

    // 自動的に再検索
    handleSearch(false, {
      ...searchFilter,
      selectedCategories: newCategories
    });
  };

  // 最寄り施設を非同期バックグラウンドで取得する関数
  const fetchNearbyFacilitiesAsync = async (parkingSpot: CoinParking) => {
    const facilities: Spot[] = [];

    console.log('🅿️ 駐車場タップ:', parkingSpot.name);
    console.log('📍 最寄りコンビニ:', parkingSpot.nearestConvenienceStore);
    console.log('♨️ 最寄り温泉:', parkingSpot.nearestHotspring);

    // 最寄りのコンビニを取得して地図に追加
    if (parkingSpot.nearestConvenienceStore) {
      const nearestStore = parkingSpot.nearestConvenienceStore;
      console.log('🏪 コンビニデータ構造:', nearestStore);

      // データ構造に応じて処理
      if (typeof nearestStore === 'object' && nearestStore !== null) {
        const storeData = nearestStore as any;

        // 座標情報がある場合
        if (storeData.lat && storeData.lng) {
          console.log('✅ コンビニデータ使用（座標あり）:', storeData.name);
          facilities.push({
            id: storeData.id || storeData.store_id || `conv-${Date.now()}`,
            name: storeData.name || storeData.store_name || 'コンビニ',
            category: 'コンビニ' as const,
            lat: storeData.lat,
            lng: storeData.lng,
            address: storeData.address || '',
            brand: storeData.brand || '',
            distance: storeData.distance || storeData.distance_m || storeData.distance_meters
          } as any);
        }
        // IDがある場合は詳細を取得
        else if (storeData.id || storeData.store_id || storeData.facility_id) {
          const convenienceId = storeData.id || storeData.store_id || storeData.facility_id;
          console.log('🏪 コンビニID:', convenienceId);

          try {
            const store = await SupabaseService.fetchConvenienceStoreById(String(convenienceId));
            if (store) {
              console.log('✅ コンビニ取得成功:', store.name);
              facilities.push({
                ...store,
                distance: storeData.distance || storeData.distance_m || storeData.distance_meters
              } as any);
            } else {
              console.log('❌ コンビニ情報なし');
            }
          } catch (error) {
            console.error('コンビニ情報取得エラー:', error);
          }
        }
        // 名前と距離のみの場合（RPC関数からのデータ）
        else if (storeData.name && (storeData.distance || storeData.distance_m)) {
          console.log('🔍 コンビニを名前で検索:', storeData.name);
          // 地図範囲内でコンビニを名前検索
          try {
            const stores = await SupabaseService.fetchConvenienceStores(mapRegion || {
              latitude: parkingSpot.lat,
              longitude: parkingSpot.lng,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01
            });
            const matchedStore = stores.find(s => s.name === storeData.name);
            if (matchedStore) {
              console.log('✅ 名前でコンビニ発見:', matchedStore.name);
              facilities.push({
                ...matchedStore,
                distance: storeData.distance || storeData.distance_m
              } as any);
            }
          } catch (error) {
            console.error('コンビニ検索エラー:', error);
          }
        }
      }
    }

    // 最寄りの温泉を取得して地図に追加
    if (parkingSpot.nearestHotspring) {
      const nearestSpring = parkingSpot.nearestHotspring;
      console.log('♨️ 温泉データ構造:', nearestSpring);

      // データ構造に応じて処理
      if (typeof nearestSpring === 'object' && nearestSpring !== null) {
        const springData = nearestSpring as any;

        // 座標情報がある場合
        if (springData.lat && springData.lng) {
          console.log('✅ 温泉データ使用（座標あり）:', springData.name);
          facilities.push({
            id: springData.id || springData.spring_id || `hot-${Date.now()}`,
            name: springData.name || springData.spring_name || '温泉',
            category: '温泉' as const,
            lat: springData.lat,
            lng: springData.lng,
            address: springData.address || '',
            distance: springData.distance || springData.distance_m || springData.distance_meters
          } as any);
        }
        // IDがある場合は詳細を取得
        else if (springData.id || springData.spring_id || springData.facility_id) {
          const hotspringId = springData.id || springData.spring_id || springData.facility_id;
          console.log('♨️ 温泉ID:', hotspringId);

          try {
            const spring = await SupabaseService.fetchHotSpringById(String(hotspringId));
            if (spring) {
              console.log('✅ 温泉取得成功:', spring.name);
              facilities.push({
                ...spring,
                distance: springData.distance || springData.distance_m || springData.distance_meters
              } as any);
            } else {
              console.log('❌ 温泉情報なし');
            }
          } catch (error) {
            console.error('温泉情報取得エラー:', error);
          }
        }
        // 名前と距離のみの場合（RPC関数からのデータ）
        else if (springData.name && (springData.distance || springData.distance_m)) {
          console.log('🔍 温泉を名前で検索:', springData.name);
          // 地図範囲内で温泉を名前検索
          try {
            const springs = await SupabaseService.fetchHotSprings(mapRegion || {
              latitude: parkingSpot.lat,
              longitude: parkingSpot.lng,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01
            });
            const matchedSpring = springs.find(s => s.name === springData.name);
            if (matchedSpring) {
              console.log('✅ 名前で温泉発見:', matchedSpring.name);
              facilities.push({
                ...matchedSpring,
                distance: springData.distance || springData.distance_m
              } as any);
            }
          } catch (error) {
            console.error('温泉検索エラー:', error);
          }
        }
      }
    }

    console.log('🗺️ 地図に追加する施設数:', facilities.length);
    setNearbyFacilities(facilities);

    // 施設が見つかった場合のみ地図範囲を調整（バックグラウンドで実行）
    if (mapRef.current && facilities.length > 0) {
      const allSpots = [parkingSpot, ...facilities];

      // 全施設の緯度・経度の最小値と最大値を取得
      const lats = allSpots.map(s => s.lat);
      const lngs = allSpots.map(s => s.lng);

      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      // 表示範囲を計算（パディングを追加）
      let latDelta = Math.max((maxLat - minLat) * 2.5, 0.01);
      let lngDelta = Math.max((maxLng - minLng) * 2.5, 0.01);

      // 可視上部50%の上下中央(=全体の25%位置)にスポットを配置
      const desired = 0.5 / 2; // 0.25
      const offsetCenterLat = parkingSpot.lat - (0.5 - desired) * latDelta;

      console.log('🗺️ 地図範囲調整:', {
        施設数: allSpots.length,
        駐車場位置: { lat: parkingSpot.lat, lng: parkingSpot.lng },
        地図中心: { lat: offsetCenterLat, lng: parkingSpot.lng },
        範囲: { latDelta, lngDelta }
      });
      mapRef.current.animateToRegion({
        latitude: offsetCenterLat,
        longitude: parkingSpot.lng,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      }, 200);
    }
  };

  const handleMarkerPress = async (spot: Spot) => {
    // 既に処理中の場合は何もしない（連打防止）
    if (isProcessingMarkerPress.current) {
      console.log('⚠️ マーカー処理中のため、タップを無視します');
      return;
    }

    try {
      isProcessingMarkerPress.current = true;

      selectSpot(spot);
      setShowDetailSheet(true);

      // マーカーを画面上から25%の位置に素早く移動（200ms）
      if (spot) animateMarkerToTopFractionCenter(spot, 0.5);

      // 最寄り施設の取得は非同期バックグラウンドで実行（awaitしない）
      if (spot.category === 'コインパーキング') {
        fetchNearbyFacilitiesAsync(spot as CoinParking);
      } else {
        setNearbyFacilities([]);
      }
    } catch (error) {
      console.error('❌ handleMarkerPress エラー:', error);
    } finally {
      // 処理完了後、フラグをリセット（アニメーション完了を待つ）
      setTimeout(() => {
        isProcessingMarkerPress.current = false;
      }, 300);
    }
  };
  
  const handleRankingSpotSelect = (spot: CoinParking) => {
    selectSpot(spot);
    // 詳細表示はしない（マーカータップで表示）
    setShowDetailSheet(false);
    
    // 選択した駐車場を画面上部50%の中央に表示
    animateMarkerToTopFractionCenter(spot, 0.5);
  };
  
  const renderMarkers = () => {
    try {
      const markers: React.ReactElement[] = [];
      
      // データの有効性を確認
      if (!searchResults || !Array.isArray(searchResults)) {
        console.log('⚠️ searchResults is invalid');
        return [];
      }
      
      // 1. カテゴリーを表示順序で追加（後ろから順に：花火大会 → ガソリン → 温泉 → トイレ → コンビニ）
      const categoryOrder = ['お祭り・花火大会', 'ガソリンスタンド', '温泉', 'トイレ', 'コンビニ'];

      // カテゴリー別にマーカーを追加
      categoryOrder.forEach((category) => {
        const spotsInCategory = searchResults.filter(spot => spot.category === category);
        let validMarkersInCategory = 0;
        let skippedInCategory = 0;

        // コンビニの場合は詳細ログ
        if (category === 'コンビニ') {
          console.log(`🏪 コンビニマーカー処理開始: ${spotsInCategory.length}件`);
        }

        spotsInCategory.forEach((spot, index) => {
          try {
            // スポットのデータ検証を強化
            if (!spot || !spot.id) {
              if (category === 'コンビニ') {
                console.log(`  ❌ [${index}] ID無し:`, spot);
              }
              skippedInCategory++;
              return;
            }

            if (typeof spot.id !== 'string' && typeof spot.id !== 'number') {
              if (category === 'コンビニ') {
                console.log(`  ❌ [${index}] ID型が不正:`, typeof spot.id, spot.id);
              }
              skippedInCategory++;
              return;
            }

            if (spot.lat == null || spot.lng == null) {
              if (category === 'コンビニ') {
                console.log(`  ❌ [${index}] 座標無し:`, spot.id, spot.lat, spot.lng);
              }
              skippedInCategory++;
              return;
            }

            if (typeof spot.lat !== 'number' || typeof spot.lng !== 'number') {
              if (category === 'コンビニ') {
                console.log(`  ❌ [${index}] 座標型が不正:`, spot.id, typeof spot.lat, typeof spot.lng);
              }
              skippedInCategory++;
              return;
            }

            if (isNaN(spot.lat) || isNaN(spot.lng)) {
              if (category === 'コンビニ') {
                console.log(`  ❌ [${index}] 座標がNaN:`, spot.id, spot.lat, spot.lng);
              }
              skippedInCategory++;
              return;
            }

            if (!spot.category) {
              if (category === 'コンビニ') {
                console.log(`  ❌ [${index}] カテゴリー無し:`, spot.id);
              }
              skippedInCategory++;
              return;
            }

            // コンビニの場合は正常データをログ
            if (category === 'コンビニ') {
              console.log(`  ✅ [${index}] マーカー作成: ${spot.id} - ${spot.name} (${spot.lat}, ${spot.lng})`);
            }

            // 駐車場の場合はrankを渡す
            const parking = spot.category === 'コインパーキング' ? spot as CoinParking : null;
            const marker = (
              <CustomMarker
                key={`${category}-${spot.id}`}
                spot={spot}
                rank={parking?.rank}
                onPress={() => handleMarkerPress(spot)}
                isSelected={false}
                isNearbyFacility={searchFilter.nearbyFilterEnabled && (category === 'コンビニ' || category === '温泉' || category === 'トイレ')}
              />
            );

            // マーカーがnullでないことを確認してから追加
            if (marker && React.isValidElement(marker)) {
              markers.push(marker);
              validMarkersInCategory++;
              if (category === 'コンビニ') {
                console.log(`    → マーカー配列に追加完了 (現在の総数: ${markers.length})`);
              }
            } else {
              if (category === 'コンビニ') {
                console.log(`  ❌ [${index}] 無効なReact要素:`, spot.id);
              }
              skippedInCategory++;
            }
          } catch (spotError) {
            console.error(`⚠️ ${category}マーカー作成エラー:`, spotError, spot);
            skippedInCategory++;
          }
        });

        // カテゴリーごとの結果を出力
        if (category === 'コンビニ' || validMarkersInCategory > 0) {
          console.log(`📊 ${category}: ${validMarkersInCategory}/${spotsInCategory.length}件作成 (スキップ: ${skippedInCategory}件)`);
        }
      });
    
      // 2. 最寄り施設を追加（駐車場選択時のみ表示される個別施設）
      if (nearbyFacilities && nearbyFacilities.length > 0) {
        nearbyFacilities.slice(0, 10).forEach((facility) => { // 最大10件に制限
          try {
            // 施設のデータ検証
            if (!facility ||
                !facility.id ||
                facility.lat == null ||
                facility.lng == null ||
                typeof facility.lat !== 'number' ||
                typeof facility.lng !== 'number' ||
                isNaN(facility.lat) ||
                isNaN(facility.lng) ||
                !facility.category) {
              console.log('⚠️ Invalid facility data skipped:', facility);
              return;
            }

            console.log(`  - ${facility.category}: ${facility.name} (${facility.lat}, ${facility.lng})`);
            const marker = (
              <CustomMarker
                key={`nearby-${facility.id}`}
                spot={facility}
                onPress={() => {}} // 最寄り施設はタップ無効
                isSelected={false}
                isNearbyFacility={true} // 最寄り施設フラグ
              />
            );

            if (marker && React.isValidElement(marker)) {
              markers.push(marker);
            } else {
              console.log('⚠️ Invalid facility marker element created for:', facility.id);
            }
          } catch (facilityError) {
            console.error('⚠️ Error processing facility for marker:', facilityError, facility);
          }
        });
      }
    
      // 3. コインパーキングをランキング順に追加（順位の低い方から高い方へ）
      // まず、ランキング外（4位以下）の駐車場を追加
      const parkingSpots = searchResults.filter(spot => spot.category === 'コインパーキング');
      const unrankedParkingSpots = parkingSpots.filter(spot => !spot.rank || spot.rank > 3);
      
      unrankedParkingSpots.forEach((spot) => {
        try {
          // スポットのデータ検証を強化
          if (!spot ||
              !spot.id ||
              typeof spot.id !== 'string' && typeof spot.id !== 'number' ||
              spot.lat == null ||
              spot.lng == null ||
              typeof spot.lat !== 'number' ||
              typeof spot.lng !== 'number' ||
              isNaN(spot.lat) ||
              isNaN(spot.lng)) {
            return;
          }
          
          if (selectedSpot?.id !== spot.id) {
            const marker = (
              <CustomMarker
                key={`parking-${spot.id}`}
                spot={spot}
                rank={spot.rank}
                calculatedFee={(spot as any).calculatedFee}
                onPress={() => handleMarkerPress(spot)}
                isSelected={false}
              />
            );
            
            // マーカーがnullでないことを確認してから追加
            if (marker && React.isValidElement(marker)) {
              markers.push(marker);
            } else {
              console.log('⚠️ Invalid parking marker element created for spot:', spot.id);
            }
          }
        } catch (parkingError) {
          console.error('⚠️ Error processing parking spot for marker:', parkingError, spot);
        }
      });
    
      // 4. ランキング3位を追加（同率順位対応）
      try {
        const rank3Spots = parkingSpots.filter(spot =>
          spot && spot.rank === 3 && selectedSpot?.id !== spot.id
        );
        rank3Spots.forEach(rank3 => {
          if (rank3 && rank3.id && rank3.lat != null && rank3.lng != null && !isNaN(rank3.lat) && !isNaN(rank3.lng)) {
            const marker = (
              <CustomMarker
                key={`rank3-${rank3.id}`}
                spot={rank3}
                rank={3}
                calculatedFee={(rank3 as any).calculatedFee}
                onPress={() => handleMarkerPress(rank3)}
                isSelected={false}
              />
            );
            if (marker && React.isValidElement(marker)) {
              markers.push(marker);
            }
          }
        });
      } catch (rank3Error) {
        console.error('⚠️ Error processing rank 3 markers:', rank3Error);
      }
      
      // 5. ランキング2位を追加（同率順位対応）
      try {
        const rank2Spots = parkingSpots.filter(spot =>
          spot && spot.rank === 2 && selectedSpot?.id !== spot.id
        );
        rank2Spots.forEach(rank2 => {
          if (rank2 && rank2.id && rank2.lat != null && rank2.lng != null && !isNaN(rank2.lat) && !isNaN(rank2.lng)) {
            const marker = (
              <CustomMarker
                key={`rank2-${rank2.id}`}
                spot={rank2}
                rank={2}
                calculatedFee={(rank2 as any).calculatedFee}
                onPress={() => handleMarkerPress(rank2)}
                isSelected={false}
              />
            );
            if (marker && React.isValidElement(marker)) {
              markers.push(marker);
            }
          }
        });
      } catch (rank2Error) {
        console.error('⚠️ Error processing rank 2 markers:', rank2Error);
      }
      
      // 6. ランキング1位を追加（最前面、同率順位対応）
      try {
        const rank1Spots = parkingSpots.filter(spot =>
          spot && spot.rank === 1 && selectedSpot?.id !== spot.id
        );
        rank1Spots.forEach(rank1 => {
          if (rank1 && rank1.id && rank1.lat != null && rank1.lng != null && !isNaN(rank1.lat) && !isNaN(rank1.lng)) {
            const marker = (
              <CustomMarker
                key={`rank1-${rank1.id}`}
                spot={rank1}
                rank={1}
                calculatedFee={(rank1 as any).calculatedFee}
                onPress={() => handleMarkerPress(rank1)}
                isSelected={false}
              />
            );
            if (marker && React.isValidElement(marker)) {
              markers.push(marker);
            }
          }
        });
      } catch (rank1Error) {
        console.error('⚠️ Error processing rank 1 markers:', rank1Error);
      }
      
      // 7. 最後に選択された駐車場を追加（最前面に表示）
      try {
        if (selectedSpot && selectedSpot.id && selectedSpot.lat != null && selectedSpot.lng != null && !isNaN(selectedSpot.lat) && !isNaN(selectedSpot.lng)) {
          const marker = (
            <CustomMarker
              key={`selected-${selectedSpot.id}`}
              spot={selectedSpot}
              rank={selectedSpot.rank}
              calculatedFee={(selectedSpot as any).calculatedFee}
              onPress={() => handleMarkerPress(selectedSpot)}
              isSelected={true}
            />
          );
          if (marker && React.isValidElement(marker)) {
            markers.push(marker);
          }
        }
      } catch (selectedError) {
        console.error('⚠️ Error processing selected spot marker:', selectedError);
      }

      // 7. 現在位置マーカーを追加（最前面）
      if (userLocation && userLocation.latitude && userLocation.longitude) {
        try {
          const currentLocationMarker = (
            <CurrentLocationMarker
              key="current-location"
              latitude={userLocation.latitude}
              longitude={userLocation.longitude}
              isTracking={isLocationTracking}
            />
          );
          if (currentLocationMarker && React.isValidElement(currentLocationMarker)) {
            markers.push(currentLocationMarker);
            console.log('📍 現在位置マーカーを追加');
          }
        } catch (locationError) {
          console.error('⚠️ Error processing current location marker:', locationError);
        }
      }

      console.log('🗺️ renderMarkers完了 - 総マーカー数:', markers.length);
      return markers;
      
    } catch (error) {
      console.error('⚠️ renderMarkers全体エラー:', error);
      return [];
    }
  };
  
  // 起動時の自動移動はしない（ユーザー操作か初回のみ）
  // - 初回は initializeLocation 内で現在地へ一度だけ移動
  // - 2回目以降は保存した地図範囲を復元し、地図は動かさない

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* 地図初期化中のローディング表示 */}
      {isInitializingMap && (
        <View style={styles.initializingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.initializingText}>地図を読み込み中...</Text>
        </View>
      )}

      <View style={styles.mapWrapper}>
        <CrossPlatformMap
          mapRef={mapRef}
          style={styles.map}
          region={mapRegion}
          onRegionChangeComplete={handleRegionChangeComplete}
          onPress={() => setDismissSearchUI(prev => prev + 1)}
          onMapReady={() => setIsMapReady(true)}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={false}
          rotateEnabled={false}
        >
          {isMapReady && (() => {
            try {
              // 検索結果が空の間は直近の安定結果を使って描画
              const currentResults = (searchResults && searchResults.length > 0) ? searchResults : stableResults;
              const allMarkers = (() => {
                const original = searchResults;
                // 一時的にレンダリング対象を差し替え
                (useMainStore.getState() as any).searchResults = currentResults as any;
                const m = renderMarkers();
                // 元に戻す
                (useMainStore.getState() as any).searchResults = original as any;
                return m;
              })();
              const validMarkers = allMarkers.filter((marker, index) => {
                if (!marker) {
                  console.log(`⚠️ Null marker detected at index ${index}`);
                  return false;
                }
                if (!React.isValidElement(marker)) {
                  console.log(`⚠️ Invalid React element marker detected at index ${index}`);
                  return false;
                }
                return true;
              });

              // マーカーのキーをチェックして重複を検出
              const markerKeys = validMarkers.map(m => m.key);
              const uniqueKeys = new Set(markerKeys);
              if (markerKeys.length !== uniqueKeys.size) {
                console.warn(`⚠️ 重複するマーカーキーが検出されました: ${markerKeys.length}個中${uniqueKeys.size}個がユニーク`);
                const keyCount: Record<string, number> = {};
                markerKeys.forEach(key => {
                  if (key) keyCount[key] = (keyCount[key] || 0) + 1;
                });
                const duplicates = Object.entries(keyCount).filter(([_, count]) => count > 1);
                console.warn('重複キー:', duplicates);
              }

              console.log(`🗺️ Rendering ${validMarkers.length} valid markers out of ${allMarkers.length} total`);

              // 現在の地図範囲を確認
              if (mapRegion) {
                const bounds = {
                  minLat: mapRegion.latitude - mapRegion.latitudeDelta / 2,
                  maxLat: mapRegion.latitude + mapRegion.latitudeDelta / 2,
                  minLng: mapRegion.longitude - mapRegion.longitudeDelta / 2,
                  maxLng: mapRegion.longitude + mapRegion.longitudeDelta / 2
                };

                // コンビニマーカーの表示範囲を確認
                const convenienceMarkers = searchResults.filter(s => s.category === 'コンビニ');
                const inBounds = convenienceMarkers.filter(s =>
                  s.lat >= bounds.minLat && s.lat <= bounds.maxLat &&
                  s.lng >= bounds.minLng && s.lng <= bounds.maxLng
                );
                const outOfBounds = convenienceMarkers.filter(s =>
                  s.lat < bounds.minLat || s.lat > bounds.maxLat ||
                  s.lng < bounds.minLng || s.lng > bounds.maxLng
                );

                if (outOfBounds.length > 0) {
                  console.log(`📍 地図範囲: ${bounds.minLat.toFixed(4)}-${bounds.maxLat.toFixed(4)}, ${bounds.minLng.toFixed(4)}-${bounds.maxLng.toFixed(4)}`);
                  console.log(`✅ 範囲内のコンビニ: ${inBounds.length}件`);
                  console.log(`❌ 範囲外のコンビニ: ${outOfBounds.length}件`,
                    outOfBounds.map(s => ({ name: s.name, lat: s.lat, lng: s.lng }))
                  );
                }
              }

              return validMarkers;
            } catch (renderError) {
              console.error('⚠️ Error rendering markers:', renderError);
              return [];
            }
          })()}
        </CrossPlatformMap>
        
        {/* Top search bar with right-side menu */}
        <TopSearchBar
          onMenuPress={() => setShowMenuModal(true)}
          onSearch={handleTextSearch}
          onPlaceSelect={handlePlaceSelect}
          dismissSignal={dismissSearchUI}
        />

        {/* Category tabs under search bar */}
        <TopCategoryTabs
          selectedCategories={searchFilter.selectedCategories}
          onCategoryToggle={handleCategoryToggle}
        />
        
        {/* プレミアムマップコントロール */}
        <PremiumMapControls
          onMenuPress={() => setShowMenuModal(true)}
          onLocationPress={handleLocationPress}
          onRankingPress={() => setShowRankingModal(true)}
          searchStatus={searchStatus}
          resultCount={searchResults.filter(s => s.category === 'コインパーキング').length}
          showMenuButton={false}
        />
        
        {/* 縮尺バー - パネルの少し上に配置 */}
        {isMapReady && mapRegion && (
          <MapScale region={mapRegion} />
        )}
        
        
        {/* 位置情報取得中のオーバーレイ - 削除（地図操作を妨げないため） */}

        {/* エラーメッセージの表示 - 削除（Alert.alertで表示するため） */}

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>検索中...</Text>
            </View>
          </View>
        )}

        {/* 下部トースト通知 */}
        {toastMessage && (
          <View style={styles.toastNotification}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}
      </View>
      
      <CompactBottomPanel 
        navigation={navigation} 
        onHeightChange={() => {
          if (showDetailSheet && selectedSpot) {
            setTimeout(() => animateMarkerToTopFractionCenter(selectedSpot, 0.5), 50);
          }
        }}
        onSearch={(isExpanded: boolean, newFilter?: any) => handleSearch(isExpanded, newFilter)}
        onAnyTap={() => setDismissSearchUI(prev => prev + 1)}
      />
      
      <RankingListModal
        visible={showRankingModal}
        onClose={() => setShowRankingModal(false)}
        onSpotSelect={handleRankingSpotSelect}
        onSpotDetail={async (spot) => {
          console.log('🎯 詳細表示を開く:', spot.name);
          selectSpot(spot);
          
          // コインパーキングの最寄り施設を取得
          const facilities: Spot[] = [];
          
          if (spot.nearestConvenienceStore) {
            const convenienceId = spot.nearestConvenienceStore.id || 
                                  (spot.nearestConvenienceStore as any).store_id ||
                                  (spot.nearestConvenienceStore as any).facility_id;
            
            if (convenienceId) {
              try {
                const store = await SupabaseService.fetchConvenienceStoreById(convenienceId);
                if (store) {
                  facilities.push(store);
                }
              } catch (error) {
                console.error('コンビニ情報取得エラー:', error);
              }
            }
          }
          
          if (spot.nearestHotspring) {
            const hotspringId = spot.nearestHotspring.id || 
                               (spot.nearestHotspring as any).spring_id ||
                               (spot.nearestHotspring as any).facility_id;
            
            if (hotspringId) {
              try {
                const spring = await SupabaseService.fetchHotSpringById(hotspringId);
                if (spring) {
                  facilities.push(spring);
                }
              } catch (error) {
                console.error('温泉情報取得エラー:', error);
              }
            }
          }
          
          setNearbyFacilities(facilities);
          
          // 3つの施設全てが表示される地図範囲を計算
          if (mapRef.current && facilities.length > 0) {
            const allSpots = [spot, ...facilities];
            
            // 全施設の緯度・経度の最小値と最大値を取得
            const lats = allSpots.map(s => s.lat);
            const lngs = allSpots.map(s => s.lng);
            
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            const minLng = Math.min(...lngs);
            const maxLng = Math.max(...lngs);
            
            // 表示範囲を計算（パディングを追加）
            let latDelta = Math.max((maxLat - minLat) * 2.5, 0.01);
            let lngDelta = Math.max((maxLng - minLng) * 2.5, 0.01);

            // 駐車場を画面上部50%の中央(=全体の25%)に配置するための計算
            const offsetCenterLat = spot.lat - (0.5 - 0.5/2) * latDelta; // = spot.lat - 0.25 * latDelta

            mapRef.current.animateToRegion({
              latitude: offsetCenterLat,
              longitude: spot.lng,  // 駐車場の経度を中心に
              latitudeDelta: latDelta,
              longitudeDelta: lngDelta,
            }, 300);
          } else if (mapRef.current) {
            // 施設がない場合は駐車場のみを表示（上部50%の中央に）
            const current = mapRegion;
            const latDelta = (current?.latitudeDelta || 0.01);
            const lngDelta = (current?.longitudeDelta || 0.01);
            const centerLat = spot.lat - (0.5 - 0.5/2) * latDelta; // = spot.lat - 0.25 * latDelta
            mapRef.current.animateToRegion({
              latitude: centerLat,
              longitude: spot.lng,
              latitudeDelta: latDelta,
              longitudeDelta: lngDelta,
            }, 300);
          }
          
          // ランキングモーダルを閉じてから詳細を表示
          setShowRankingModal(false);
          setShouldReopenRanking(true);
          setTimeout(() => {
            setShowDetailSheet(true);
            // マーカーを画面上から25%の位置に強制移動
            if (spot) animateMarkerToTopFractionCenter(spot, 0.5);
          }, 400); // モーダルが閉じるアニメーションを待つ
        }}
      />
      
      <SpotDetailBottomSheet 
        visible={showDetailSheet}
        onClose={() => {
          setShowDetailSheet(false);
          // 最寄り施設を地図から削除
          setNearbyFacilities([]);
          // 選択状態もクリア
          selectSpot(null);
          // 詳細を閉じた後、必要に応じてランキングを再表示
          if (shouldReopenRanking) {
            setTimeout(() => {
              setShowRankingModal(true);
              setShouldReopenRanking(false);
            }, 300);
          }
        }}
      />
      
      <MenuModal
        visible={showMenuModal}
        onClose={() => setShowMenuModal(false)}
        navigation={navigation}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mapWrapper: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  resultContainer: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  resultText: {
    fontSize: 12,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  errorBanner: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 59, 48, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  errorText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '500',
  },
  toastNotification: {
    position: 'absolute',
    bottom: 200,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  toastText: {
    fontSize: 12,
    color: '#333333',
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  initializingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  initializingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
