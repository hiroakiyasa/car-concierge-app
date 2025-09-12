import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/useAuthStore';
import { supabase } from '@/config/supabase';

export const TestAuth = () => {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('testpass123');
  const [name, setName] = useState('Test User');
  const [logs, setLogs] = useState<string[]>([]);
  
  const { 
    user, 
    isAuthenticated, 
    isLoading,
    isInitialized,
    signUp, 
    signIn, 
    signOut,
    signInWithGoogle,
    checkAuth 
  } = useAuthStore();

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testSignUp = async () => {
    addLog('📝 新規登録テスト開始');
    const { error } = await signUp(email, password, name);
    if (error) {
      addLog(`❌ 新規登録失敗: ${error}`);
      Alert.alert('新規登録失敗', error);
    } else {
      addLog('✅ 新規登録成功');
      
      // セッション確認
      const { data: session } = await supabase.auth.getSession();
      addLog(`📌 セッション状態: ${session.session ? '有効' : '無効'}`);
      
      // プロフィール確認
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.session?.user?.id || '')
        .single();
      addLog(`👤 プロフィール: ${profile ? 'あり' : 'なし'}`);
    }
  };

  const testSignIn = async () => {
    addLog('🔑 ログインテスト開始');
    const { error } = await signIn(email, password);
    if (error) {
      addLog(`❌ ログイン失敗: ${error}`);
      Alert.alert('ログイン失敗', error);
    } else {
      addLog('✅ ログイン成功');
      
      // セッション確認
      const { data: session } = await supabase.auth.getSession();
      addLog(`📌 セッション状態: ${session.session ? '有効' : '無効'}`);
      addLog(`📧 ユーザーEmail: ${session.session?.user?.email || 'なし'}`);
    }
  };

  const testSignOut = async () => {
    addLog('🚪 ログアウトテスト開始');
    await signOut();
    addLog('✅ ログアウト完了');
    
    // セッション確認
    const { data: session } = await supabase.auth.getSession();
    addLog(`📌 セッション状態: ${session.session ? '有効' : '無効'}`);
  };

  const testCheckAuth = async () => {
    addLog('🔍 認証状態確認開始');
    await checkAuth();
    addLog('✅ 認証状態確認完了');
    
    // Store状態を表示
    addLog(`🏪 Store - 認証済み: ${isAuthenticated}`);
    addLog(`🏪 Store - ユーザー: ${user?.email || 'なし'}`);
    
    // Supabaseセッション確認
    const { data: session } = await supabase.auth.getSession();
    addLog(`🔐 Supabase - セッション: ${session.session ? '有効' : '無効'}`);
  };

  const testGoogleSignIn = async () => {
    addLog('🔑 Google認証テスト開始');
    const { error } = await signInWithGoogle();
    if (error) {
      addLog(`❌ Google認証失敗: ${error}`);
      Alert.alert('Google認証失敗', error);
    } else {
      addLog('✅ Google認証成功');
      
      // セッション確認
      const { data: session } = await supabase.auth.getSession();
      addLog(`📌 セッション状態: ${session.session ? '有効' : '無効'}`);
      addLog(`📧 ユーザーEmail: ${session.session?.user?.email || 'なし'}`);
      
      // プロフィール確認
      if (session.session?.user?.id) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.session.user.id)
          .single();
        addLog(`👤 プロフィール: ${profile ? 'あり' : 'なし'}`);
        if (profile) {
          addLog(`📝 表示名: ${profile.display_name || '未設定'}`);
        }
      }
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>認証テスト画面</Text>
        
        {/* 現在の状態 */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>現在の状態</Text>
          <Text style={styles.statusText}>初期化済み: {isInitialized ? '✅' : '❌'}</Text>
          <Text style={styles.statusText}>読み込み中: {isLoading ? '⏳' : '✅'}</Text>
          <Text style={styles.statusText}>認証済み: {isAuthenticated ? '✅' : '❌'}</Text>
          <Text style={styles.statusText}>ユーザー: {user?.email || 'なし'}</Text>
        </View>

        {/* 入力フォーム */}
        <View style={styles.form}>
          <Text style={styles.label}>メールアドレス</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          
          <Text style={styles.label}>パスワード</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          
          <Text style={styles.label}>名前（新規登録用）</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* テストボタン */}
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.button} onPress={testSignUp}>
            <Text style={styles.buttonText}>📝 新規登録テスト</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={testSignIn}>
            <Text style={styles.buttonText}>🔑 ログインテスト</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, styles.googleButton]} onPress={testGoogleSignIn}>
            <Text style={styles.buttonText}>🔑 Google認証テスト</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={testSignOut}>
            <Text style={styles.buttonText}>🚪 ログアウトテスト</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={testCheckAuth}>
            <Text style={styles.buttonText}>🔍 認証状態確認</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearLogs}>
            <Text style={styles.buttonText}>🗑 ログクリア</Text>
          </TouchableOpacity>
        </View>

        {/* ログ表示 */}
        <View style={styles.logsContainer}>
          <Text style={styles.logsTitle}>実行ログ</Text>
          <ScrollView style={styles.logs}>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logText}>{log}</Text>
            ))}
            {logs.length === 0 && (
              <Text style={styles.noLogs}>ログなし</Text>
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 14,
    marginVertical: 2,
  },
  form: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  buttons: {
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  logsContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    height: 300,
  },
  logsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  logs: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
  },
  logText: {
    fontSize: 12,
    marginVertical: 2,
    fontFamily: 'Courier',
  },
  noLogs: {
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
});