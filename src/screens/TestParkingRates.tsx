import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '@/config/supabase';

export const TestParkingRates: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchParkingData();
  }, []);

  const fetchParkingData = async () => {
    try {
      setLoading(true);
      
      // リパーク関連の駐車場を検索
      const { data: parkingData, error: fetchError } = await supabase
        .from('parking_spots')
        .select('id, name, rates, lat, lng')
        .or('name.ilike.%リパーク三崎町%,name.ilike.%リパーク水道橋%')
        .limit(10);

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setData(parkingData || []);
      
      // コンソールにも出力
      console.log('=== 駐車場データ取得結果 ===');
      (parkingData || []).forEach((spot: any) => {
        console.log(`\n【${spot.name}】`);
        console.log('ID:', spot.id);
        console.log('rates:', spot.rates);
        console.log('rates型:', typeof spot.rates);
        console.log('rates配列?:', Array.isArray(spot.rates));
        
        if (spot.rates && Array.isArray(spot.rates)) {
          spot.rates.forEach((rate: any, i: number) => {
            console.log(`  料金${i + 1}:`, rate);
          });
        }
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text>データ取得中...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>エラー: {error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>駐車場料金データテスト</Text>
      
      {data.length === 0 ? (
        <Text>データが見つかりませんでした</Text>
      ) : (
        data.map((spot) => (
          <View key={spot.id} style={styles.spotCard}>
            <Text style={styles.spotName}>{spot.name}</Text>
            <Text>ID: {spot.id}</Text>
            <Text>位置: {spot.lat?.toFixed(6)}, {spot.lng?.toFixed(6)}</Text>
            
            <View style={styles.ratesSection}>
              <Text style={styles.ratesTitle}>料金データ:</Text>
              {!spot.rates ? (
                <Text style={styles.noRates}>⚠️ rates フィールドが NULL</Text>
              ) : Array.isArray(spot.rates) && spot.rates.length > 0 ? (
                spot.rates.map((rate: any, i: number) => (
                  <View key={i} style={styles.rateItem}>
                    <Text>タイプ: {rate.type}</Text>
                    <Text>時間: {rate.minutes}分</Text>
                    <Text>料金: {rate.price}円</Text>
                    {rate.timeRange && <Text>時間帯: {rate.timeRange}</Text>}
                  </View>
                ))
              ) : (
                <Text style={styles.emptyRates}>⚠️ rates配列が空</Text>
              )}
            </View>
          </View>
        ))
      )}
      
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>統計:</Text>
        <Text>全データ数: {data.length}</Text>
        <Text>ratesがNULL: {data.filter(s => !s.rates).length}</Text>
        <Text>rates配列が空: {data.filter(s => Array.isArray(s.rates) && s.rates.length === 0).length}</Text>
        <Text>有効なrates: {data.filter(s => Array.isArray(s.rates) && s.rates.length > 0).length}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  spotCard: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  spotName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  ratesSection: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
  },
  ratesTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  rateItem: {
    marginVertical: 5,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#007AFF',
  },
  noRates: {
    color: 'red',
    fontWeight: 'bold',
  },
  emptyRates: {
    color: 'orange',
    fontWeight: 'bold',
  },
  error: {
    color: 'red',
    fontSize: 16,
  },
  summary: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});