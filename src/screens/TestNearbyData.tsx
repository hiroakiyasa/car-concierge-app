import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Button } from 'react-native';
import { supabase } from '@/config/supabase';

export const TestNearbyData: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testQuery = async () => {
    setLoading(true);
    try {
      // 直接Supabaseからデータを取得
      const { data: rawData, error } = await supabase
        .from('parking_spots')
        .select('id, name, nearest_convenience_store, nearest_hotspring')
        .limit(5);

      if (error) {
        console.error('Query error:', error);
        setData({ error: error.message });
      } else {
        console.log('Raw data from Supabase:', rawData);
        
        // データ構造を詳細に確認
        const analyzed = rawData?.map(spot => {
          let convenienceData = null;
          let hotspringData = null;
          
          // nearest_convenience_storeの解析
          if (spot.nearest_convenience_store) {
            try {
              if (typeof spot.nearest_convenience_store === 'string') {
                convenienceData = JSON.parse(spot.nearest_convenience_store);
              } else {
                convenienceData = spot.nearest_convenience_store;
              }
            } catch (e) {
              convenienceData = { parseError: e.message };
            }
          }
          
          // nearest_hotspringの解析
          if (spot.nearest_hotspring) {
            try {
              if (typeof spot.nearest_hotspring === 'string') {
                hotspringData = JSON.parse(spot.nearest_hotspring);
              } else {
                hotspringData = spot.nearest_hotspring;
              }
            } catch (e) {
              hotspringData = { parseError: e.message };
            }
          }
          
          return {
            id: spot.id,
            name: spot.name,
            nearest_convenience_store: {
              raw: spot.nearest_convenience_store,
              type: typeof spot.nearest_convenience_store,
              parsed: convenienceData,
              hasDistance: convenienceData?.distance !== undefined
            },
            nearest_hotspring: {
              raw: spot.nearest_hotspring,
              type: typeof spot.nearest_hotspring,
              parsed: hotspringData,
              hasDistance: hotspringData?.distance !== undefined
            }
          };
        });
        
        setData(analyzed);
      }
    } catch (err) {
      console.error('Test query error:', err);
      setData({ error: err.message });
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Nearby Data Test</Text>
      <Button title="Test Query" onPress={testQuery} disabled={loading} />
      
      {loading && <Text>Loading...</Text>}
      
      {data && (
        <View style={styles.results}>
          <Text style={styles.subtitle}>Results:</Text>
          <Text style={styles.json}>{JSON.stringify(data, null, 2)}</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 50,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  results: {
    marginTop: 20,
  },
  json: {
    fontSize: 10,
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
  },
});