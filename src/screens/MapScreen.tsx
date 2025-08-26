import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  Text,
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
import { MapControls } from '@/components/Map/MapControls';
import { BottomFilterPanel } from '@/components/FilterPanel/BottomFilterPanel';
import { Colors } from '@/utils/constants';
import { Region, Spot, CoinParking } from '@/types';

interface MapScreenProps {
  navigation: any;
}

export const MapScreen: React.FC<MapScreenProps> = ({ navigation }) => {
  const mapRef = useRef<MapView>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  
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
    if (isMapReady && mapRegion.latitude !== 0 && mapRegion.longitude !== 0) {
      // 初回のみ自動検索を実行
      const timer = setTimeout(() => {
        handleSearch();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isMapReady]);
  
  const initializeLocation = async () => {
    const location = await LocationService.getCurrentLocation();
    if (location) {
      setUserLocation(location);
      setMapRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
  };
  
  const handleSearch = async () => {
    setIsLoading(true);
    try {
      // 最新のmapRegionを使用（onRegionChangeCompleteで更新済み）
      let currentRegion = mapRegion;
      
      // mapRefが利用可能なら、getMapBoundariesで再確認
      if (mapRef.current && mapRef.current.getMapBoundaries) {
        try {
          const mapBoundaries = await mapRef.current.getMapBoundaries();
          if (mapBoundaries && mapBoundaries.northEast && mapBoundaries.southWest) {
            // 境界から正確な範囲を計算
            const north = mapBoundaries.northEast.latitude;
            const south = mapBoundaries.southWest.latitude;
            const east = mapBoundaries.northEast.longitude;
            const west = mapBoundaries.southWest.longitude;
            
            // 中心とdeltaを計算
            currentRegion = {
              latitude: (north + south) / 2,
              longitude: (east + west) / 2,
              latitudeDelta: Math.abs(north - south),
              longitudeDelta: Math.abs(east - west),
            };
            
            console.log('地図境界取得成功:', {
              北: north,
              南: south,
              東: east,
              西: west
            });
          }
        } catch (err) {
          console.log('地図境界取得失敗、onRegionChangeCompleteのregionを使用', err);
        }
      }
      
      // 実際の検索範囲を計算
      const searchBounds = {
        北端: currentRegion.latitude + (currentRegion.latitudeDelta / 2),
        南端: currentRegion.latitude - (currentRegion.latitudeDelta / 2),
        東端: currentRegion.longitude + (currentRegion.longitudeDelta / 2),
        西端: currentRegion.longitude - (currentRegion.longitudeDelta / 2),
      };
      
      // 検索範囲をログ出力
      console.log('検索範囲:', {
        中心緯度: currentRegion.latitude.toFixed(6),
        中心経度: currentRegion.longitude.toFixed(6),
        緯度幅: currentRegion.latitudeDelta.toFixed(6),
        経度幅: currentRegion.longitudeDelta.toFixed(6),
        北端: searchBounds.北端.toFixed(6),
        南端: searchBounds.南端.toFixed(6),
        東端: searchBounds.東端.toFixed(6),
        西端: searchBounds.西端.toFixed(6),
      });
      
      // コインパーキングのみを検索
      const selectedCategoriesSet = new Set(['コインパーキング']);
      const spots = await SupabaseService.fetchSpotsByCategories(
        currentRegion,
        selectedCategoriesSet
      );
      
      // 駐車場のみをフィルタリング
      const parkingSpots = spots.filter(spot => spot.category === 'コインパーキング') as CoinParking[];
      
      // 料金でソート（駐車時間を考慮）
      const sortedParkingSpots = parkingSpots.sort((a, b) => {
        const feeA = ParkingFeeCalculator.calculateFee(a, searchFilter.parkingDuration);
        const feeB = ParkingFeeCalculator.calculateFee(b, searchFilter.parkingDuration);
        return feeA - feeB;
      });
      
      // 上位20件にランキングを付与
      const top20ParkingSpots = sortedParkingSpots.slice(0, 20).map((spot, index) => ({
        ...spot,
        rank: index + 1,
        calculatedFee: ParkingFeeCalculator.calculateFee(spot, searchFilter.parkingDuration)
      }));
      
      console.log(`検索結果: ${spots.length}件から上位20件を表示`);
      if (top20ParkingSpots.length > 0) {
        console.log('最安値TOP3:', top20ParkingSpots.slice(0, 3).map(s => 
          `${s.rank}位: ${s.name} ¥${s.calculatedFee}`
        ));
      }
      
      setSearchResults(top20ParkingSpots);
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
    } else {
      Alert.alert('位置情報', '現在地を取得できませんでした');
    }
  };
  
  const handleRegionChangeComplete = (region: Region) => {
    // 地図の移動が完了したら最新のregionを保存
    setMapRegion(region);
    console.log('地図移動完了:', {
      中心緯度: region.latitude.toFixed(6),
      中心経度: region.longitude.toFixed(6),
      緯度幅: region.latitudeDelta.toFixed(6),
      経度幅: region.longitudeDelta.toFixed(6),
    });
  };
  
  const handleMarkerPress = (spot: Spot) => {
    selectSpot(spot);
    navigation.navigate('SpotDetail');
  };
  
  const renderMarkers = () => {
    // 上位20件の駐車場のみを表示
    return searchResults.map((spot) => (
      <CustomMarker
        key={spot.id}
        spot={spot}
        rank={spot.rank}
        onPress={() => handleMarkerPress(spot)}
      />
    ));
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
          region={mapRegion}
          onRegionChangeComplete={handleRegionChangeComplete}
          onMapReady={() => setIsMapReady(true)}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={false}
        >
          {isMapReady && renderMarkers()}
        </MapView>
        
        <CategoryButtons />
        
        <MapControls
          onSearch={handleSearch}
          onLocationPress={handleLocationPress}
          isLoading={isLoading}
        />
        
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
      
      <BottomFilterPanel navigation={navigation} />
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