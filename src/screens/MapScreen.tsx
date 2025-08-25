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
      const spots = await SupabaseService.fetchSpotsByCategories(
        mapRegion,
        searchFilter.selectedCategories
      );
      
      // Sort parking spots by calculated fee or base rate
      const sortedSpots = spots.sort((a, b) => {
        if (a.category === 'コインパーキング' && b.category === 'コインパーキング') {
          const parkingA = a as CoinParking;
          const parkingB = b as CoinParking;
          
          const priceA = parkingA.rates?.[0]?.price || 0;
          const priceB = parkingB.rates?.[0]?.price || 0;
          
          return priceA - priceB;
        }
        return 0;
      });
      
      // Add rank to parking spots
      let parkingRank = 1;
      const rankedSpots = sortedSpots.map(spot => {
        if (spot.category === 'コインパーキング' && parkingRank <= 20) {
          return { ...spot, rank: parkingRank++ };
        }
        return spot;
      });
      
      setSearchResults(rankedSpots.slice(0, 100)); // Limit to 100 markers
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
    setMapRegion(region);
  };
  
  const handleMarkerPress = (spot: Spot) => {
    selectSpot(spot);
    navigation.navigate('SpotDetail');
  };
  
  const renderMarkers = () => {
    return searchResults.slice(0, 100).map((spot) => (
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
        
        {searchResults.length > 100 && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningTitle}>スポットが多すぎます</Text>
            <Text style={styles.warningText}>地図を拡大してください</Text>
            <Text style={styles.warningCount}>
              ({searchResults.length}件中100件表示)
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
  warningContainer: {
    position: 'absolute',
    top: '60%',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.warning,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  warningCount: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});