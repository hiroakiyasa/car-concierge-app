import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/utils/constants';

interface GuideScreenProps {
  navigation: any;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ガイド画像のプレースホルダー（実際の画像パスに置き換え）
const guideImages = {
  mainScreen: require('../assets/guide/main_screen.png'),
  parkingFilter: require('../assets/guide/parking_filter.png'),
  nearbySearch: require('../assets/guide/nearby_search.png'),
  elevationFilter: require('../assets/guide/elevation_filter.png'),
  ranking: require('../assets/guide/ranking.png'),
};

export const GuideScreen: React.FC<GuideScreenProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<Set<string>>(new Set());

  const toggleFAQ = (id: string) => {
    const newExpanded = new Set(expandedFAQ);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFAQ(newExpanded);
  };

  const faqData = [
    {
      id: '1',
      question: '駐車料金はどのように計算されますか？',
      answer: '各駐車場の料金体系（基本料金、最大料金、夜間料金など）に基づいて、指定した駐車時間から自動的に計算されます。',
    },
    {
      id: '2',
      question: '現在地が取得できません',
      answer: '設定アプリから位置情報サービスを有効にし、本アプリに位置情報の使用を許可してください。',
    },
    {
      id: '3',
      question: 'お気に入りの上限はありますか？',
      answer: '無料プランでは50件まで、プレミアムプランでは無制限でお気に入り登録できます。',
    },
    {
      id: '4',
      question: 'オフラインで使えますか？',
      answer: '基本的にはインターネット接続が必要ですが、一度表示した地図データは一時的にキャッシュされます。',
    },
  ];

  const guides = {
    overview: {
      title: 'アプリの概要',
      content: [
        {
          step: '1',
          title: 'トップ画面の説明',
          description: '車旅コンシェルジュのメイン画面では、地図上に様々な施設が表示されます。',
          image: 'mainScreen',
          features: [
            '🗺️ 地図表示エリア：タップやピンチで操作',
            '🔽 下部パネル：検索条件の設定',
            '🏷️ カテゴリーボタン：表示する施設の選択',
            '📍 現在地ボタン：現在地へ移動',
            '🏆 ランキングボタン：料金TOP20表示',
          ],
        },
        {
          step: '2',
          title: '施設アイコンの意味',
          description: '地図上の各アイコンが示す施設タイプを理解しましょう。',
          icons: [
            { icon: '🅿️', label: 'コインパーキング', color: '#007AFF' },
            { icon: '🏪', label: 'コンビニ', color: '#00C851' },
            { icon: '♨️', label: '温泉', color: '#FF6B35' },
            { icon: '⛽', label: 'ガソリンスタンド', color: '#FFD93D' },
            { icon: '🎆', label: 'お祭り・花火大会', color: '#E91E63' },
          ],
        },
      ],
    },
    parking: {
      title: '駐車料金検索',
      content: [
        {
          step: '1',
          title: '駐車料金タブの使い方',
          description: '下部パネルの「駐車料金」タブで、駐車時間に応じた料金検索ができます。',
          image: 'parkingFilter',
          details: [
            '駐車時間ボタン：1時間をタップして時間選択',
            '入庫時間：開始時刻を設定',
            '出庫時間：終了時刻を設定',
            'チェックボックス：他の条件と組み合わせ',
          ],
        },
        {
          step: '2',
          title: '時間設定のコツ',
          description: '駐車時間は用途に応じて細かく設定できます。',
          tips: [
            '💡 短時間利用：10分単位（1時間まで）',
            '💡 半日利用：30分単位（24時間まで）',
            '💡 長期利用：1時間単位（48時間まで）',
            '💡 夜間料金：18:00以降の料金体系に注意',
          ],
        },
      ],
    },
    nearby: {
      title: '周辺施設検索',
      content: [
        {
          step: '1',
          title: '周辺検索の設定',
          description: '「周辺検索」タブで、駐車場から指定距離内の施設を検索できます。',
          image: 'nearbySearch',
          settings: [
            'コンビニ：0〜1000mで範囲指定',
            '温泉：0〜1000mで範囲指定',
            'スライダー操作で細かく調整',
            '複数施設の同時検索が可能',
          ],
        },
        {
          step: '2',
          title: '効果的な使い方',
          description: '目的に応じて検索範囲を調整しましょう。',
          examples: [
            '🚶 徒歩圏内：100m以内',
            '🚗 車で移動：500m程度',
            '📍 広域検索：1000mまで',
          ],
        },
      ],
    },
    elevation: {
      title: '標高フィルター',
      content: [
        {
          step: '1',
          title: '標高による絞り込み',
          description: '「標高」タブで、指定標高以上の場所を検索できます。',
          image: 'elevationFilter',
          features: [
            '📊 0〜2000mの範囲で設定可能',
            '🌊 30m：津波最大到達点の目安',
            '🌡️ 温度差：100mごとに-0.6°C',
            '🏔️ 高地での気温を自動計算',
          ],
        },
      ],
    },
    ranking: {
      title: 'ランキング機能',
      content: [
        {
          step: '1',
          title: '料金ランキングTOP20',
          description: '画面右下のトロフィーボタンで、料金が安い順のランキングを表示します。',
          image: 'ranking',
          features: [
            '🥇 金メダル：最安値',
            '🥈 銀メダル：2位',
            '🥉 銅メダル：3位',
            '📊 一覧で料金比較',
            '📍 タップで地図に表示',
          ],
        },
      ],
    },
  };

  const renderGuideContent = () => {
    if (activeTab === 'faq') {
      return (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.guideTitle}>よくある質問</Text>
          
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="質問を検索..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {faqData.filter(item =>
            item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.answer.toLowerCase().includes(searchQuery.toLowerCase())
          ).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.faqItem}
              onPress={() => toggleFAQ(item.id)}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{item.question}</Text>
                <Ionicons
                  name={expandedFAQ.has(item.id) ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#999"
                />
              </View>
              {expandedFAQ.has(item.id) && (
                <Text style={styles.faqAnswer}>{item.answer}</Text>
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => Alert.alert('お問い合わせ', 'support@trailfusionai.com までご連絡ください')}
          >
            <Ionicons name="mail-outline" size={20} color={Colors.primary} />
            <Text style={styles.contactButtonText}>お問い合わせ</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }

    const guide = guides[activeTab];
    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.guideTitle}>{guide.title}</Text>
        
        {guide.content.map((item, index) => (
          <View key={index} style={styles.guideItem}>
            <View style={styles.guideHeader}>
              <View style={styles.stepCircle}>
                <Text style={styles.stepText}>{item.step}</Text>
              </View>
              <Text style={styles.guideItemTitle}>{item.title}</Text>
            </View>
            
            <Text style={styles.guideDescription}>{item.description}</Text>
            
            {item.image && (
              <View style={styles.imageContainer}>
                {/* 実際の画像を表示 */}
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={60} color="#ccc" />
                  <Text style={styles.imagePlaceholderText}>
                    {item.image === 'mainScreen' && 'メイン画面のスクリーンショット'}
                    {item.image === 'parkingFilter' && '駐車料金フィルターの画面'}
                    {item.image === 'nearbySearch' && '周辺検索の画面'}
                    {item.image === 'elevationFilter' && '標高フィルターの画面'}
                    {item.image === 'ranking' && 'ランキング画面'}
                  </Text>
                </View>
              </View>
            )}
            
            {item.features && (
              <View style={styles.featuresBox}>
                {item.features.map((feature, idx) => (
                  <Text key={idx} style={styles.featureItem}>{feature}</Text>
                ))}
              </View>
            )}
            
            {item.icons && (
              <View style={styles.iconsGrid}>
                {item.icons.map((iconItem, idx) => (
                  <View key={idx} style={styles.iconItem}>
                    <View style={[styles.iconCircle, { backgroundColor: iconItem.color + '20' }]}>
                      <Text style={styles.iconEmoji}>{iconItem.icon}</Text>
                    </View>
                    <Text style={styles.iconLabel}>{iconItem.label}</Text>
                  </View>
                ))}
              </View>
            )}
            
            {item.details && (
              <View style={styles.detailsBox}>
                {item.details.map((detail, idx) => (
                  <Text key={idx} style={styles.detailItem}>• {detail}</Text>
                ))}
              </View>
            )}
            
            {item.tips && (
              <View style={styles.tipsBox}>
                {item.tips.map((tip, idx) => (
                  <Text key={idx} style={styles.tipItem}>{tip}</Text>
                ))}
              </View>
            )}
            
            {item.settings && (
              <View style={styles.settingsBox}>
                {item.settings.map((setting, idx) => (
                  <View key={idx} style={styles.settingItem}>
                    <View style={styles.settingBullet} />
                    <Text style={styles.settingText}>{setting}</Text>
                  </View>
                ))}
              </View>
            )}
            
            {item.examples && (
              <View style={styles.examplesBox}>
                {item.examples.map((example, idx) => (
                  <Text key={idx} style={styles.exampleItem}>{example}</Text>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>使い方ガイド・ヘルプ</Text>
      </View>

      <View style={styles.tabContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
            onPress={() => setActiveTab('overview')}
          >
            <Ionicons name="apps" size={16} color={activeTab === 'overview' ? '#fff' : '#666'} />
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
              概要
            </Text>
          </TouchableOpacity>
          
          {Object.entries(guides).slice(1).map(([key, guide]) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, activeTab === key && styles.activeTab]}
              onPress={() => setActiveTab(key)}
            >
              <Text style={[styles.tabText, activeTab === key && styles.activeTabText]}>
                {guide.title}
              </Text>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'faq' && styles.activeTab]}
            onPress={() => setActiveTab('faq')}
          >
            <Ionicons name="help-circle" size={16} color={activeTab === 'faq' ? '#fff' : '#666'} />
            <Text style={[styles.tabText, activeTab === 'faq' && styles.activeTabText]}>
              FAQ
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {renderGuideContent()}
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
  tabContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    gap: 4,
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  guideTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  guideItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  guideItemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  guideDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 16,
  },
  imageContainer: {
    marginVertical: 16,
  },
  imagePlaceholder: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
  },
  featuresBox: {
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
  },
  featureItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 16,
  },
  iconItem: {
    alignItems: 'center',
    width: (SCREEN_WIDTH - 80) / 3,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconEmoji: {
    fontSize: 24,
  },
  iconLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  detailsBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
  },
  detailItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  tipsBox: {
    backgroundColor: '#fff9e6',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
  },
  tipItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  settingsBox: {
    marginTop: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  settingBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 7,
    marginRight: 12,
  },
  settingText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  examplesBox: {
    backgroundColor: '#e8f4fd',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
  },
  exampleItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  faqItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    lineHeight: 20,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 20,
    gap: 8,
  },
  contactButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
});