import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ParkingFeeCalculator } from '@/services/parking-fee.service';
import { CoinParking, ParkingRate, ParkingDuration } from '@/types';

export const TestParkingFee: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [customMinutes, setCustomMinutes] = useState('60');

  // テストケース1: 10分100円の料金体系
  const testCase1: CoinParking = {
    id: 'test1',
    name: '新日石ビルガレージ（10分100円）',
    lat: 0,
    lng: 0,
    category: 'コインパーキング',
    originalFees: '10分 ¥100, 最大料金 (24時間) ¥5000',
    rates: [
      { id: '1', type: 'base', minutes: 10, price: 100 },
      { id: '2', type: 'max', minutes: 1440, price: 5000 }, // 24時間
    ],
  };

  // テストケース2: 30分200円の料金体系
  const testCase2: CoinParking = {
    id: 'test2',
    name: 'タイムズ駐車場（30分200円）',
    lat: 0,
    lng: 0,
    category: 'コインパーキング',
    originalFees: '30分 ¥200',
    rates: [
      { id: '1', type: 'base', minutes: 30, price: 200 },
    ],
  };

  // テストケース3: 20分150円、最大料金1200円（3時間まで）
  const testCase3: CoinParking = {
    id: 'test3',
    name: '三井のリパーク（20分150円）',
    lat: 0,
    lng: 0,
    category: 'コインパーキング',
    originalFees: '20分 ¥150, 最大料金 (3時間) ¥1200',
    rates: [
      { id: '1', type: 'base', minutes: 20, price: 150 },
      { id: '2', type: 'max', minutes: 180, price: 1200 }, // 3時間
    ],
  };

  // テストケース4: ratesが空だがoriginalFeesがある
  const testCase4: CoinParking = {
    id: 'test4',
    name: 'originalFeesのみ（10分100円）',
    lat: 0,
    lng: 0,
    category: 'コインパーキング',
    originalFees: '10分100円',
    rates: [],
  };

  // テストケース5: 15分100円
  const testCase5: CoinParking = {
    id: 'test5',
    name: '15分100円の駐車場',
    lat: 0,
    lng: 0,
    category: 'コインパーキング',
    originalFees: '15分 ¥100',
    rates: [
      { id: '1', type: 'base', minutes: 15, price: 100 },
    ],
  };

  const runTests = () => {
    const results: string[] = [];
    const testMinutes = parseInt(customMinutes) || 60;
    
    // テスト用のParkingDuration
    const createDuration = (minutes: number): ParkingDuration => {
      const now = new Date();
      const endDate = new Date(now.getTime() + minutes * 60 * 1000);
      return {
        startDate: now,
        endDate: endDate,
        duration: minutes * 60,
        durationInMinutes: minutes,
        formattedDuration: `${Math.floor(minutes / 60)}時間${minutes % 60}分`,
      };
    };

    const testCases = [
      testCase1,
      testCase2,
      testCase3,
      testCase4,
      testCase5,
    ];

    const testDurations = [
      10,  // 10分
      30,  // 30分
      60,  // 1時間
      90,  // 1時間30分
      120, // 2時間
      180, // 3時間
      240, // 4時間
      testMinutes, // カスタム時間
    ];

    results.push('=== 駐車料金計算テスト結果 ===\n');

    testCases.forEach((testCase) => {
      results.push(`\n📍 ${testCase.name}`);
      results.push(`料金体系: ${testCase.originalFees || 'なし'}`);
      results.push(`rates配列: ${testCase.rates.length}個`);
      results.push('―――――――――――――――');
      
      testDurations.forEach((minutes) => {
        const duration = createDuration(minutes);
        const fee = ParkingFeeCalculator.calculateFee(testCase, duration);
        
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const timeStr = hours > 0 ? `${hours}時間${mins > 0 ? mins + '分' : ''}` : `${mins}分`;
        
        results.push(`  ${timeStr.padEnd(10)} → ¥${fee}`);
      });
    });

    // 特定のテストケース: 10分100円で1時間の場合
    results.push('\n\n=== 詳細テスト: 10分100円で1時間 ===');
    const duration60 = createDuration(60);
    const fee60 = ParkingFeeCalculator.calculateFee(testCase1, duration60);
    results.push(`期待値: ¥600 (10分×6回)`);
    results.push(`計算結果: ¥${fee60}`);
    results.push(fee60 === 600 ? '✅ テスト成功！' : '❌ テスト失敗');

    setTestResults(results);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>駐車料金計算アルゴリズムテスト</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>カスタム駐車時間（分）:</Text>
          <TextInput
            style={styles.input}
            value={customMinutes}
            onChangeText={setCustomMinutes}
            keyboardType="numeric"
            placeholder="60"
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={runTests}>
          <Text style={styles.buttonText}>テスト実行</Text>
        </TouchableOpacity>

        {testResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.results}>
              {testResults.join('\n')}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  results: {
    fontSize: 14,
    fontFamily: 'Courier',
    lineHeight: 20,
  },
});