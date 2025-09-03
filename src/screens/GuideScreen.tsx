import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/utils/constants';

interface GuideScreenProps {
  navigation: any;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const GuideScreen: React.FC<GuideScreenProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('basic');

  const guides = {
    basic: {
      title: '基本的な使い方',
      content: [
        {
          step: '1',
          title: '地図で駐車場を探す',
          description: '地図を移動させると、その地域の駐車場が自動的に表示されます。',
          icon: '🗺️',
        },
        {
          step: '2',
          title: 'マーカーをタップ',
          description: '地図上のマーカーをタップすると、施設の基本情報が表示されます。',
          icon: '📍',
        },
        {
          step: '3',
          title: '詳細を確認',
          description: 'もう一度タップすると、料金や営業時間などの詳細情報を確認できます。',
          icon: '📋',
        },
      ],
    },
    parking: {
      title: '駐車料金で絞り込み',
      content: [
        {
          step: '1',
          title: '駐車料金タブを選択',
          description: '画面下部のパネルで「駐車料金」タブをタップします。',
          features: [
            '✓ 駐車時間の設定',
            '✓ 入庫・出庫時間の指定',
            '✓ 料金の自動計算',
          ],
          screenshot: {
            description: '駐車時間を1時間、10分から48時間まで細かく設定できます。',
            details: '入庫時間と出庫時間を設定すると、その時間帯に応じた料金が自動計算されます。',
          },
        },
        {
          step: '2',
          title: '駐車時間を設定',
          description: '「1時間」ボタンをタップして、希望の駐車時間を選択します。',
          tips: '• 24時間まで: 30分単位\n• 48時間まで: 1時間単位\n• 1時間まで: 10分単位',
        },
        {
          step: '3',
          title: '検索実行',
          description: '虫眼鏡ボタンをタップすると、設定した条件で駐車場が検索されます。',
        },
      ],
    },
    nearby: {
      title: '周辺施設検索',
      content: [
        {
          step: '1',
          title: '周辺検索タブを選択',
          description: '「周辺検索」タブをタップして、近隣施設の検索モードに切り替えます。',
          screenshot: {
            description: 'コンビニと温泉の距離をスライダーで調整できます。',
            details: '0mから1000mまで、施設ごとに検索範囲を細かく設定可能です。',
          },
        },
        {
          step: '2',
          title: '施設と距離を設定',
          description: 'コンビニや温泉など、検索したい施設のスライダーを動かして距離を設定します。',
          features: [
            '🏪 コンビニ: 0-1000m',
            '♨️ 温泉: 0-1000m',
            '⛽ ガソリンスタンド',
            '🎆 お祭り・花火大会',
          ],
        },
        {
          step: '3',
          title: '複合検索',
          description: '複数の条件を組み合わせて、理想的な駐車場を見つけることができます。',
        },
      ],
    },
    elevation: {
      title: '標高での絞り込み',
      content: [
        {
          step: '1',
          title: '標高タブを選択',
          description: '「標高」タブをタップして、標高による絞り込みモードに切り替えます。',
          screenshot: {
            description: '標高を0mから2000mまでスライダーで設定できます。',
            details: '30m地点には津波最大到達点の目安が表示され、温度差も自動計算されます。',
          },
        },
        {
          step: '2',
          title: '最低標高を設定',
          description: 'スライダーを動かして、希望の最低標高を設定します。',
          features: [
            '🌊 30m: 津波最大到達点',
            '🏔️ 高地での温度差表示',
            '📊 標高による絞り込み',
          ],
        },
        {
          step: '3',
          title: '温度差を確認',
          description: '標高による温度差（-0.6°C/100m）が自動的に計算・表示されます。',
        },
      ],
    },
    ranking: {
      title: 'ランキング機能',
      content: [
        {
          step: '1',
          title: 'ランキングボタン',
          description: '画面右下のトロフィーボタンをタップします。',
          screenshot: {
            description: '駐車料金ランキングTOP20が表示されます。',
            details: '金・銀・銅メダルで上位3位が強調表示され、料金が安い順にリストアップされます。',
          },
        },
        {
          step: '2',
          title: 'TOP20を確認',
          description: '現在の検索条件での料金が安い駐車場TOP20が表示されます。',
          features: [
            '🥇 1位: 金メダル表示',
            '🥈 2位: 銀メダル表示',
            '🥉 3位: 銅メダル表示',
            '💰 料金を一覧で比較',
          ],
        },
        {
          step: '3',
          title: '詳細確認',
          description: 'リストの項目をタップすると、その駐車場の詳細情報を確認できます。',
        },
      ],
    },
    tips: {
      title: 'お役立ちTips',
      content: [
        {
          step: '💡',
          title: '複数条件の組み合わせ',
          description: '各タブの右側にあるチェックボックスをオンにすると、複数の条件を組み合わせた検索ができます。',
        },
        {
          step: '💡',
          title: 'スワイプで切り替え',
          description: '下部パネルを左右にスワイプすると、タブを素早く切り替えられます。',
        },
        {
          step: '💡',
          title: 'お気に入り登録',
          description: 'よく使う駐車場は、詳細画面でハートボタンをタップしてお気に入り登録しましょう。',
        },
        {
          step: '💡',
          title: '現在地へ移動',
          description: '画面左下の現在地ボタンをタップすると、現在地周辺の駐車場を検索できます。',
        },
      ],
    },
  };

  const renderGuideContent = () => {
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
            
            {item.screenshot && (
              <View style={styles.screenshotSection}>
                <View style={styles.screenshotPlaceholder}>
                  <Ionicons name="image-outline" size={40} color="#999" />
                  <Text style={styles.screenshotDescription}>
                    {item.screenshot.description}
                  </Text>
                </View>
                {item.screenshot.details && (
                  <Text style={styles.screenshotDetails}>
                    {item.screenshot.details}
                  </Text>
                )}
              </View>
            )}
            
            {item.features && (
              <View style={styles.featuresBox}>
                {item.features.map((feature, idx) => (
                  <Text key={idx} style={styles.featureItem}>{feature}</Text>
                ))}
              </View>
            )}
            
            {item.tips && (
              <View style={styles.tipsBox}>
                <Text style={styles.tipsText}>{item.tips}</Text>
              </View>
            )}
            
            {item.icon && (
              <View style={styles.iconBox}>
                <Text style={styles.iconText}>{item.icon}</Text>
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
        <Text style={styles.headerTitle}>使い方ガイド</Text>
      </View>

      <View style={styles.tabContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          {Object.entries(guides).map(([key, guide]) => (
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
        </ScrollView>
      </View>

      {renderGuideContent()}

      <View style={styles.bottomNote}>
        <Text style={styles.noteText}>
          詳しい使い方は、各機能の画面でもヘルプアイコンから確認できます
        </Text>
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
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
  screenshotSection: {
    marginTop: 16,
  },
  screenshotPlaceholder: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  screenshotDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  screenshotDetails: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
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
  tipsBox: {
    backgroundColor: '#fff9e6',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  tipsText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  iconBox: {
    alignItems: 'center',
    marginTop: 16,
  },
  iconText: {
    fontSize: 40,
  },
  bottomNote: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  noteText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
});