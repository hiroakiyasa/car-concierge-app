import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet,
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SupabaseService } from '@/services/supabase.service';
import { Region } from '@/types';

export const TestDataFetch: React.FC = () => {
  const [results, setResults] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  // 東京駅周辺のテスト領域
  const testRegion: Region = {
    latitude: 35.6812,
    longitude: 139.7671,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };
  
  const testCategory = async (categoryName: string, fetchFunction: (region: Region) => Promise<any[]>) => {
    console.log(`\n========== ${categoryName}のテスト ==========`);
    setResults(prev => prev + `\n========== ${categoryName}のテスト ==========\n`);
    
    try {
      const data = await fetchFunction(testRegion);
      const resultText = `${categoryName}: ${data.length}件取得\n`;
      
      console.log(resultText);
      if (data.length > 0) {
        console.log('サンプルデータ:', data[0]);
        setResults(prev => prev + resultText + `サンプル: ${JSON.stringify(data[0], null, 2)}\n`);
      } else {
        setResults(prev => prev + resultText);
      }
      
      return data.length;
    } catch (error) {
      const errorText = `${categoryName}: エラー発生 - ${error}\n`;
      console.error(errorText);
      setResults(prev => prev + errorText);
      return 0;
    }
  };
  
  const runAllTests = async () => {
    setIsLoading(true);
    setResults('テスト開始...\n');
    
    const parkingCount = await testCategory('駐車場', region => SupabaseService.fetchParkingSpots(region));
    const convenienceCount = await testCategory('コンビニ', region => SupabaseService.fetchConvenienceStores(region));
    const gasCount = await testCategory('ガソリンスタンド', region => SupabaseService.fetchGasStations(region));
    const hotSpringCount = await testCategory('温泉', region => SupabaseService.fetchHotSprings(region));
    const festivalCount = await testCategory('お祭り・花火大会', region => SupabaseService.fetchFestivals(region));
    
    const summary = `
========== テスト結果サマリー ==========
駐車場: ${parkingCount}件
コンビニ: ${convenienceCount}件
ガソリンスタンド: ${gasCount}件
温泉: ${hotSpringCount}件
お祭り・花火大会: ${festivalCount}件
`;
    
    console.log(summary);
    setResults(prev => prev + summary);
    
    setIsLoading(false);
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>データ取得テスト</Text>
        <Text style={styles.subtitle}>東京駅周辺 (35.6812, 139.7671)</Text>
      </View>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={runAllTests}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'テスト中...' : '全カテゴリーをテスト'}
        </Text>
      </TouchableOpacity>
      
      {isLoading && <ActivityIndicator size="large" color="#007AFF" />}
      
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
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
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
    lineHeight: 18,
  },
});