import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

export const TestMapBounds: React.FC = () => {
  const mapRef = useRef<MapView>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentRegion, setCurrentRegion] = useState<Region>({
    latitude: 35.6812,
    longitude: 139.7671,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  // テストマーカー（四隅と中心）
  const getTestMarkers = (region: Region) => {
    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
    return [
      { id: 'center', lat: latitude, lng: longitude, title: '中心' },
      { id: 'ne', lat: latitude + latitudeDelta/2, lng: longitude + longitudeDelta/2, title: '北東' },
      { id: 'nw', lat: latitude + latitudeDelta/2, lng: longitude - longitudeDelta/2, title: '北西' },
      { id: 'se', lat: latitude - latitudeDelta/2, lng: longitude + longitudeDelta/2, title: '南東' },
      { id: 'sw', lat: latitude - latitudeDelta/2, lng: longitude - longitudeDelta/2, title: '南西' },
    ];
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const testGetMapBoundaries = async () => {
    if (!mapRef.current) {
      addLog('MapRef が利用できません');
      return;
    }

    try {
      const boundaries = await mapRef.current.getMapBoundaries();
      if (boundaries) {
        addLog(`getMapBoundaries結果:`);
        addLog(`  北東: ${boundaries.northEast.latitude.toFixed(6)}, ${boundaries.northEast.longitude.toFixed(6)}`);
        addLog(`  南西: ${boundaries.southWest.latitude.toFixed(6)}, ${boundaries.southWest.longitude.toFixed(6)}`);
        
        // regionから計算した値と比較
        const calcNE = {
          lat: currentRegion.latitude + currentRegion.latitudeDelta/2,
          lng: currentRegion.longitude + currentRegion.longitudeDelta/2
        };
        const calcSW = {
          lat: currentRegion.latitude - currentRegion.latitudeDelta/2,
          lng: currentRegion.longitude - currentRegion.longitudeDelta/2
        };
        
        addLog(`onRegionChangeからの計算値:`);
        addLog(`  北東: ${calcNE.lat.toFixed(6)}, ${calcNE.lng.toFixed(6)}`);
        addLog(`  南西: ${calcSW.lat.toFixed(6)}, ${calcSW.lng.toFixed(6)}`);
        
        // 差分を計算
        const latDiff = Math.abs(boundaries.northEast.latitude - calcNE.lat);
        const lngDiff = Math.abs(boundaries.northEast.longitude - calcNE.lng);
        addLog(`差分: 緯度=${latDiff.toFixed(6)}, 経度=${lngDiff.toFixed(6)}`);
      }
    } catch (error) {
      addLog(`エラー: ${error}`);
    }
  };

  const handleRegionChangeComplete = (region: Region) => {
    setCurrentRegion(region);
    addLog(`onRegionChangeComplete:`);
    addLog(`  中心: ${region.latitude.toFixed(6)}, ${region.longitude.toFixed(6)}`);
    addLog(`  Delta: ${region.latitudeDelta.toFixed(6)}, ${region.longitudeDelta.toFixed(6)}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={currentRegion}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation={true}
        >
          {getTestMarkers(currentRegion).map(marker => (
            <Marker
              key={marker.id}
              coordinate={{ latitude: marker.lat, longitude: marker.lng }}
              title={marker.title}
              description={`${marker.lat.toFixed(4)}, ${marker.lng.toFixed(4)}`}
            />
          ))}
        </MapView>
      </View>
      
      <View style={styles.controls}>
        <TouchableOpacity style={styles.button} onPress={testGetMapBoundaries}>
          <Text style={styles.buttonText}>境界をテスト</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => setLogs([])}>
          <Text style={styles.buttonText}>ログクリア</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.logContainer}>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>{log}</Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#f0f0f0',
  },
  button: {
    flex: 1,
    padding: 10,
    marginHorizontal: 5,
    backgroundColor: '#007AFF',
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  logContainer: {
    height: 200,
    backgroundColor: '#000',
    padding: 10,
  },
  logText: {
    color: '#0f0',
    fontSize: 11,
    fontFamily: 'monospace',
  },
});