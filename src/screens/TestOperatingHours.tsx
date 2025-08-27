import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/config/supabase';
import { Colors } from '@/utils/constants';

export const TestOperatingHours: React.FC = () => {
  const [parkingData, setParkingData] = useState<any>(null);
  const [convenienceData, setConvenienceData] = useState<any>(null);
  const [hotSpringData, setHotSpringData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchTestData = async () => {
    setLoading(true);
    try {
      // 駐車場のテスト
      const { data: parkingRaw, error: parkingError } = await supabase
        .from('parking_spots')
        .select('*')
        .limit(3);
      
      if (parkingError) {
        console.error('Parking fetch error:', parkingError);
      } else {
        console.log('駐車場の生データ:', parkingRaw);
        setParkingData(parkingRaw);
      }

      // コンビニのテスト
      const { data: convenienceRaw, error: convenienceError } = await supabase
        .from('convenience_stores')
        .select('*')
        .limit(3);
      
      if (convenienceError) {
        console.error('Convenience store fetch error:', convenienceError);
      } else {
        console.log('コンビニの生データ:', convenienceRaw);
        setConvenienceData(convenienceRaw);
      }

      // 温泉のテスト
      const { data: hotSpringRaw, error: hotSpringError } = await supabase
        .from('hot_springs')
        .select('*')
        .limit(3);
      
      if (hotSpringError) {
        console.error('Hot spring fetch error:', hotSpringError);
      } else {
        console.log('温泉の生データ:', hotSpringRaw);
        setHotSpringData(hotSpringRaw);
      }

    } catch (error) {
      console.error('Test fetch error:', error);
      Alert.alert('エラー', 'データ取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestData();
  }, []);

  const renderDataItem = (item: any, category: string) => {
    const operatingHoursFields = ['operating_hours', 'operatingHours', 'hours', 'Hours'];
    const is24hFields = ['is24h', 'is_24h', 'is24hours'];
    
    return (
      <View style={styles.dataItem}>
        <Text style={styles.itemTitle}>{item.name || 'Name not found'}</Text>
        <Text style={styles.category}>{category}</Text>
        
        <Text style={styles.fieldTitle}>営業時間関連フィールド:</Text>
        {operatingHoursFields.map(field => (
          <Text key={field} style={styles.field}>
            {field}: {item[field] !== undefined ? String(item[field]) : 'undefined'}
          </Text>
        ))}
        
        <Text style={styles.fieldTitle}>24時間営業フィールド:</Text>
        {is24hFields.map(field => (
          <Text key={field} style={styles.field}>
            {field}: {item[field] !== undefined ? String(item[field]) : 'undefined'}
          </Text>
        ))}
        
        <Text style={styles.fieldTitle}>全フィールド:</Text>
        <Text style={styles.allFields}>{JSON.stringify(Object.keys(item), null, 2)}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>データ取得中...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>営業時間フィールドテスト</Text>
        
        <TouchableOpacity style={styles.refreshButton} onPress={fetchTestData}>
          <Text style={styles.refreshText}>再取得</Text>
        </TouchableOpacity>
        
        {parkingData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>駐車場データ</Text>
            {parkingData.map((item: any, index: number) => (
              <View key={index}>
                {renderDataItem(item, 'コインパーキング')}
              </View>
            ))}
          </View>
        )}
        
        {convenienceData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>コンビニデータ</Text>
            {convenienceData.map((item: any, index: number) => (
              <View key={index}>
                {renderDataItem(item, 'コンビニ')}
              </View>
            ))}
          </View>
        )}
        
        {hotSpringData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>温泉データ</Text>
            {hotSpringData.map((item: any, index: number) => (
              <View key={index}>
                {renderDataItem(item, '温泉')}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 20,
    textAlign: 'center',
  },
  loading: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
  refreshButton: {
    backgroundColor: Colors.primary,
    padding: 10,
    margin: 20,
    borderRadius: 8,
  },
  refreshText: {
    color: Colors.white,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  section: {
    margin: 10,
    padding: 10,
    backgroundColor: Colors.white,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: Colors.primary,
  },
  dataItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    marginBottom: 10,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  category: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  fieldTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 5,
    color: Colors.textPrimary,
  },
  field: {
    fontSize: 12,
    marginLeft: 10,
    color: Colors.textSecondary,
  },
  allFields: {
    fontSize: 10,
    marginLeft: 10,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
});