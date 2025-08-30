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
  const [bottomPanelHeight, setBottomPanelHeight] = useState(100);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  
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
      
      const spots = await SupabaseService.fetchSpotsByCategories(
        searchRegion,
        selectedCategories,
        minElevation
      );
      
      // カテゴリー別に処理
      let displaySpots: Spot[] = [];
      
      if (selectedCategories.has('コインパーキング')) {
        // 駐車場のみをフィルタリング（標高フィルタリングは既にSupabaseで実行済み）
        let parkingSpots = spots.filter(spot => spot.category === 'コインパーキング') as CoinParking[];
        
        console.log(`🅿️ 検索された駐車場: ${parkingSpots.length}件`);
        
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
      }
      
      // その他のカテゴリーのスポットを全て表示
      if (selectedCategories.has('コンビニ')) {
        const convenienceStores = spots.filter(spot => spot.category === 'コンビニ');
        displaySpots.push(...convenienceStores);
        console.log(`🏂 コンビニ: ${convenienceStores.length}件`);
      }
      
      if (selectedCategories.has('ガソリンスタンド')) {
        const gasStations = spots.filter(spot => spot.category === 'ガソリンスタンド');
        displaySpots.push(...gasStations);
        console.log(`⛽ ガソリンスタンド: ${gasStations.length}件`);
      }
      
      if (selectedCategories.has('温泉')) {
        const hotSprings = spots.filter(spot => spot.category === '温泉');
        displaySpots.push(...hotSprings);
        console.log(`♨️ 温泉: ${hotSprings.length}件`);
      }
      
      if (selectedCategories.has('お祭り・花火大会')) {
        const festivals = spots.filter(spot => spot.category === 'お祭り・花火大会');
        displaySpots.push(...festivals);
        console.log(`🎆 お祭り・花火大会: ${festivals.length}件`);
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
  
  const handleMarkerPress = (spot: Spot) => {
    selectSpot(spot);
    setShowDetailSheet(true);
  };
  
  const handleRankingSpotSelect = (spot: CoinParking) => {
    selectSpot(spot);
    setShowDetailSheet(true);
    
    // 選択した駐車場にズーム
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: spot.lat,
        longitude: spot.lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500);
    }
  };
  
  const renderMarkers = () => {
    // 上位20件の駐車場のみを表示
    return searchResults.map((spot) => (
      <CustomMarker
        key={spot.id}
        spot={spot}
        rank={spot.rank}
        calculatedFee={(spot as any).calculatedFee}
        onPress={() => handleMarkerPress(spot)}
      />
    ));
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
      
      <SpotDetailBottomSheet 
        visible={showDetailSheet}
        onClose={() => setShowDetailSheet(false)}
      />
      
      <RankingListModal
        visible={showRankingModal}
        onClose={() => setShowRankingModal(false)}
        onSpotSelect={handleRankingSpotSelect}
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