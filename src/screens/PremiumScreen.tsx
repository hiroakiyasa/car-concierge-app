import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/useAuthStore';
import { Colors } from '@/utils/constants';

interface PremiumScreenProps {
  navigation: any;
}

export const PremiumScreen: React.FC<PremiumScreenProps> = ({ navigation }) => {
  const { user, updateProfile } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');

  const handleSubscribe = async () => {
    if (!user) {
      Alert.alert(
        'ログインが必要です',
        'プレミアムプランを購入するにはログインしてください',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: 'ログイン', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }

    Alert.alert(
      'プレミアムプランに登録',
      `${selectedPlan === 'monthly' ? '月額' : '年額'}プランに登録しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '登録する',
          onPress: async () => {
            // TODO: 実際の課金処理
            await updateProfile({ is_premium: true });
            Alert.alert(
              '登録完了',
              'プレミアムプランへの登録が完了しました',
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
          },
        },
      ]
    );
  };

  const features = [
    {
      icon: 'close-circle-outline',
      title: '広告非表示',
      description: '快適な操作環境を提供',
    },
    {
      icon: 'star-outline',
      title: '優先サポート',
      description: '24時間以内の返信保証',
    },
    {
      icon: 'analytics-outline',
      title: '詳細統計',
      description: '駐車履歴と費用分析',
    },
    {
      icon: 'download-outline',
      title: 'オフライン地図',
      description: '地図データのダウンロード',
    },
    {
      icon: 'notifications-outline',
      title: 'リアルタイム通知',
      description: '満車情報や料金変更の通知',
    },
    {
      icon: 'bookmark-outline',
      title: '無制限お気に入り',
      description: 'お気に入り登録数の制限なし',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>プレミアムプラン</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.premiumBadge}>
            <Ionicons name="diamond" size={40} color={Colors.warning} />
          </View>
          <Text style={styles.heroTitle}>プレミアムで{'\n'}もっと便利に</Text>
          <Text style={styles.heroDescription}>
            全ての機能を制限なく利用できます
          </Text>
        </View>

        {/* Plan Selection */}
        <View style={styles.planSection}>
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && styles.planCardActive,
            ]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <View style={styles.planHeader}>
              <Text style={[
                styles.planName,
                selectedPlan === 'monthly' && styles.planNameActive,
              ]}>
                月額プラン
              </Text>
              {selectedPlan === 'monthly' && (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                </View>
              )}
            </View>
            <Text style={[
              styles.planPrice,
              selectedPlan === 'monthly' && styles.planPriceActive,
            ]}>
              ¥480
              <Text style={styles.planPeriod}>/月</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'yearly' && styles.planCardActive,
            ]}
            onPress={() => setSelectedPlan('yearly')}
          >
            <View style={styles.planHeader}>
              <Text style={[
                styles.planName,
                selectedPlan === 'yearly' && styles.planNameActive,
              ]}>
                年額プラン
              </Text>
              <View style={styles.saveBadge}>
                <Text style={styles.saveText}>2ヶ月分お得</Text>
              </View>
              {selectedPlan === 'yearly' && (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                </View>
              )}
            </View>
            <Text style={[
              styles.planPrice,
              selectedPlan === 'yearly' && styles.planPriceActive,
            ]}>
              ¥4,800
              <Text style={styles.planPeriod}>/年</Text>
            </Text>
            <Text style={styles.planOriginalPrice}>
              通常 ¥5,760
            </Text>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>プレミアム機能</Text>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon as any} size={24} color={Colors.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Subscribe Button */}
        <View style={styles.subscribeSection}>
          <TouchableOpacity style={styles.subscribeButton} onPress={handleSubscribe}>
            <Text style={styles.subscribeButtonText}>
              {user?.is_premium ? 'プラン変更' : '今すぐ登録'}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.terms}>
            登録することで、
            <Text style={styles.termsLink} onPress={() => navigation.navigate('Terms')}>
              利用規約
            </Text>
            に同意したものとみなされます
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  hero: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  premiumBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  planSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  planCard: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  planCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#F0F7FF',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  planNameActive: {
    color: Colors.primary,
  },
  saveBadge: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  saveText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  selectedBadge: {
    marginLeft: 'auto',
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#666',
  },
  planPriceActive: {
    color: Colors.primary,
  },
  planPeriod: {
    fontSize: 16,
    fontWeight: 'normal',
  },
  planOriginalPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
    marginTop: 4,
  },
  featuresSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F7FF',
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
  subscribeSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  subscribeButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  terms: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  termsLink: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});