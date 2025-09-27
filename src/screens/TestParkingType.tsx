import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { supabase } from '@/config/supabase';

export const TestParkingType = () => {
  const [results, setResults] = useState<any[]>([]);
  const [searchName, setSearchName] = useState('トラストパーク京橋');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testParkingType = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. まず全てのフィールドを取得してtypeフィールドの存在を確認
      const { data: sampleData, error: sampleError } = await supabase
        .from('parking_spots')
        .select('*')
        .limit(5);

      if (sampleError) throw sampleError;

      console.log('サンプルデータ（全フィールド）:', sampleData);

      // 2. 特定の駐車場名で検索
      const { data: specificData, error: specificError } = await supabase
        .from('parking_spots')
        .select('id, name, type, lat, lng, elevation')
        .ilike('name', `%${searchName}%`)
        .limit(10);

      if (specificError) throw specificError;

      // 3. typeフィールドが存在するデータだけを取得
      const { data: typeData, error: typeError } = await supabase
        .from('parking_spots')
        .select('id, name, type')
        .not('type', 'is', null)
        .limit(10);

      if (typeError) throw typeError;

      // 4. typeフィールドの値の種類を集計
      const { data: distinctTypes, error: distinctError } = await supabase
        .from('parking_spots')
        .select('type')
        .not('type', 'is', null)
        .limit(100);

      if (distinctError) throw distinctError;

      const typeCount: Record<string, number> = {};
      distinctTypes?.forEach((item: any) => {
        const type = item.type || 'null';
        typeCount[type] = (typeCount[type] || 0) + 1;
      });

      setResults([
        { title: 'サンプルデータ（5件）', data: sampleData },
        { title: `「${searchName}」での検索結果`, data: specificData },
        { title: 'typeフィールドが存在するデータ（10件）', data: typeData },
        { title: 'typeフィールドの値の種類', data: typeCount }
      ]);

    } catch (err: any) {
      console.error('エラー:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkTableSchema = async () => {
    setLoading(true);
    setError(null);

    try {
      // テーブルのカラム情報を取得
      const { data, error } = await supabase
        .rpc('get_table_columns', { table_name: 'parking_spots' })
        .single();

      if (error) {
        // RPCが存在しない場合は、直接SQLを実行
        const { data: columns, error: columnsError } = await supabase
          .from('parking_spots')
          .select('*')
          .limit(1);

        if (columnsError) throw columnsError;

        const columnNames = columns && columns.length > 0
          ? Object.keys(columns[0])
          : [];

        setResults([{
          title: 'テーブルのカラム一覧',
          data: columnNames.map(name => ({ column_name: name }))
        }]);
      } else {
        setResults([{ title: 'テーブルスキーマ', data }]);
      }
    } catch (err: any) {
      console.error('エラー:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>駐車場タイプ フィールドテスト</Text>

      <View style={styles.searchSection}>
        <TextInput
          style={styles.input}
          value={searchName}
          onChangeText={setSearchName}
          placeholder="駐車場名を入力"
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={testParkingType}>
          <Text style={styles.buttonText}>駐車場タイプを確認</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={checkTableSchema}>
          <Text style={styles.buttonText}>テーブルスキーマを確認</Text>
        </TouchableOpacity>
      </View>

      {loading && <Text style={styles.loading}>読み込み中...</Text>}
      {error && <Text style={styles.error}>エラー: {error}</Text>}

      {results.map((section, index) => (
        <View key={index} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.dataContainer}>
            {typeof section.data === 'object' && !Array.isArray(section.data) ? (
              // オブジェクト（typeCount）の場合
              Object.entries(section.data).map(([key, value]) => (
                <Text key={key} style={styles.dataText}>
                  {key}: {value}件
                </Text>
              ))
            ) : (
              // 配列の場合
              Array.isArray(section.data) && section.data.map((item, idx) => (
                <View key={idx} style={styles.dataItem}>
                  <Text style={styles.dataText}>
                    {JSON.stringify(item, null, 2)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  searchSection: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  loading: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
  },
  error: {
    fontSize: 14,
    color: 'red',
    marginVertical: 10,
    padding: 10,
    backgroundColor: '#ffe6e6',
    borderRadius: 8,
  },
  section: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  dataContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    padding: 8,
  },
  dataItem: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dataText: {
    fontSize: 14,
    color: '#555',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});