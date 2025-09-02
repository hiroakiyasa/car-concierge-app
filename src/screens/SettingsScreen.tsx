import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/utils/constants';
import { useAuthStore } from '@/stores/useAuthStore';

interface SettingsScreenProps {
  navigation: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState(true);
  const [locationServices, setLocationServices] = useState(true);
  const [autoSearch, setAutoSearch] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);

  const handleClearCache = () => {
    Alert.alert(
      'キャッシュをクリア',
      'アプリのキャッシュをクリアしてもよろしいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'クリア',
          onPress: () => {
            Alert.alert('完了', 'キャッシュをクリアしました');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'アカウント削除',
      'アカウントを削除すると、全てのデータが失われます。本当に削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            Alert.alert('確認', 'もう一度確認します。本当にアカウントを削除しますか？', [
              { text: 'キャンセル', style: 'cancel' },
              {
                text: '削除する',
                style: 'destructive',
                onPress: () => {
                  // TODO: アカウント削除処理
                  Alert.alert('完了', 'アカウントを削除しました');
                  navigation.navigate('Map');
                },
              },
            ]);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>設定</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 通知設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>通知設定</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>プッシュ通知</Text>
              <Text style={styles.settingDescription}>
                お気に入りスポットの更新情報を受け取る
              </Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#767577', true: Colors.primary }}
            />
          </View>
        </View>

        {/* 位置情報設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>位置情報</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>位置情報サービス</Text>
              <Text style={styles.settingDescription}>
                現在地の取得を許可する
              </Text>
            </View>
            <Switch
              value={locationServices}
              onValueChange={setLocationServices}
              trackColor={{ false: '#767577', true: Colors.primary }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>自動検索</Text>
              <Text style={styles.settingDescription}>
                地図移動時に自動で検索する
              </Text>
            </View>
            <Switch
              value={autoSearch}
              onValueChange={setAutoSearch}
              trackColor={{ false: '#767577', true: Colors.primary }}
            />
          </View>
        </View>

        {/* データ設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>データ</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>オフラインモード</Text>
              <Text style={styles.settingDescription}>
                キャッシュされたデータのみを使用
              </Text>
            </View>
            <Switch
              value={offlineMode}
              onValueChange={setOfflineMode}
              trackColor={{ false: '#767577', true: Colors.primary }}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleClearCache}>
            <Text style={styles.buttonText}>キャッシュをクリア</Text>
          </TouchableOpacity>
        </View>

        {/* アカウント設定 */}
        {user && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>アカウント</Text>
            
            <TouchableOpacity 
              style={styles.linkItem}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <Text style={styles.linkText}>プロフィール編集</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.linkItem}
              onPress={() => navigation.navigate('ChangePassword')}
            >
              <Text style={styles.linkText}>パスワード変更</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.dangerButton]}
              onPress={handleDeleteAccount}
            >
              <Text style={styles.dangerButtonText}>アカウントを削除</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* アプリ情報 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>アプリ情報</Text>
          
          <TouchableOpacity 
            style={styles.linkItem}
            onPress={() => navigation.navigate('Terms')}
          >
            <Text style={styles.linkText}>利用規約</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkItem}
            onPress={() => navigation.navigate('Privacy')}
          >
            <Text style={styles.linkText}>プライバシーポリシー</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <View style={styles.versionInfo}>
            <Text style={styles.versionLabel}>バージョン</Text>
            <Text style={styles.versionText}>1.0.0</Text>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#999',
  },
  button: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  dangerButtonText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  linkText: {
    fontSize: 16,
    color: '#333',
  },
  versionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  versionLabel: {
    fontSize: 16,
    color: '#333',
  },
  versionText: {
    fontSize: 16,
    color: '#999',
  },
});