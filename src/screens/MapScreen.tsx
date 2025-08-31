import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, PROVIDER_DEFAULT, Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMainStore } from '@/stores/useMainStore';
import { LocationService } from '@/services/location.service';
import { SupabaseService } from '@/services/supabase.service';
import { SearchService } from '@/services/search.service';
import { ParkingFeeCalculator } from '@/services/parking-fee.service';
import { CustomMarker } from '@/components/Map/CustomMarker';
import { CategoryButtons } from '@/components/Map/CategoryButtons';
import { CompactBottomPanel } from '@/components/FilterPanel/CompactBottomPanel';
import { SpotDetailBottomSheet } from '@/screens/SpotDetailBottomSheet';
import { RankingListModal } from '@/screens/RankingListModal';
import { Colors } from '@/utils/constants';
import { Region, Spot, CoinParking } from '@/types';
import { Ionicons } from '@expo/vector-icons';

interface MapScreenProps {
  navigation: any;
}

export const MapScreen: React.FC<MapScreenProps> = ({ navigation }) => {
  const mapRef = useRef<MapView>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [shouldReopenRanking, setShouldReopenRanking] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(100);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
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
      
      // パネルの状態に応じて検索範囲を計算
      let searchRegion = { ...fullScreenRegion };
      
      // パネルが展開されている場合、表示範囲を調整
      if (isExpanded) {
        // 画面の1/3がパネルで隠れている
        const visibleRatio = 0.67; // 2/3が見える
        // 南端を調整（北側にシフト）
        const adjustedLatitudeDelta = fullScreenRegion.latitudeDelta * visibleRatio;
        const centerShift = (fullScreenRegion.latitudeDelta - adjustedLatitudeDelta) / 2;
        
        searchRegion = {
          latitude: fullScreenRegion.latitude + centerShift,
          longitude: fullScreenRegion.longitude,
          latitudeDelta: adjustedLatitudeDelta,
          longitudeDelta: fullScreenRegion.longitudeDelta,
        };
        
        console.log('📦 パネル展開時の検索範囲調整（画面の2/3）');
      } else {
        console.log('📦 パネル最小時の検索範囲（全体）');
      }
      
      console.log('🎯 検索にSupabaseに送るregion:', {
        中心緯度: searchRegion.latitude.toFixed(6),
        中心経度: searchRegion.longitude.toFixed(6),
        緯度幅: searchRegion.latitudeDelta.toFixed(6),
        経度幅: searchRegion.longitudeDelta.toFixed(6),
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
      
      // カテゴリー別に処理
      let displaySpots: Spot[] = [];
      
      if (selectedCategories.has('コインパーキング')) {
        // 駐車場のみをフィルタリング（標高フィルタリングは既にSupabaseで実行済み）
        let parkingSpots = spots.filter(spot => spot.category === 'コインパーキング') as CoinParking[];
        
        console.log(`🅿️ 検索された駐車場: ${parkingSpots.length}件`);
        
        // 周辺検索フィルターが有効な場合
        if (searchFilter.nearbyFilterEnabled) {
          const convenienceLimit = searchFilter.convenienceStoreRadius || 0;
          const hotspringLimit = searchFilter.hotSpringRadius || 0;
          
          console.log(`📝 フィルター設定: nearbyFilterEnabled=${searchFilter.nearbyFilterEnabled}, convenienceStoreRadius=${searchFilter.convenienceStoreRadius}, hotSpringRadius=${searchFilter.hotSpringRadius}`);
          
          if (convenienceLimit > 0 || hotspringLimit > 0) {
            console.log(`🔍 周辺検索: コンビニ ${convenienceLimit}m以内, 温泉 ${hotspringLimit}m以内`);
            
            // 指定距離内にある駐車場のみフィルタリング
            let debugCount = 0;
            parkingSpots = parkingSpots.filter((spot, index) => {
              // 両方の条件が設定されている場合はAND条件
              let matchConvenience = true;
              let matchHotspring = true;
              
              if (convenienceLimit > 0) {
                if (spot.nearestConvenienceStore) {
                  // distance_m フィールドを使用
                  const distance = (spot.nearestConvenienceStore as any).distance_m || 
                                   spot.nearestConvenienceStore.distance || 
                                   999999;
                  
                  matchConvenience = distance <= convenienceLimit;
                  
                  // 最初の5件をデバッグ
                  if (index < 5) {
                    console.log(`🏪 駐車場[${index}] ${spot.name}:`, {
                      データ: spot.nearestConvenienceStore,
                      距離: distance,
                      制限: convenienceLimit,
                      マッチ: matchConvenience
                    });
                    if (distance <= 800) {
                      debugCount++;
                    }
                  }
                } else {
                  matchConvenience = false;
                  if (index < 5) {
                    console.log(`🏪 駐車場[${index}] ${spot.name}: コンビニデータなし`);
                  }
                }
              }
              
              if (hotspringLimit > 0) {
                if (spot.nearestHotspring) {
                  // distance_m フィールドを使用
                  const distance = (spot.nearestHotspring as any).distance_m || 
                                   spot.nearestHotspring.distance || 
                                   999999;
                    
                  matchHotspring = distance <= hotspringLimit;
                  if (index < 5) {
                    console.log(`♨️ 駐車場[${index}] ${spot.name}:`, {
                      データ: spot.nearestHotspring,
                      距離: distance,
                      制限: hotspringLimit,
                      マッチ: matchHotspring
                    });
                  }
                } else {
                  matchHotspring = false;
                }
              }
              
              // 両方設定されている場合はAND、片方だけの場合はその条件のみ
              if (convenienceLimit > 0 && hotspringLimit > 0) {
                return matchConvenience && matchHotspring;
              } else if (convenienceLimit > 0) {
                return matchConvenience;
              } else {
                return matchHotspring;
              }
            });
            
            if (debugCount > 0) {
              console.log(`⚠️ 800m以内にコンビニがある駐車場が${debugCount}件見つかりました`);
            }
            
            // 全体の統計情報を表示
            const totalWithConvenience = parkingSpots.filter(s => s.nearestConvenienceStore).length;
            const totalWithHotspring = parkingSpots.filter(s => s.nearestHotspring).length;
            console.log(`📊 全駐車場統計: コンビニデータ有り=${totalWithConvenience}件, 温泉データ有り=${totalWithHotspring}件`);
            
            if (totalWithConvenience === 0 && convenienceLimit > 0) {
              console.error('❌ エラー: コンビニデータが1件も見つかりません。データベースの問題の可能性があります。');
            }
            
            console.log(`🎯 周辺検索後: ${parkingSpots.length}件の駐車場`);
          }
        }
        
        // 300件を超える場合は警告を表示
        if (parkingSpots.length >= 300) {
          Alert.alert(
            '検索範囲が広すぎます',
            '地図を拡大してください。',
            [{ text: 'OK', style: 'default' }]
          );
        }
        
        // 全ての駐車場に対して料金を計算
        const parkingSpotsWithFee = parkingSpots.map(spot => ({
          ...spot,
          calculatedFee: ParkingFeeCalculator.calculateFee(spot, searchFilter.parkingDuration)
        }));
        
        // 料金でソート（安い順）
        const sortedParkingSpots = parkingSpotsWithFee.sort((a, b) => a.calculatedFee - b.calculatedFee);
        
        // 上位20件にランキングを付与
        const top20ParkingSpots = sortedParkingSpots.slice(0, 20).map((spot, index) => ({
          ...spot,
          rank: index + 1
        }));
        
        displaySpots.push(...top20ParkingSpots);
        
        console.log(`🏆 上位20件の駐車場を地図に表示`);
        
        // 周辺検索が有効な場合、関連施設も地図に表示
        if (searchFilter.nearbyFilterEnabled) {
          const convenienceIds = new Set<string>();
          const hotspringIds = new Set<string>();
          
          // 表示される駐車場に紐づく施設のIDを収集
          top20ParkingSpots.forEach(parking => {
            if ((searchFilter.convenienceStoreRadius || 0) > 0 && parking.nearestConvenienceStore) {
              const convenienceStore = parking.nearestConvenienceStore;
              const id = convenienceStore.id || (convenienceStore as any).store_id;
              const distance = (convenienceStore as any).distance_m || convenienceStore.distance;
              const name = convenienceStore.name || (convenienceStore as any).store_name || 'Unknown';
              
              if (id) {
                convenienceIds.add(id);
                console.log(`🏪 駐車場 ${parking.name} の最寄りコンビニ: ID=${id}, 距離=${distance}m`);
              }
            }
            if ((searchFilter.hotSpringRadius || 0) > 0 && parking.nearestHotspring) {
              const hotspring = parking.nearestHotspring;
              const id = hotspring.id || (hotspring as any).spring_id;
              const distance = (hotspring as any).distance_m || hotspring.distance;
              const name = hotspring.name || (hotspring as any).spring_name || 'Unknown';
              
              if (id) {
                hotspringIds.add(id);
                console.log(`♨️ 駐車場 ${parking.name} の最寄り温泉: ID=${id}, 距離=${distance}m`);
              }
            }
          });
          
          // コンビニを表示に追加
          if (convenienceIds.size > 0) {
            const relatedStores = spots.filter(spot => {
              if (spot.category !== 'コンビニ') return false;
              
              // IDマッチングのバリエーションを試す
              const spotId = spot.id;
              const spotIdString = (spot as any).idString;
              
              // デバッグ用
              if (spots.filter(s => s.category === 'コンビニ').indexOf(spot) < 3) {
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
              console.log('利用可能なコンビニ:', spots.filter(s => s.category === 'コンビニ').slice(0, 5).map(s => ({ id: s.id, idString: (s as any).idString })));
            }
            
            displaySpots.push(...relatedStores);
            console.log(`🏪 関連コンビニ: ${relatedStores.length}件を表示 (対象ID: ${convenienceIds.size}件)`);
          }
          
          // 温泉を表示に追加
          if (hotspringIds.size > 0) {
            const relatedSprings = spots.filter(spot => {
              if (spot.category !== '温泉') return false;
              
              const spotId = spot.id;
              
              // デバッグ用
              if (spots.filter(s => s.category === '温泉').indexOf(spot) < 3) {
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
              console.log('利用可能な温泉:', spots.filter(s => s.category === '温泉').slice(0, 5).map(s => ({ id: s.id })));
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
          const convenienceStores = spots.filter(spot => spot.category === 'コンビニ');
          nonParkingSpots.push(...convenienceStores);
          displaySpots.push(...convenienceStores);
          console.log(`🏂 コンビニ: ${convenienceStores.length}件`);
        }
        
        if (selectedCategories.has('ガソリンスタンド')) {
          const gasStations = spots.filter(spot => spot.category === 'ガソリンスタンド');
          nonParkingSpots.push(...gasStations);
          displaySpots.push(...gasStations);
          console.log(`⛽ ガソリンスタンド: ${gasStations.length}件`);
        }
        
        if (selectedCategories.has('温泉')) {
          const hotSprings = spots.filter(spot => spot.category === '温泉');
          nonParkingSpots.push(...hotSprings);
          displaySpots.push(...hotSprings);
          console.log(`♨️ 温泉: ${hotSprings.length}件`);
        }
        
        if (selectedCategories.has('お祭り・花火大会')) {
          const festivals = spots.filter(spot => spot.category === 'お祭り・花火大会');
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
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('エラー', '検索中にエラーが発生しました');
    } finally {
      setIsLoading(false);
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
                              parkingSpot.nearestConvenienceStore.store_id ||
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
                           parkingSpot.nearestHotspring.spring_id ||
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
    const markers = [];
    
    // 1. まず通常の検索結果を追加（選択されていない駐車場）
    searchResults.forEach((spot) => {
      if (selectedSpot?.id !== spot.id) {
        markers.push(
          <CustomMarker
            key={spot.id}
            spot={spot}
            rank={spot.rank}
            calculatedFee={(spot as any).calculatedFee}
            onPress={() => handleMarkerPress(spot)}
            isSelected={false}
          />
        );
      }
    });
    
    // 2. 最寄り施設を追加（コンビニと温泉）
    if (nearbyFacilities.length > 0) {
      console.log('🗺️ 最寄り施設をマーカーに追加:', nearbyFacilities.length, '件');
      nearbyFacilities.forEach((facility) => {
        console.log(`  - ${facility.category}: ${facility.name} (${facility.lat}, ${facility.lng})`);
        markers.push(
          <CustomMarker
            key={`nearby-${facility.id}`}
            spot={facility}
            onPress={() => {}} // 最寄り施設はタップ無効
            isSelected={false}
            isNearbyFacility={true} // 最寄り施設フラグを追加
          />
        );
      });
    }
    
    // 3. 最後に選択された駐車場を追加（最前面に表示）
    if (selectedSpot) {
      markers.push(
        <CustomMarker
          key={`selected-${selectedSpot.id}`}
          spot={selectedSpot}
          rank={selectedSpot.rank}
          calculatedFee={(selectedSpot as any).calculatedFee}
          onPress={() => handleMarkerPress(selectedSpot)}
          isSelected={true}
        />
      );
    }
    
    return markers;
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
        
        {/* 現在地ボタン */}
        <TouchableOpacity
          style={styles.locationButton}
          onPress={handleLocationPress}
          activeOpacity={0.8}
        >
          <Ionicons name="navigate-circle" size={32} color={Colors.primary} />
        </TouchableOpacity>
        
        {/* ランキングボタン */}
        <TouchableOpacity
          style={styles.rankingButton}
          onPress={() => setShowRankingModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="trophy" size={24} color={Colors.white} />
        </TouchableOpacity>
        
        {searchResults.length > 0 && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultText}>
              上位{searchResults.length}件を表示中
            </Text>
          </View>
        )}
        
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}
      </View>
      
      <CompactBottomPanel 
        navigation={navigation} 
        onHeightChange={(height, isExpanded) => {
          setBottomPanelHeight(height);
          setIsPanelExpanded(isExpanded);
        }}
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
                                  spot.nearestConvenienceStore.store_id ||
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
                               spot.nearestHotspring.spring_id ||
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
          // 詳細を閉じた後、必要に応じてランキングを再表示
          if (shouldReopenRanking) {
            setTimeout(() => {
              setShowRankingModal(true);
              setShouldReopenRanking(false);
            }, 300);
          }
        }}
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
  locationButton: {
    position: 'absolute',
    bottom: 190,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  rankingButton: {
    position: 'absolute',
    bottom: 130,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});