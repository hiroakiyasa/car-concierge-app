import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CrossPlatformMap } from '@/components/Map/CrossPlatformMap';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMainStore } from '@/stores/useMainStore';
import { LocationService } from '@/services/location.service';
import { SupabaseService } from '@/services/supabase.service';
import { SearchService } from '@/services/search.service';
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
  route?: any;
}

export const MapScreen: React.FC<MapScreenProps> = ({ navigation, route }) => {
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
    userLocation,
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
  }, [isMapReady, mapRegion.latitude, mapRegion.longitude, hasInitialized]);
  
  const initializeLocation = async () => {
    try {
      // 1) 現在地を最優先で取得し、取得できたら地図を現在地に移動
      const location = await LocationService.getCurrentLocation();
      if (location) {
        setUserLocation(location);
        const currentRegion = {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };
        console.log('📍 起動時 - 現在地を中心に設定:', currentRegion);
        setMapRegion(currentRegion);
        await saveMapRegion(currentRegion);
        if (mapRef.current && isMapReady) {
          mapRef.current.animateToRegion(currentRegion, 1000);
        }
        return;
      }

      // 2) 現在地が取得できなければ、保存済みの地図範囲を復元
      const savedRegion = await AsyncStorage.getItem('lastMapRegion');
      if (savedRegion) {
        const initialRegion = JSON.parse(savedRegion);
        console.log('📍 現在地取得不可 - 前回の地図範囲を復元:', initialRegion);
        setMapRegion(initialRegion);
        return;
      }

      // 3) それもなければ、デフォルト位置（東京駅）
      const defaultRegion = {
        latitude: 35.6812,
        longitude: 139.7671,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      console.log('📍 現在地・保存範囲なし - デフォルト位置を使用');
      setMapRegion(defaultRegion);
      await saveMapRegion(defaultRegion);
    } catch (error) {
      console.error('❌ 初期位置の設定エラー:', error);
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
  
  // searchParkingWithExpansion関数は削除（自動検索は使用しない）

  // handleSearchForCategory関数は削除（使用されていない）

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
      
      // 近傍検索（新アルゴリズム）: 周辺検索チェックON時のみ実行
      const nearbyOn = currentFilter.nearbyFilterEnabled && (((currentFilter.convenienceStoreRadius || 0) > 0 && selectedCategories.has('コンビニ')) || ((currentFilter.hotSpringRadius || 0) > 0 && selectedCategories.has('温泉')));
      if (nearbyOn) {
        const requireConv = selectedCategories.has('コンビニ') && (currentFilter.convenienceStoreRadius || 0) > 0;
        const requireHot = selectedCategories.has('温泉') && (currentFilter.hotSpringRadius || 0) > 0;

        // 1) 駐車場は地図範囲内、施設は範囲+半径分を取得
        const parkings = await SupabaseService.fetchParkingSpots(searchRegion, minElevation);
        const metersToLat = (m: number) => m / 111000;
        const metersToLng = (m: number, lat: number) => m / (111000 * Math.cos((lat * Math.PI)/180));
        const maxR = Math.max(currentFilter.convenienceStoreRadius || 0, currentFilter.hotSpringRadius || 0);
        const expanded: Region = {
          latitude: searchRegion.latitude,
          longitude: searchRegion.longitude,
          latitudeDelta: searchRegion.latitudeDelta + metersToLat(maxR) * 2,
          longitudeDelta: searchRegion.longitudeDelta + metersToLng(maxR, searchRegion.latitude) * 2,
        };
        // 取得した施設の座標は数値化して扱う
        const conveniencesRaw = requireConv ? await SupabaseService.fetchConvenienceStores(expanded) : [];
        const hotspringsRaw = requireHot ? await SupabaseService.fetchHotSprings(expanded) : [];
        const conveniences = conveniencesRaw.map(s => ({
          ...s,
          lat: Number((s as any).lat),
          lng: Number((s as any).lng),
        }));
        const hotsprings = hotspringsRaw.map(s => ({
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

        type Match = { pk: CoinParking, conv?: Spot, hot?: Spot, fee: number };
        const matched: Match[] = [];

        for (const p of parkings) {
          let conv: Spot | undefined;
          let hot: Spot | undefined;
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
          if (requireHot) {
            let best: any, bestD = Infinity;
            for (const s of hotsprings) {
              const d = distM(pLat, pLng, Number((s as any).lat), Number((s as any).lng));
              if (d <= (currentFilter.hotSpringRadius || 0) && d < bestD) { best = s; bestD = d; }
            }
            hot = best as Spot | undefined;
            if (!hot) {
              console.log(`🔍 温泉半径NG: ${p.name} 半径=${currentFilter.hotSpringRadius}m`);
            } else {
              const d = distM(pLat, pLng, (hot as any).lat, (hot as any).lng);
              console.log(`✅ 温泉半径OK: ${p.name} → ${(hot as any).name} 距離=${Math.round(d)}m (半径=${currentFilter.hotSpringRadius}m)`);
            }
          }
          const pass = (requireConv ? !!conv : true) && (requireHot ? !!hot : true);
          if (!pass) continue;
          const fee = ParkingFeeCalculator.calculateFee(p, currentFilter.parkingDuration);
          if (fee >= 0) matched.push({ pk: p, conv, hot, fee });
        }

        matched.sort((a,b) => a.fee - b.fee);
        const top = matched.slice(0, 20);
        const resultSpots: Spot[] = [];
        top.forEach((m, idx) => { resultSpots.push({ ...(m.pk as any), calculatedFee: m.fee, rank: idx+1 } as any); });
        top.forEach(m => { if (m.conv) resultSpots.push(m.conv); if (m.hot) resultSpots.push(m.hot); });

        // 重複排除
        const unique = Array.from(new Map(resultSpots.map(s => [s.id, s])).values());
        console.log(`✅ 新アルゴ: 駐車場${top.length}件 + 施設${unique.length - top.length}件`);
        setSearchResults(unique);
        setSearchStatus('complete');
        setTimeout(() => setSearchStatus('idle'), 3000);
        return;
      }

      // カテゴリー別に処理（通常フロー）
      let displaySpots: Spot[] = [];
      
      if (selectedCategories.has('コインパーキング')) {
        let parkingSpots: CoinParking[] = [];
        
        // フィルターの組み合わせを判定
        const hasNearbyFilter = currentFilter.nearbyFilterEnabled && 
            ((currentFilter.convenienceStoreRadius || 0) > 0 || (currentFilter.hotSpringRadius || 0) > 0);
        const hasParkingTimeFilter = currentFilter.parkingTimeFilterEnabled;
        
        console.log('🔍 フィルター状態:', {
          周辺検索: hasNearbyFilter,
          駐車料金: hasParkingTimeFilter,
          標高: currentFilter.elevationFilterEnabled
        });
        
        // 両方のフィルターが有効な場合（周辺検索 + 駐車料金）
        if (hasNearbyFilter && hasParkingTimeFilter) {
          console.log('🎯 周辺検索 + 料金フィルター有効 - バックエンドで複合処理');
          // 周辺検索メソッドは既に料金計算も含んでいるので、これを使用
          parkingSpots = await SupabaseService.fetchParkingSpotsByNearbyFilter(
            searchRegion,
            currentFilter.parkingDuration.durationInMinutes,
            currentFilter.convenienceStoreRadius,
            currentFilter.hotSpringRadius,
            minElevation
          );
          console.log(`🅿️ 周辺検索+料金フィルター結果: ${parkingSpots.length}件`);
          displaySpots.push(...parkingSpots);
        }
        // 周辺検索のみ有効な場合
        else if (hasNearbyFilter) {
          console.log('🎯 周辺検索フィルターのみ有効 - バックエンドで処理');
          parkingSpots = await SupabaseService.fetchParkingSpotsByNearbyFilter(
            searchRegion,
            currentFilter.parkingDuration.durationInMinutes,
            currentFilter.convenienceStoreRadius,
            currentFilter.hotSpringRadius,
            minElevation
          );
          console.log(`🅿️ 周辺検索結果: ${parkingSpots.length}件`);
          displaySpots.push(...parkingSpots);
        }
        // 料金時間フィルターのみ有効な場合
        else if (hasParkingTimeFilter) {
          console.log('💰 料金時間フィルターのみ有効 - バックエンドで料金計算・ソート実行');
          parkingSpots = await SupabaseService.fetchParkingSpotsSortedByFee(
            searchRegion,
            currentFilter.parkingDuration.durationInMinutes,
            minElevation,
            currentFilter.parkingDuration.startDate // 入庫日時を渡す
          );
          console.log(`🅿️ 料金フィルター結果: ${parkingSpots.length}件`);
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

        // 周辺検索が有効な場合、関連施設も地図に表示
        if (currentFilter.nearbyFilterEnabled) {
          const nearbyFacilities: Spot[] = [];

          // 表示される駐車場（最大20件）
          const displayedParkingSpots = displaySpots
            .filter(spot => spot.category === 'コインパーキング')
            .slice(0, 20) as CoinParking[];

          console.log(`🎯 周辺検索モード: ${displayedParkingSpots.length}件の駐車場に紐付く施設を表示`);

          // 各駐車場にランキング番号を付与
          displayedParkingSpots.forEach((spot, index) => {
            spot.rank = index + 1;
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

            // 温泉のID収集
            if ((currentFilter.hotSpringRadius || 0) > 0 && parking.nearestHotspring) {
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
      
      // 重複を除去してからセット
      const uniqueDisplaySpots = Array.from(
        new Map(displaySpots.map(spot => [spot.id, spot])).values()
      );
      console.log(`🗺️ 合計${uniqueDisplaySpots.length}件を地図に表示（重複除去前: ${displaySpots.length}件）`);
      // すべての有効結果に対して、パネルで有効なチェック項目を AND で適用
      // 注意: 周辺検索フィルターは既にバックエンドで適用済みなので、フロントエンドでの再フィルタリングは不要
      // ただし、他のフィルター（標高など）は適用する必要がある
      let finalResults = uniqueDisplaySpots;

      // 標高フィルターのみフロントエンドで適用（周辺検索と駐車料金はバックエンドで処理済み）
      if (currentFilter.elevationFilterEnabled && !currentFilter.nearbyFilterEnabled && !currentFilter.parkingTimeFilterEnabled) {
        finalResults = SearchService.filterSpots(uniqueDisplaySpots, currentFilter, userLocation);
      }

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
      Alert.alert('位置情報', '現在地を取得できませんでした');
    }
  };
  
  const handleRegionChangeComplete = (region: Region) => {
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

  // 指定したスポットを、画面上部の可視地図領域(例:40%)の中央に配置するためのユーティリティ
  const animateMarkerToTopFractionCenter = (
    spot: Spot,
    visibleTopFraction = 0.4,
    options?: { zoomScale?: number }
  ) => {
    if (!mapRef.current || !mapRegion) return;
    const current = mapRegion;
    const targetLatDelta = (current.latitudeDelta || 0.01) * (options?.zoomScale ?? 1);
    const targetLngDelta = (current.longitudeDelta || 0.01) * (options?.zoomScale ?? 1);

    // 目標スクリーン位置は「上部領域(visibleTopFraction)の上下中央」= 全体の visibleTopFraction/2
    // 一般式: centerLat = markerLat - (0.5 - visibleTopFraction/2) * latDelta
    const desired = Math.max(0, Math.min(1, visibleTopFraction / 2));
    const centerLat = spot.lat - (0.5 - desired) * targetLatDelta; // 0.4のときは -0.3 * latDelta

    mapRef.current.animateToRegion(
      {
        latitude: centerLat,
        longitude: spot.lng,
        latitudeDelta: targetLatDelta,
        longitudeDelta: targetLngDelta,
      },
      500
    );
  };
  
  const handleMarkerPress = async (spot: Spot) => {
    selectSpot(spot);
    setShowDetailSheet(true);

    // 詳細シートが下半分相当を占有する想定 → 上半分(50%)の中央に配置
    if (spot) animateMarkerToTopFractionCenter(spot, 0.5);

    // コインパーキングの場合、最寄りの施設を地図に表示
    if (spot.category === 'コインパーキング') {
      const parkingSpot = spot as CoinParking;
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
        
        // 可視上部50%の上下中央(=全体の25%位置)にスポットを配置
        const desired = 0.5 / 2; // 0.25
        const offsetCenterLat = spot.lat - (0.5 - desired) * latDelta; // = spot.lat - 0.25*latDelta
        
        console.log('🗺️ 地図範囲調整:', {
          施設数: allSpots.length,
          駐車場位置: { lat: spot.lat, lng: spot.lng },
          地図中心: { lat: offsetCenterLat, lng: spot.lng },
          範囲: { latDelta, lngDelta }
        });
        mapRef.current.animateToRegion({
          latitude: offsetCenterLat,
          longitude: spot.lng,
          latitudeDelta: latDelta,
          longitudeDelta: lngDelta,
        }, 300);
      }
    } else {
      // コインパーキング以外の場合は最寄り施設をクリア
      setNearbyFacilities([]);
      
      // 通常の施設選択時の表示（上部50%の中央に配置）
      // センタリングは既にhandleMarkerPressで実行済み
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
      
      // 1. カテゴリーを表示順序で追加（後ろから順に：花火大会 → ガソリン → 温泉 → コンビニ）
      const categoryOrder = ['お祭り・花火大会', 'ガソリンスタンド', '温泉', 'コンビニ'];

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

            const marker = (
              <CustomMarker
                key={`${category}-${spot.id}`}
                spot={spot}
                onPress={() => handleMarkerPress(spot)}
                isSelected={false}
                isNearbyFacility={searchFilter.nearbyFilterEnabled && (category === 'コンビニ' || category === '温泉')}
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
    
      // 4. ランキング3位を追加
      try {
        const rank3 = parkingSpots.find(spot =>
          spot && spot.rank === 3 && selectedSpot?.id !== spot.id
        );
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
      } catch (rank3Error) {
        console.error('⚠️ Error processing rank 3 marker:', rank3Error);
      }
      
      // 5. ランキング2位を追加
      try {
        const rank2 = parkingSpots.find(spot =>
          spot && spot.rank === 2 && selectedSpot?.id !== spot.id
        );
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
      } catch (rank2Error) {
        console.error('⚠️ Error processing rank 2 marker:', rank2Error);
      }
      
      // 6. ランキング1位を追加（最前面）
      try {
        const rank1 = parkingSpots.find(spot =>
          spot && spot.rank === 1 && selectedSpot?.id !== spot.id
        );
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
      } catch (rank1Error) {
        console.error('⚠️ Error processing rank 1 marker:', rank1Error);
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
    <SafeAreaView style={styles.container}>
      <View style={styles.mapWrapper}>
        <CrossPlatformMap
          mapRef={mapRef}
          style={styles.map}
          region={mapRegion}
          onRegionChangeComplete={handleRegionChangeComplete}
          onMapReady={() => setIsMapReady(true)}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={false}
          rotateEnabled={false}
        >
          {isMapReady && !isLoading && (() => {
            try {
              const allMarkers = renderMarkers();
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
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>検索中...</Text>
            </View>
          </View>
        )}
      </View>
      
      <CompactBottomPanel 
        navigation={navigation} 
        onHeightChange={() => {}}
        onSearch={(isExpanded: boolean, newFilter?: any) => handleSearch(isExpanded, newFilter)}
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

            // 駐車場を画面上部40%の中央に配置するための計算
            const offsetCenterLat = spot.lat - (0.5 - 0.4/2) * latDelta; // = spot.lat - 0.3 * latDelta

            mapRef.current.animateToRegion({
              latitude: offsetCenterLat,
              longitude: spot.lng,  // 駐車場の経度を中心に
              latitudeDelta: latDelta,
              longitudeDelta: lngDelta,
            }, 300);
          } else if (mapRef.current) {
            // 施設がない場合は駐車場のみを表示（上部40%の中央に）
            const current = mapRegion;
            const latDelta = (current?.latitudeDelta || 0.01);
            const lngDelta = (current?.longitudeDelta || 0.01);
            const centerLat = spot.lat - (0.5 - 0.4/2) * latDelta; // = spot.lat - 0.3 * latDelta
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
});
