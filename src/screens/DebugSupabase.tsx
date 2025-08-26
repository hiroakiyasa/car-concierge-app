import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/config/supabase';

export const DebugSupabase: React.FC = () => {
  const [results, setResults] = useState<string>('');
  
  const testQuery = async () => {
    setResults('テスト開始...\n\n');
    
    // 東京駅周辺の座標
    const testLat = 35.6812;
    const testLng = 139.7671;
    const delta = 0.02;
    
    const minLat = testLat - delta/2;
    const maxLat = testLat + delta/2;
    const minLng = testLng - delta/2;
    const maxLng = testLng + delta/2;
    
    try {
      // 1. 全てのテーブルをチェック
      const tables = [
        'parking_spots',
        'convenience_stores', 
        'gas_stations',
        'hot_springs',
        'festivals'
      ];
      
      for (const table of tables) {
        setResults(prev => prev + `\n========== ${table} ==========\n`);
        
        // まず全データ数を確認
        const { count: totalCount, error: countError } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (countError) {
          setResults(prev => prev + `❌ エラー: ${countError.message}\n`);
          continue;
        }
        
        setResults(prev => prev + `全データ数: ${totalCount}件\n`);
        
        // 範囲内のデータを取得
        const { data, count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact' })
          .gte('lat', minLat)
          .lte('lat', maxLat)
          .gte('lng', minLng)
          .lte('lng', maxLng)
          .limit(5);
        
        if (error) {
          setResults(prev => prev + `❌ 範囲検索エラー: ${error.message}\n`);
          continue;
        }
        
        setResults(prev => prev + `範囲内データ数: ${count}件\n`);
        
        if (data && data.length > 0) {
          setResults(prev => prev + `サンプルデータ:\n`);
          const sample = data[0];
          setResults(prev => prev + `  ID: ${sample.id}\n`);
          setResults(prev => prev + `  名前: ${sample.name}\n`);
          setResults(prev => prev + `  緯度: ${sample.lat}\n`);
          setResults(prev => prev + `  経度: ${sample.lng}\n`);
          if (sample.brand) {
            setResults(prev => prev + `  ブランド: ${sample.brand}\n`);
          }
        }
      }
      
      // 2. convenience_storesの詳細確認
      setResults(prev => prev + `\n========== convenience_stores 詳細確認 ==========\n`);
      
      const { data: conveniStores, error: conveniError } = await supabase
        .from('convenience_stores')
        .select('*')
        .limit(10);
      
      if (conveniError) {
        setResults(prev => prev + `❌ エラー: ${conveniError.message}\n`);
      } else if (conveniStores) {
        setResults(prev => prev + `取得できたコンビニ数: ${conveniStores.length}件\n`);
        if (conveniStores.length > 0) {
          // カラム名を確認
          const columns = Object.keys(conveniStores[0]);
          setResults(prev => prev + `カラム名: ${columns.join(', ')}\n`);
          
          // 最初の3件のデータを表示
          conveniStores.slice(0, 3).forEach((store, index) => {
            setResults(prev => prev + `\n[${index + 1}] ${store.name}\n`);
            setResults(prev => prev + `  位置: (${store.lat}, ${store.lng})\n`);
          });
        }
      }
      
    } catch (error) {
      setResults(prev => prev + `\n❌ 予期しないエラー: ${error}\n`);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Supabase デバッグ</Text>
      </View>
      
      <TouchableOpacity style={styles.button} onPress={testQuery}>
        <Text style={styles.buttonText}>テスト実行</Text>
      </TouchableOpacity>
      
      <ScrollView style={styles.results}>
        <Text style={styles.resultsText}>{results}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  button: {
    margin: 20,
    padding: 15,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  results: {
    flex: 1,
    margin: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  resultsText: {
    fontSize: 12,
    fontFamily: 'Courier',
  },
});