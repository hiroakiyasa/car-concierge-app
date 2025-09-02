import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/utils/constants';

interface HelpScreenProps {
  navigation: any;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    category: '基本機能',
    question: '駐車場の検索方法を教えてください',
    answer: '地図を移動させると自動的にその地域の駐車場が検索されます。また、下部のパネルから料金や距離でフィルタリングも可能です。',
  },
  {
    id: '2',
    category: '基本機能',
    question: '駐車料金はどのように計算されますか？',
    answer: '下部パネルで指定した駐車時間に基づいて、各駐車場の料金体系から自動計算されます。基本料金、最大料金、夜間料金などが考慮されます。',
  },
  {
    id: '3',
    category: '基本機能',
    question: 'お気に入り機能の使い方は？',
    answer: '駐車場の詳細画面でハートボタンをタップすると、お気に入りに追加できます。お気に入りはプロフィール画面から一覧で確認できます。',
  },
  {
    id: '4',
    category: 'アカウント',
    question: 'ログインしないと使えませんか？',
    answer: '基本的な検索機能はログインなしでも利用可能です。お気に入りやレビュー機能を使用する場合はログインが必要です。',
  },
  {
    id: '5',
    category: 'アカウント',
    question: 'プレミアム会員の特典は？',
    answer: 'プレミアム会員は広告非表示、詳細な統計情報の閲覧、優先サポートなどの特典があります。',
  },
  {
    id: '6',
    category: 'トラブル',
    question: '現在地が取得できません',
    answer: '設定アプリから位置情報サービスを有効にし、本アプリに位置情報の使用を許可してください。',
  },
  {
    id: '7',
    category: 'トラブル',
    question: '地図が表示されません',
    answer: 'インターネット接続を確認してください。オフラインモードでは一部機能が制限されます。',
  },
];

export const HelpScreen: React.FC<HelpScreenProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const filteredFAQ = FAQ_DATA.filter(
    item =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedFAQ = filteredFAQ.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, FAQItem[]>);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ヘルプ</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="質問を検索..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* お問い合わせボタン */}
        <TouchableOpacity style={styles.contactCard} onPress={() => navigation.navigate('Contact')}>
          <View style={styles.contactContent}>
            <Ionicons name="mail-outline" size={24} color={Colors.primary} />
            <View style={styles.contactText}>
              <Text style={styles.contactTitle}>お問い合わせ</Text>
              <Text style={styles.contactDescription}>
                FAQで解決しない場合はこちらから
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        {/* FAQ セクション */}
        {Object.entries(groupedFAQ).map(([category, items]) => (
          <View key={category} style={styles.section}>
            <Text style={styles.sectionTitle}>{category}</Text>
            {items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.faqItem}
                onPress={() => toggleExpanded(item.id)}
              >
                <View style={styles.questionContainer}>
                  <Text style={styles.question}>{item.question}</Text>
                  <Ionicons
                    name={expandedItems.has(item.id) ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#999"
                  />
                </View>
                {expandedItems.has(item.id) && (
                  <Text style={styles.answer}>{item.answer}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* クイックリンク */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>クイックリンク</Text>
          
          <TouchableOpacity 
            style={styles.linkItem}
            onPress={() => navigation.navigate('Guide')}
          >
            <Ionicons name="book-outline" size={20} color="#666" />
            <Text style={styles.linkText}>使い方ガイド</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
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
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contactContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    marginLeft: 12,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  contactDescription: {
    fontSize: 13,
    color: '#999',
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 20,
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
  faqItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  questionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  question: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginRight: 12,
  },
  answer: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
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
});