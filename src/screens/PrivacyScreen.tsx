import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface PrivacyScreenProps {
  navigation: any;
}

export const PrivacyScreen: React.FC<PrivacyScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>プライバシーポリシー</Text>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>最終更新日: 2025年1月1日</Text>

        <View style={styles.section}>
          <Text style={styles.sectionContent}>
            車旅コンシェルジュ運営チーム（以下「当社」といいます）は、本アプリケーション「車旅コンシェルジュ」（以下「本アプリ」といいます）における、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます）を定めます。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. 収集する個人情報</Text>
          <Text style={styles.sectionContent}>
            当社は、本アプリの提供にあたり、以下の個人情報を収集することがあります。
            {'\n\n'}
            【アカウント登録時】
            {'\n'}
            ・メールアドレス
            {'\n'}
            ・氏名（ニックネーム可）
            {'\n'}
            ・パスワード（暗号化して保存）
            {'\n\n'}
            【アプリ利用時】
            {'\n'}
            ・位置情報（GPS情報）
            {'\n'}
            ・検索履歴
            {'\n'}
            ・お気に入り登録情報
            {'\n'}
            ・レビュー・評価情報
            {'\n'}
            ・アプリの利用状況（アクセスログ等）
            {'\n\n'}
            【プレミアムプラン登録時】
            {'\n'}
            ・決済情報（決済代行業者が管理）
            {'\n'}
            ・購入履歴
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. 個人情報の利用目的</Text>
          <Text style={styles.sectionContent}>
            当社は、収集した個人情報を以下の目的で利用します。
            {'\n\n'}
            ・本アプリのサービス提供
            {'\n'}
            ・ユーザーの位置に基づく駐車場・施設情報の提供
            {'\n'}
            ・ユーザーサポートの提供
            {'\n'}
            ・サービスの改善、新機能の開発
            {'\n'}
            ・統計データの作成（個人を特定できない形式）
            {'\n'}
            ・プレミアムプランの課金処理
            {'\n'}
            ・重要なお知らせの通知
            {'\n'}
            ・利用規約違反の調査、対応
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. 個人情報の第三者提供</Text>
          <Text style={styles.sectionContent}>
            当社は、以下の場合を除き、ユーザーの同意なく個人情報を第三者に提供しません。
            {'\n\n'}
            ・法令に基づく場合
            {'\n'}
            ・人の生命、身体または財産の保護のために必要な場合
            {'\n'}
            ・公衆衛生の向上または児童の健全な育成の推進のために必要な場合
            {'\n'}
            ・国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合
            {'\n'}
            ・事前に同意を得た場合
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. 個人情報の管理</Text>
          <Text style={styles.sectionContent}>
            当社は、個人情報を適切に管理し、以下の対策を実施します。
            {'\n\n'}
            ・SSL/TLS暗号化通信の使用
            {'\n'}
            ・パスワードの暗号化保存
            {'\n'}
            ・アクセス権限の適切な管理
            {'\n'}
            ・定期的なセキュリティ監査
            {'\n'}
            ・従業員への個人情報保護教育
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. 位置情報の取り扱い</Text>
          <Text style={styles.sectionContent}>
            本アプリは、駐車場検索機能を提供するため、ユーザーの位置情報を使用します。
            {'\n\n'}
            ・位置情報は、ユーザーの明示的な許可を得た場合のみ取得します
            {'\n'}
            ・位置情報は、駐車場・施設の検索にのみ使用されます
            {'\n'}
            ・位置情報の履歴は、サービス改善のために匿名化して保存される場合があります
            {'\n'}
            ・デバイスの設定から、いつでも位置情報の使用を無効化できます
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Cookie及び解析ツール</Text>
          <Text style={styles.sectionContent}>
            本アプリでは、サービス改善のために以下の技術を使用する場合があります。
            {'\n\n'}
            ・アプリ内での行動履歴の収集
            {'\n'}
            ・Google Analyticsなどの解析ツール
            {'\n'}
            ・クラッシュレポートツール
            {'\n\n'}
            これらのツールで収集される情報は、個人を特定できない形で処理されます。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. 子どもの個人情報</Text>
          <Text style={styles.sectionContent}>
            本アプリは、13歳未満の子どもを対象としていません。13歳未満の子どもの個人情報を意図的に収集することはありません。13歳未満の子どもが個人情報を提供したことが判明した場合、速やかに削除します。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. 個人情報の開示・訂正・削除</Text>
          <Text style={styles.sectionContent}>
            ユーザーは、当社に対して以下の請求を行うことができます。
            {'\n\n'}
            ・個人情報の開示請求
            {'\n'}
            ・個人情報の訂正・更新請求
            {'\n'}
            ・個人情報の削除請求
            {'\n'}
            ・個人情報の利用停止請求
            {'\n\n'}
            請求を行う場合は、アプリ内のお問い合わせフォームまたは以下のメールアドレスまでご連絡ください。
            {'\n'}
            メール: support@trailfusionai.com
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. データの保存期間</Text>
          <Text style={styles.sectionContent}>
            当社は、以下の期間、個人情報を保存します。
            {'\n\n'}
            ・アカウント情報: アカウント削除まで
            {'\n'}
            ・検索履歴: 最後の利用から1年間
            {'\n'}
            ・レビュー・評価: 投稿削除まで（公開情報として保存）
            {'\n'}
            ・決済情報: 法令で定められた期間
            {'\n'}
            ・アクセスログ: 最大1年間
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. 海外への情報移転</Text>
          <Text style={styles.sectionContent}>
            本アプリのデータは、クラウドサービスを利用しているため、日本国外のサーバーに保存される場合があります。その場合も、本ポリシーに従って適切に管理されます。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. プライバシーポリシーの変更</Text>
          <Text style={styles.sectionContent}>
            当社は、必要に応じて本ポリシーを変更することがあります。変更した場合は、アプリ内での通知またはメールにてお知らせします。重要な変更の場合は、再度同意を求めることがあります。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. お問い合わせ窓口</Text>
          <Text style={styles.sectionContent}>
            本ポリシーに関するお問い合わせは、以下の窓口までご連絡ください。
            {'\n\n'}
            車旅コンシェルジュ運営チーム
            {'\n'}
            メール: support@trailfusionai.com
            {'\n'}
            ウェブサイト: https://trailfusionai.com/
            {'\n\n'}
            受付時間: 平日 10:00-18:00（土日祝日を除く）
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            以上
            {'\n\n'}
            制定日: 2025年1月1日
            {'\n'}
            車旅コンシェルジュ運営チーム
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#666',
    marginTop: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  footer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});