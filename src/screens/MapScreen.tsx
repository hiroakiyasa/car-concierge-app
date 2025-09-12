import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';

// プラットフォームに応じてマップコンポーネントを条件付きインポート
let MapView: any;
let PROVIDER_GOOGLE: any;
let PROVIDER_DEFAULT: any;
let Marker: any;

if (Platform.OS === 'web') {
  const { WebMapView: WebMap, WebMarker: WebMarkerComp } = require('@/components/Map/WebMapView');
  MapView = WebMap;
  Marker = WebMarkerComp;
  PROVIDER_GOOGLE = 'google';
  PROVIDER_DEFAULT = 'default';
} else {
  const ReactNativeMaps = require('react-native-maps');
  MapView = ReactNativeMaps.default;
  Marker = ReactNativeMaps.Marker;
  PROVIDER_GOOGLE = ReactNativeMaps.PROVIDER_GOOGLE;
  PROVIDER_DEFAULT = ReactNativeMaps.PROVIDER_DEFAULT;
}
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMainStore } from '@/stores/useMainStore';
import { LocationService } from '@/services/location.service';
import { SupabaseService } from '@/services/supabase.service';
import { ParkingFeeCalculator } from '@/services/parking-fee.service';
import { CustomMarker } from '@/components/Map/CustomMarker';
import { CategoryButtons } from '@/components/Map/CategoryButtons';
import { MapScale } from '@/components/Map/MapScale';
import { PremiumMapControls } from '@/components/Map/PremiumMapControls';
import { MenuModal } from '@/components/MenuModal';
import { CompactBottomPanel } from '@/components/FilterPanel/CompactBottomPanel';
import { SpotDetailBottomSheet } from '@/screens/SpotDetailBottomSheet';
import { RankingListModal } from '@/screens/RankingListModal';
import { Colors } from '@/utils/constants';
import { Region, Spot, CoinParking } from '@/types';

interface MapScreenProps {
  navigation: any;
}

export const MapScreen: React.FC<MapScreenProps> = ({ navigation }) => {
  const mapRef = useRef<any>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'complete'>('idle');
  const [shouldReopenRanking, setShouldReopenRanking] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [nearbyFacilities, setNearbyFacilities] = useState<Spot[]>([]);
  
  const {
    mapRegion,
    setMapRegion,
    searchResults,
    setSearchResults,
    setUserLocation,
    isLoading,
    setIsLoading,
    searchFilter,
    selectedSpot,
    selectSpot,
  } = useMainStore();
  
  // Initialize location
  useEffect(() => {
    initializeLocation();
  }, []);
  
  // 地図がレンダリングされて初期位置が設定されたら自動検索
  useEffect(() => {
    if (isMapReady && mapRegion.latitude && mapRegion.longitude && 
        mapRegion.latitude !== 0 && mapRegion.longitude !== 0 &&
        !isNaN(mapRegion.latitude) && !isNaN(mapRegion.longitude) &&
        !hasInitialized) {
      // 初回のみ自動検索を実行
      setHasInitialized(true);
      const timer = setTimeout(() => {
        console.log('🚀 初回自動検索実行');
        // デフォルトでコインパーキングのみ選択されているか確認
        console.log('選択されているカテゴリー:', Array.from(searchFilter.selectedCategories));
        handleSearch();
      }, 2000); // 少し待ってから実行
      return () => clearTimeout(timer);
    }
  }, [isMapReady, mapRegion.latitude, mapRegion.longitude, hasInitialized]);
  
  const initializeLocation = async () => {
    const location = await LocationService.getCurrentLocation();
    if (location) {
      setUserLocation(location);
      const newRegion = {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      console.log('📍 初期位置設定:', newRegion);
      setMapRegion(newRegion);
    } else {
      // デフォルト位置（東京駅）を設定
      const defaultRegion = {
        latitude: 35.6812,
        longitude: 139.7671,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      console.log('📍 デフォルト位置設定:', defaultRegion);
      setMapRegion(defaultRegion);
    }
  };
  
  const handleSearch = async (isExpanded?: boolean) => {
    setIsLoading(true);
    setSearchStatus('searching');
    try {
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
      
      // ラベルサイズを考慮したマージン設定
      const labelWidthRatio = 0.06; // ラベル1個分の幅（画面の6%）
      const labelHeightRatio = 0.05; // ラベル1個分の高さ（画面の5%）
      const bottomLabelMargin = 0; // 下側はパネル境界まで（変更なし）
      const topInset = labelHeightRatio; // 上側は画面上端から1ラベル分内側に制限
      const upwardOffset = labelHeightRatio * 2; // 全体を2ラベル分上にオフセット
      
      // パネルが展開されている場合
      if (isExpanded) {
        // 画面の1/3がパネルで隠れている
        const bottomPanelRatio = 0.33; // パネルが占める割合
        const bottomExclusionRatio = bottomPanelRatio + bottomLabelMargin; // パネル境界まで
        const leftMargin = labelWidthRatio; // 左側はラベル1個分内側（範囲を1ラベル分拡張）
        const rightMargin = labelWidthRatio * 2 + 0.05; // 右側はラベル2個分内側に調整
        
        // 境界を計算
        // 上側：画面上端から1ラベル分内側（画面内に制限）
        // 下側：パネル境界まで（変更なし）
        const visibleTopRatio = 1 - topInset; // 上側は画面から1ラベル分内側まで（画面外には出ない）
        const visibleBottomRatio = 1 - bottomExclusionRatio; // 下側はパネル境界まで
        
        // 緯度の調整（上下）
        const adjustedLatitudeDelta = fullScreenRegion.latitudeDelta * (visibleTopRatio - bottomExclusionRatio);
        
        // 経度の調整（左右）
        const adjustedLongitudeDelta = fullScreenRegion.longitudeDelta * (1 - leftMargin - rightMargin);
        
        // 検索範囲の中心を計算（上にシフト + 境界調整）
        const centerLatitudeShift = fullScreenRegion.latitudeDelta * ((upwardOffset + bottomExclusionRatio - topInset) / 2);
        
        searchRegion = {
          latitude: fullScreenRegion.latitude + centerLatitudeShift,
          longitude: fullScreenRegion.longitude - (fullScreenRegion.longitudeDelta * rightMargin * 0.3),
          latitudeDelta: adjustedLatitudeDelta,
          longitudeDelta: adjustedLongitudeDelta,
        };
        
        console.log('📦 パネル展開時: 下側=パネル境界、上側=画面上端から1ラベル分内側（' + (bottomExclusionRatio * 100).toFixed(0) + '%除外）');
      } else {
        // パネル最小時でも約100pxは隠れている
        const bottomPanelRatio = 0.15; // 最小パネルが占める割合
        const bottomExclusionRatio = bottomPanelRatio + bottomLabelMargin; // パネル境界まで
        const leftMargin = labelWidthRatio; // 左側はラベル1個分内側（範囲を1ラベル分拡張）
        const rightMargin = labelWidthRatio * 2 + 0.05; // 右側はラベル2個分内側に調整
        
        // 境界を計算
        // 上側：画面上端から1ラベル分内側（画面内に制限）
        // 下側：パネル境界まで（変更なし）
        const visibleTopRatio = 1 - topInset; // 上側は画面から1ラベル分内側まで（画面外には出ない）
        const visibleBottomRatio = 1 - bottomExclusionRatio; // 下側はパネル境界まで
        
        // 緯度の調整（上下）
        const adjustedLatitudeDelta = fullScreenRegion.latitudeDelta * (visibleTopRatio - bottomExclusionRatio);
        
        // 経度の調整（左右）
        const adjustedLongitudeDelta = fullScreenRegion.longitudeDelta * (1 - leftMargin - rightMargin);
        
        // 検索範囲の中心を計算（上にシフト + 境界調整）
        const centerLatitudeShift = fullScreenRegion.latitudeDelta * ((upwardOffset + bottomExclusionRatio - topInset) / 2);
        
        searchRegion = {
          latitude: fullScreenRegion.latitude + centerLatitudeShift,
          longitude: fullScreenRegion.longitude - (fullScreenRegion.longitudeDelta * rightMargin * 0.3),
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
      const selectedCategories = searchFilter.selectedCategories;
      console.log('🔍 選択されたカテゴリー:', Array.from(selectedCategories));
      
      // 標高フィルターが有効な場合はminElevationを渡す
      const minElevation = searchFilter.elevationFilterEnabled ? searchFilter.minElevation : undefined;
      
      if (searchFilter.elevationFilterEnabled) {
        console.log(`🏔️ 標高フィルター有効: ${searchFilter.minElevation}m以上の駐車場のみ表示`);
      }
      
      // 周辺検索が有効な場合は、関連施設も取得するためにカテゴリーを追加
      const categoriesForFetch = new Set(selectedCategories);
      if (searchFilter.nearbyFilterEnabled && selectedCategories.has('コインパーキング')) {
        if ((searchFilter.convenienceStoreRadius || 0) > 0) {
          categoriesForFetch.add('コンビニ');
        }
        if ((searchFilter.hotSpringRadius || 0) > 0) {
          categoriesForFetch.add('温泉');
        }
      }
      
      const spots = await SupabaseService.fetchSpotsByCategories(
        searchRegion,
        categoriesForFetch,
        minElevation
      );
      
      // spotsがnullまたはundefinedの場合は空配列として処理
      const validSpots = spots || [];
      
      // カテゴリー別に処理
      let displaySpots: Spot[] = [];
      
      if (selectedCategories.has('コインパーキング')) {
        let parkingSpots: CoinParking[] = [];
        
        // 周辺検索フィルターが有効な場合は新メソッドを使用
        if (searchFilter.nearbyFilterEnabled && 
            ((searchFilter.convenienceStoreRadius || 0) > 0 || (searchFilter.hotSpringRadius || 0) > 0)) {
          console.log('🎯 周辺検索フィルター有効 - バックエンドで完結処理');
          parkingSpots = await SupabaseService.fetchParkingSpotsByNearbyFilter(
            searchRegion,
            searchFilter.parkingDuration.durationInMinutes,
            searchFilter.convenienceStoreRadius,
            searchFilter.hotSpringRadius,
            minElevation
          );
          console.log(`🅿️ 周辺検索結果（バックエンド処理済み）: ${parkingSpots.length}件`);
          // バックエンドで既に処理済みなのでそのまま表示
          displaySpots.push(...parkingSpots);
        }
        // 料金時間フィルターが有効な場合はバックエンドで料金計算・ソートを実行
        else if (searchFilter.parkingTimeFilterEnabled) {
          console.log('💰 料金時間フィルター有効 - バックエンドで料金計算・ソート実行');
          parkingSpots = await SupabaseService.fetchParkingSpotsSortedByFee(
            searchRegion,
            searchFilter.parkingDuration.durationInMinutes,
            minElevation
          );
          console.log(`🅿️ バックエンドソート駐車場: ${parkingSpots.length}件`);
          displaySpots.push(...parkingSpots);
        } else {
          // 通常の検索（フロントエンド処理）
          parkingSpots = validSpots.filter(spot => spot.category === 'コインパーキング') as CoinParking[];
          console.log(`🅿️ 通常検索駐車場: ${parkingSpots.length}件`);
        }
        
        // 周辺検索がバックエンドで処理済みでない場合のみフロントエンド処理を実行
        if (!searchFilter.nearbyFilterEnabled || 
            ((searchFilter.convenienceStoreRadius || 0) === 0 && (searchFilter.hotSpringRadius || 0) === 0)) {
          
          // 300件を超える場合は警告を表示
          if (parkingSpots.length >= 300) {
            Alert.alert(
              '検索範囲が広すぎます',
              '地図を拡大してください。',
              [{ text: 'OK', style: 'default' }]
            );
          }
          
          // 料金時間フィルター有効時はバックエンドで既にソート済みなのでフロントエンド処理をスキップ
          if (searchFilter.parkingTimeFilterEnabled) {
            // バックエンドで既に料金計算・ソート・ランキング付与済み
            console.log(`💰 バックエンド処理済み: ${parkingSpots.length}件（無料駐車場が上位に配置済み）`);
            displaySpots.push(...parkingSpots);
          } else if (parkingSpots.length > 0) {
            // 通常のフロントエンド処理
            const parkingSpotsWithFee = parkingSpots.map(spot => ({
              ...spot,
              calculatedFee: ParkingFeeCalculator.calculateFee(spot, searchFilter.parkingDuration)
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
            
            // 上位20件にランキングを付与
            const maxDisplayCount = 20;
            const top20ParkingSpots = uniqueParkingSpots.slice(0, maxDisplayCount).map((spot, index) => ({
              ...spot,
              rank: index + 1
            }));
            
            displaySpots.push(...top20ParkingSpots);
          }
        }
        
        console.log(`🏆 駐車場を地図に表示完了`);
        
        // 周辺検索が有効でバックエンド処理済みの場合、関連施設も地図に表示
        if (searchFilter.nearbyFilterEnabled) {
          const convenienceIds = new Set<string>();
          const hotspringIds = new Set<string>();
          
          // 表示される駐車場に紐づく施設のIDを収集
          const displayedParkingSpots = displaySpots.filter(spot => spot.category === 'コインパーキング') as CoinParking[];
          displayedParkingSpots.forEach((parking: CoinParking) => {
            if ((searchFilter.convenienceStoreRadius || 0) > 0 && parking.nearestConvenienceStore) {
              const convenienceStore = parking.nearestConvenienceStore;
              const id = convenienceStore.id || (convenienceStore as any).store_id;
              const distance = (convenienceStore as any).distance_m || convenienceStore.distance;
              
              if (id) {
                convenienceIds.add(id);
                console.log(`🏪 駐車場 ${parking.name} の最寄りコンビニ: ID=${id}, 距離=${distance}m`);
              }
            }
            if ((searchFilter.hotSpringRadius || 0) > 0 && parking.nearestHotspring) {
              const hotspring = parking.nearestHotspring;
              const id = hotspring.id || (hotspring as any).spring_id;
              const distance = (hotspring as any).distance_m || hotspring.distance;
              
              if (id) {
                hotspringIds.add(id);
                console.log(`♨️ 駐車場 ${parking.name} の最寄り温泉: ID=${id}, 距離=${distance}m`);
              }
            }
          });
          
          // コンビニを表示に追加
          if (convenienceIds.size > 0) {
            const relatedStores = validSpots.filter(spot => {
              if (spot.category !== 'コンビニ') return false;
              
              // IDマッチングのバリエーションを試す
              const spotId = spot.id;
              const spotIdString = (spot as any).idString;
              
              // デバッグ用
              if (validSpots.filter(s => s.category === 'コンビニ').indexOf(spot) < 3) {
                console.log(`🏪 コンビニマッチング試行: spot.id=${spotId}, idString=${spotIdString}, 検索対象IDs:`, Array.from(convenienceIds));
              }
              
              return convenienceIds.has(spotId) || 
                     convenienceIds.has(spotIdString) ||
                     Array.from(convenienceIds).some(id => 
                       id === spotId || 
                       id === spotIdString ||
                       spotId === id ||
                       spotIdString === id
                     );
            });
            
            if (relatedStores.length === 0 && convenienceIds.size > 0) {
              console.log('⚠️ コンビニIDマッチ失敗。検索対象:', Array.from(convenienceIds));
              console.log('利用可能なコンビニ:', validSpots.filter(s => s.category === 'コンビニ').slice(0, 5).map(s => ({ id: s.id, idString: (s as any).idString })));
            }
            
            displaySpots.push(...relatedStores);
            console.log(`🏪 関連コンビニ: ${relatedStores.length}件を表示 (対象ID: ${convenienceIds.size}件)`);
          }
          
          // 温泉を表示に追加
          if (hotspringIds.size > 0) {
            const relatedSprings = validSpots.filter(spot => {
              if (spot.category !== '温泉') return false;
              
              const spotId = spot.id;
              
              // デバッグ用
              if (validSpots.filter(s => s.category === '温泉').indexOf(spot) < 3) {
                console.log(`♨️ 温泉マッチング試行: spot.id=${spotId}, 検索対象IDs:`, Array.from(hotspringIds));
              }
              
              return hotspringIds.has(spotId) ||
                     Array.from(hotspringIds).some(id => 
                       id === spotId ||
                       spotId === id
                     );
            });
            
            if (relatedSprings.length === 0 && hotspringIds.size > 0) {
              console.log('⚠️ 温泉IDマッチ失敗。検索対象:', Array.from(hotspringIds));
              console.log('利用可能な温泉:', validSpots.filter(s => s.category === '温泉').slice(0, 5).map(s => ({ id: s.id })));
            }
            
            displaySpots.push(...relatedSprings);
            console.log(`♨️ 関連温泉: ${relatedSprings.length}件を表示 (対象ID: ${hotspringIds.size}件)`);
          }
        }
      }
      
      // その他のカテゴリーのスポットを全て表示（周辺検索でない場合のみ）
      if (!searchFilter.nearbyFilterEnabled) {
        let nonParkingSpots: Spot[] = [];
        
        if (selectedCategories.has('コンビニ')) {
          const convenienceStores = validSpots.filter(spot => spot.category === 'コンビニ');
          nonParkingSpots.push(...convenienceStores);
          displaySpots.push(...convenienceStores);
          console.log(`🏂 コンビニ: ${convenienceStores.length}件`);
        }
        
        if (selectedCategories.has('ガソリンスタンド')) {
          const gasStations = validSpots.filter(spot => spot.category === 'ガソリンスタンド');
          nonParkingSpots.push(...gasStations);
          displaySpots.push(...gasStations);
          console.log(`⛽ ガソリンスタンド: ${gasStations.length}件`);
        }
        
        if (selectedCategories.has('温泉')) {
          const hotSprings = validSpots.filter(spot => spot.category === '温泉');
          nonParkingSpots.push(...hotSprings);
          displaySpots.push(...hotSprings);
          console.log(`♨️ 温泉: ${hotSprings.length}件`);
        }
        
        if (selectedCategories.has('お祭り・花火大会')) {
          const festivals = validSpots.filter(spot => spot.category === 'お祭り・花火大会');
          nonParkingSpots.push(...festivals);
          displaySpots.push(...festivals);
          console.log(`🎆 お祭り・花火大会: ${festivals.length}件`);
        }
        
        // 駐車場以外のスポットが100件を超える場合は警告を表示
        if (nonParkingSpots.length >= 100) {
          Alert.alert(
            '検索範囲が広すぎます',
            `${nonParkingSpots.length}件の施設が見つかりました。地図を拡大してください。`,
            [{ text: 'OK', style: 'default' }]
          );
        }
      } else {
        // 周辺検索が有効な場合でも、関連施設以外の選択カテゴリーは表示
        if (selectedCategories.has('ガソリンスタンド')) {
          const gasStations = spots.filter(spot => spot.category === 'ガソリンスタンド');
          displaySpots.push(...gasStations);
          console.log(`⛽ ガソリンスタンド: ${gasStations.length}件`);
        }
        
        if (selectedCategories.has('お祭り・花火大会')) {
          const festivals = spots.filter(spot => spot.category === 'お祭り・花火大会');
          displaySpots.push(...festivals);
          console.log(`🎆 お祭り・花火大会: ${festivals.length}件`);
        }
      }
      
      console.log(`🗺️ 合計${displaySpots.length}件を地図に表示`);
      setSearchResults(displaySpots);
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
      // 現在地に移動後、自動で検索を実行
      setTimeout(() => {
        handleSearch();
      }, 600);
    } else {
      Alert.alert('位置情報', '現在地を取得できませんでした');
    }
  };
  
  const handleRegionChangeComplete = (region: Region) => {
    // 地図の移動が完了したら最新のregionを保存
    setMapRegion(region);
    console.log('📱 地図移動完了 (この値を検索に使用):', {
      中心緯度: region.latitude.toFixed(6),
      中心経度: region.longitude.toFixed(6),
      緯度幅: region.latitudeDelta.toFixed(6),
      経度幅: region.longitudeDelta.toFixed(6),
      計算北端: (region.latitude + region.latitudeDelta/2).toFixed(6),
      計算南端: (region.latitude - region.latitudeDelta/2).toFixed(6),
    });
  };
  
  const handleMarkerPress = async (spot: Spot) => {
    selectSpot(spot);
    setShowDetailSheet(true);
    
    // コインパーキングの場合、最寄りの施設を地図に表示
    if (spot.category === 'コインパーキング') {
      const parkingSpot = spot as CoinParking;
      const facilities: Spot[] = [];
      
      console.log('🅿️ 駐車場タップ:', parkingSpot.name);
      console.log('📍 最寄りコンビニ:', parkingSpot.nearestConvenienceStore);
      console.log('♨️ 最寄り温泉:', parkingSpot.nearestHotspring);
      
      // 最寄りのコンビニを取得して地図に追加
      if (parkingSpot.nearestConvenienceStore) {
        const convenienceId = parkingSpot.nearestConvenienceStore.id || 
                              (parkingSpot.nearestConvenienceStore as any).store_id ||
                              (parkingSpot.nearestConvenienceStore as any).facility_id;
        
        console.log('🏪 コンビニID:', convenienceId);
        
        if (convenienceId) {
          try {
            const store = await SupabaseService.fetchConvenienceStoreById(convenienceId);
            if (store) {
              console.log('✅ コンビニ取得成功:', store.name);
              facilities.push(store);
            } else {
              console.log('❌ コンビニ情報なし');
            }
          } catch (error) {
            console.error('コンビニ情報取得エラー:', error);
          }
        }
      }
      
      // 最寄りの温泉を取得して地図に追加
      if (parkingSpot.nearestHotspring) {
        const hotspringId = parkingSpot.nearestHotspring.id || 
                           (parkingSpot.nearestHotspring as any).spring_id ||
                           (parkingSpot.nearestHotspring as any).facility_id;
        
        console.log('♨️ 温泉ID:', hotspringId);
        
        if (hotspringId) {
          try {
            const spring = await SupabaseService.fetchHotSpringById(hotspringId);
            if (spring) {
              console.log('✅ 温泉取得成功:', spring.name);
              facilities.push(spring);
            } else {
              console.log('❌ 温泉情報なし');
            }
          } catch (error) {
            console.error('温泉情報取得エラー:', error);
          }
        }
      }
      
      console.log('🗺️ 地図に追加する施設数:', facilities.length);
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
        
        // 駐車場を画面上部50%の中央に配置するための計算
        // 詳細シートが50%なので、表示領域の上部50%の中心に駐車場を配置
        // つまり、駐車場から下方向に latDelta * 0.75、上方向に latDelta * 0.25 の範囲を表示
        const offsetCenterLat = spot.lat - latDelta * 0.25;
        
        console.log('🗺️ 地図範囲調整:', {
          施設数: allSpots.length,
          駐車場位置: { lat: spot.lat, lng: spot.lng },
          地図中心: { lat: offsetCenterLat, lng: spot.lng },
          範囲: { latDelta, lngDelta }
        });
        
        mapRef.current.animateToRegion({
          latitude: offsetCenterLat,
          longitude: spot.lng,  // 駐車場の経度を中心に
          latitudeDelta: latDelta,
          longitudeDelta: lngDelta,
        }, 500);
      }
    } else {
      // コインパーキング以外の場合は最寄り施設をクリア
      setNearbyFacilities([]);
      
      // 通常の施設選択時の表示（上部50%の中央に配置）
      if (mapRef.current) {
        const offsetLatitude = spot.lat - 0.002;  // 画面上部50%の中央に配置
        mapRef.current.animateToRegion({
          latitude: offsetLatitude,
          longitude: spot.lng,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        }, 500);
      }
    }
  };
  
  const handleRankingSpotSelect = (spot: CoinParking) => {
    selectSpot(spot);
    // 詳細表示はしない（マーカータップで表示）
    setShowDetailSheet(false);
    
    // 選択した駐車場を画面上部50%の中央に表示
    if (mapRef.current) {
      // 画面の上部50%の中央に配置するため、少し下にオフセット
      const offsetLatitude = spot.lat - 0.002; // 緯度を少し下げて上部中央に配置
      
      mapRef.current.animateToRegion({
        latitude: offsetLatitude,
        longitude: spot.lng,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }, 500);
    }
  };
  
  const renderMarkers = () => {
    try {
      const markers: React.ReactElement[] = [];
      
      // データの有効性を確認
      if (!searchResults || !Array.isArray(searchResults)) {
        console.log('⚠️ searchResults is invalid');
        return [];
      }
      
      // 1. まずコインパーキング以外のカテゴリーを追加（後ろに表示）
      searchResults.forEach((spot) => {
        try {
          // スポットのデータ検証を強化
          if (!spot || 
              !spot.id || 
              typeof spot.id !== 'string' && typeof spot.id !== 'number' ||
              spot.lat == null || 
              spot.lng == null ||
              typeof spot.lat !== 'number' ||
              typeof spot.lng !== 'number' ||
              !spot.category) {
            console.log('⚠️ Invalid spot data skipped:', {
              hasSpot: !!spot,
              hasId: spot?.id,
              hasLat: spot?.lat,
              hasLng: spot?.lng,
              hasCategory: spot?.category,
              latType: typeof spot?.lat,
              lngType: typeof spot?.lng
            });
            return;
          }
          
          if (spot.category !== 'コインパーキング') {
            const marker = (
              <CustomMarker
                key={`other-${spot.id}`}
                spot={spot}
                onPress={() => handleMarkerPress(spot)}
                isSelected={false}
              />
            );
            
            // マーカーがnullでないことを確認してから追加
            if (marker && React.isValidElement(marker)) {
              markers.push(marker);
            } else {
              console.log('⚠️ Invalid marker element created for spot:', spot.id);
            }
          }
        } catch (spotError) {
          console.error('⚠️ Error processing spot for marker:', spotError, spot);
        }
      });
    
      // 2. 最寄り施設を追加（コンビニと温泉）
      if (nearbyFacilities && nearbyFacilities.length > 0) {
        console.log('🗺️ 最寄り施設をマーカーに追加:', nearbyFacilities.length, '件');
        nearbyFacilities.forEach((facility) => {
          try {
            // 施設のデータ検証を強化
            if (!facility || 
                !facility.id || 
                typeof facility.id !== 'string' && typeof facility.id !== 'number' ||
                facility.lat == null || 
                facility.lng == null ||
                typeof facility.lat !== 'number' ||
                typeof facility.lng !== 'number' ||
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
                isNearbyFacility={true} // 最寄り施設フラグを追加
              />
            );
            
            // マーカーがnullでないことを確認してから追加
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
    
      // 3. コインパーキング（ランキング4位以下）を追加（前面に表示）
      searchResults.forEach((spot) => {
        try {
          // スポットのデータ検証を強化
          if (!spot || 
              !spot.id || 
              typeof spot.id !== 'string' && typeof spot.id !== 'number' ||
              spot.lat == null || 
              spot.lng == null ||
              typeof spot.lat !== 'number' ||
              typeof spot.lng !== 'number') {
            return;
          }
          
          if (spot.category === 'コインパーキング' && selectedSpot?.id !== spot.id && (!spot.rank || spot.rank > 3)) {
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
    
      // 4. ランキング3位を追加（さらに前面に表示）
      try {
        const rank3 = searchResults.find(spot => 
          spot && spot.rank === 3 && selectedSpot?.id !== spot.id
        );
        if (rank3 && rank3.id && rank3.lat != null && rank3.lng != null) {
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
      } catch (rank3Error) {
        console.error('⚠️ Error processing rank 3 marker:', rank3Error);
      }
      
      // 5. ランキング2位を追加（さらに前面に表示）
      try {
        const rank2 = searchResults.find(spot => 
          spot && spot.rank === 2 && selectedSpot?.id !== spot.id
        );
        if (rank2 && rank2.id && rank2.lat != null && rank2.lng != null) {
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
      } catch (rank2Error) {
        console.error('⚠️ Error processing rank 2 marker:', rank2Error);
      }
      
      // 6. ランキング1位を追加（さらに前面に表示）
      try {
        const rank1 = searchResults.find(spot => 
          spot && spot.rank === 1 && selectedSpot?.id !== spot.id
        );
        if (rank1 && rank1.id && rank1.lat != null && rank1.lng != null) {
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
      } catch (rank1Error) {
        console.error('⚠️ Error processing rank 1 marker:', rank1Error);
      }
      
      // 7. 最後に選択された駐車場を追加（最前面に表示）
      try {
        if (selectedSpot && selectedSpot.id && selectedSpot.lat != null && selectedSpot.lng != null) {
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
      
      console.log('🗺️ renderMarkers完了 - 総マーカー数:', markers.length);
      return markers;
      
    } catch (error) {
      console.error('⚠️ renderMarkers全体エラー:', error);
      return [];
    }
  };
  
  // アプリ起動時に現在地を取得して自動検索
  useEffect(() => {
    const initializeMap = async () => {
      if (isMapReady) {
        await handleLocationPress();
      }
    };
    initializeMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMapReady]);
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
          initialRegion={{
            latitude: 35.6812,
            longitude: 139.7671,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          onRegionChangeComplete={handleRegionChangeComplete}
          onMapReady={() => setIsMapReady(true)}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={false}
        >
          {isMapReady && renderMarkers()}
        </MapView>
        
        <CategoryButtons />
        
        {/* プレミアムマップコントロール */}
        <PremiumMapControls
          onMenuPress={() => setShowMenuModal(true)}
          onLocationPress={handleLocationPress}
          onRankingPress={() => setShowRankingModal(true)}
          searchStatus={searchStatus}
          resultCount={searchResults.filter(s => s.category === 'コインパーキング').length}
        />
        
        {/* 縮尺バー - パネルの少し上に配置 */}
        {isMapReady && mapRegion && (
          <MapScale region={mapRegion} />
        )}
        
        
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}
      </View>
      
      <CompactBottomPanel 
        navigation={navigation} 
        onHeightChange={() => {}}
        onSearch={(isExpanded) => handleSearch(isExpanded)}
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
            
            // 駐車場を画面上部50%の中央に配置するための計算
            const offsetCenterLat = spot.lat - latDelta * 0.25;
            
            mapRef.current.animateToRegion({
              latitude: offsetCenterLat,
              longitude: spot.lng,  // 駐車場の経度を中心に
              latitudeDelta: latDelta,
              longitudeDelta: lngDelta,
            }, 300);
          } else if (mapRef.current) {
            // 施設がない場合は駐車場のみを表示（上部50%の中央に）
            const offsetLatitude = spot.lat - 0.002;  // 画面上部50%の中央に配置
            mapRef.current.animateToRegion({
              latitude: offsetLatitude,
              longitude: spot.lng,
              latitudeDelta: 0.008,
              longitudeDelta: 0.008,
            }, 300);
          }
          
          // ランキングモーダルを閉じてから詳細を表示
          setShowRankingModal(false);
          setShouldReopenRanking(true);
          setTimeout(() => {
            setShowDetailSheet(true);
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
});