import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/utils/constants';

interface AboutScreenProps {
  navigation: any;
}

export const AboutScreen: React.FC<AboutScreenProps> = ({ navigation }) => {
  const openURL = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>このアプリについて</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* アプリ情報 */}
        <View style={styles.appInfo}>
          <View style={styles.appIcon}>
            <Text style={styles.appIconText}>🚗</Text>
          </View>
          <Text style={styles.appName}>車旅コンシェルジュ</Text>
          <Text style={styles.appVersion}>バージョン 1.0.0</Text>
          <Text style={styles.appDescription}>
            日本全国の駐車場を簡単に検索できる、
            {'\n'}ドライバーのためのコンシェルジュアプリ
          </Text>
        </View>

        {/* 機能紹介 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>主な機能</Text>
          
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text>🅿️</Text>
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>駐車場検索</Text>
              <Text style={styles.featureDescription}>
                全国のコインパーキングを地図上で簡単検索
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text>💰</Text>
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>料金計算</Text>
              <Text style={styles.featureDescription}>
                駐車時間に応じた料金を自動計算
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text>🏪</Text>
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>周辺施設</Text>
              <Text style={styles.featureDescription}>
                コンビニ、温泉、ガソリンスタンドも表示
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text>⭐</Text>
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>レビュー機能</Text>
              <Text style={styles.featureDescription}>
                ユーザーの口コミで最適な駐車場選び
              </Text>
            </View>
          </View>
        </View>

        {/* 開発チーム */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>開発チーム</Text>
          <View style={styles.teamInfo}>
            <Text style={styles.teamName}>CAR Concierge Team</Text>
            <Text style={styles.teamDescription}>
              より快適なドライブ体験を提供するため、
              {'\n'}日々アプリの改善に取り組んでいます
            </Text>
          </View>
        </View>

        {/* リンク */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>リンク</Text>
          
          <TouchableOpacity 
            style={styles.linkItem}
            onPress={() => openURL('https://trailfusionai.com/')}
          >
            <Ionicons name="globe-outline" size={20} color="#666" />
            <Text style={styles.linkText}>公式ウェブサイト</Text>
            <Ionicons name="open-outline" size={16} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkItem}
            onPress={() => openURL('https://twitter.com')}
          >
            <Ionicons name="logo-twitter" size={20} color="#1DA1F2" />
            <Text style={styles.linkText}>Twitter</Text>
            <Ionicons name="open-outline" size={16} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkItem}
            onPress={() => navigation.navigate('Terms')}
          >
            <Ionicons name="document-text-outline" size={20} color="#666" />
            <Text style={styles.linkText}>利用規約</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkItem}
            onPress={() => navigation.navigate('Privacy')}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color="#666" />
            <Text style={styles.linkText}>プライバシーポリシー</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* コピーライト */}
        <View style={styles.copyright}>
          <Text style={styles.copyrightText}>
            © 2025 CAR Concierge Team
          </Text>
          <Text style={styles.copyrightText}>
            All rights reserved.
          </Text>
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
  appInfo: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appIconText: {
    fontSize: 40,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  appVersion: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
  },
  appDescription: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 20,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
  },
  teamInfo: {
    paddingHorizontal: 20,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  teamDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  linkText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  copyright: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
  },
  copyrightText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
});