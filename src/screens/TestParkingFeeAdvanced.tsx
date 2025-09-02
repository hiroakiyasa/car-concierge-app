import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { ParkingFeeCalculator } from '../services/parking-fee.service';
import { CoinParking, ParkingDuration } from '../types';
import runParkingFeeTests from '../tests/parking-fee-test';

const TestParkingFeeAdvanced = () => {
  const [testResults, setTestResults] = useState<string>('');

  const runTests = () => {
    // コンソール出力をキャプチャ
    const originalLog = console.log;
    let output = '';
    
    console.log = (message: any, ...optionalParams: any[]) => {
      output += message + ' ' + optionalParams.join(' ') + '\n';
      originalLog(message, ...optionalParams);
    };

    // テスト実行
    runParkingFeeTests();

    // コンソールを元に戻す
    console.log = originalLog;

    setTestResults(output);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>高度な駐車料金計算テスト</Text>
      
      <TouchableOpacity style={styles.button} onPress={runTests}>
        <Text style={styles.buttonText}>テスト実行</Text>
      </TouchableOpacity>

      <ScrollView style={styles.resultsContainer}>
        <Text style={styles.results}>{testResults}</Text>
      </ScrollView>
    </View>
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
    marginTop: 40,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
  },
  results: {
    fontSize: 12,
    fontFamily: 'Courier New',
    lineHeight: 18,
  },
});

export default TestParkingFeeAdvanced;