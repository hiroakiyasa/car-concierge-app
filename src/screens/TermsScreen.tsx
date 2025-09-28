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

interface TermsScreenProps {
  navigation: any;
}

export const TermsScreen: React.FC<TermsScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>利用規約</Text>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>最終更新日: 2025年1月1日</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第1条（利用規約の適用）</Text>
          <Text style={styles.sectionContent}>
            本利用規約（以下「本規約」といいます）は、車旅コンシェルジュ（以下「本アプリ」といいます）の利用に関する条件を、本アプリを利用するお客様（以下「ユーザー」といいます）と当社との間で定めるものです。
            {'\n\n'}
            ユーザーは、本規約に同意した上で、本アプリを利用するものとします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第2条（定義）</Text>
          <Text style={styles.sectionContent}>
            本規約において使用する用語の定義は、以下のとおりとします。
            {'\n\n'}
            1. 「本サービス」とは、当社が提供する駐車場検索、料金計算、施設情報提供、およびそれらに付随するサービスを意味します。
            {'\n'}
            2. 「ユーザー情報」とは、ユーザーが本アプリに登録した情報、および本アプリの利用履歴を意味します。
            {'\n'}
            3. 「コンテンツ」とは、ユーザーが本アプリに投稿したレビュー、評価、コメント、画像等を意味します。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第3条（アカウント登録）</Text>
          <Text style={styles.sectionContent}>
            1. ユーザーは、本アプリの一部機能を利用するために、アカウント登録を行うことができます。
            {'\n\n'}
            2. ユーザーは、アカウント登録において、真実、正確、最新、完全な情報を提供するものとします。
            {'\n\n'}
            3. ユーザーは、自己のアカウント情報の管理責任を負うものとし、第三者による不正使用等から生じる損害について、当社は一切責任を負いません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第4条（サービスの提供）</Text>
          <Text style={styles.sectionContent}>
            1. 当社は、本アプリを通じて、駐車場情報、周辺施設情報、料金計算機能等を提供します。
            {'\n\n'}
            2. 当社は、本サービスの内容を予告なく変更、追加、削除することができるものとします。
            {'\n\n'}
            3. 当社は、システムメンテナンス、不可抗力、その他の事由により、本サービスの提供を一時的に中断することができます。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第5条（利用料金）</Text>
          <Text style={styles.sectionContent}>
            1. 本アプリの基本機能は無料で利用できます。
            {'\n\n'}
            2. プレミアムプランの利用には、当社が別途定める利用料金の支払いが必要です。
            {'\n\n'}
            3. プレミアムプランの料金は以下のとおりです：
            {'\n'}
            ・月額プラン: 480円（税込）
            {'\n'}
            ・年額プラン: 4,800円（税込）
            {'\n\n'}
            4. 支払い済みの利用料金は、法令に基づく場合を除き、返金いたしません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第6条（禁止事項）</Text>
          <Text style={styles.sectionContent}>
            ユーザーは、本アプリの利用にあたり、以下の行為を行ってはなりません。
            {'\n\n'}
            1. 法令または公序良俗に違反する行為
            {'\n'}
            2. 犯罪行為に関連する行為
            {'\n'}
            3. 当社または第三者の知的財産権を侵害する行為
            {'\n'}
            4. 当社または第三者の名誉、信用を毀損する行為
            {'\n'}
            5. 本アプリの運営を妨害する行為
            {'\n'}
            6. 不正アクセス、ハッキング等の行為
            {'\n'}
            7. 虚偽の情報を登録、投稿する行為
            {'\n'}
            8. 他のユーザーの個人情報を収集、蓄積する行為
            {'\n'}
            9. 営業、宣伝、広告、勧誘等の行為
            {'\n'}
            10. その他、当社が不適切と判断する行為
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第7条（知的財産権）</Text>
          <Text style={styles.sectionContent}>
            1. 本アプリに関する一切の知的財産権は、当社または正当な権利者に帰属します。
            {'\n\n'}
            2. ユーザーが投稿したコンテンツの著作権はユーザーに帰属しますが、当社は本サービスの提供、改善、プロモーションのために、当該コンテンツを無償で利用できるものとします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第8条（免責事項）</Text>
          <Text style={styles.sectionContent}>
            1. 当社は、本アプリで提供する情報の正確性、完全性、有用性等について、いかなる保証も行いません。
            {'\n\n'}
            2. 駐車場の利用、料金の支払い等は、ユーザーと駐車場運営者との間で行われるものであり、当社は一切関与しません。
            {'\n\n'}
            3. 当社は、本アプリの利用により生じたいかなる損害についても、責任を負いません。
            {'\n\n'}
            4. 当社は、ユーザー間のトラブル、ユーザーと第三者との間のトラブルについて、一切責任を負いません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第9条（サービスの変更・終了）</Text>
          <Text style={styles.sectionContent}>
            1. 当社は、事前の通知なく、本サービスの内容を変更することができます。
            {'\n\n'}
            2. 当社は、30日前の通知をもって、本サービスを終了することができます。
            {'\n\n'}
            3. 当社は、本サービスの変更・終了により生じた損害について、一切責任を負いません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第10条（利用規約の変更）</Text>
          <Text style={styles.sectionContent}>
            1. 当社は、必要と判断した場合、ユーザーの同意を得ることなく、本規約を変更することができます。
            {'\n\n'}
            2. 変更後の規約は、本アプリ内での掲示またはその他の方法により通知します。
            {'\n\n'}
            3. 変更後の規約の通知後、ユーザーが本アプリを利用した場合、変更後の規約に同意したものとみなします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第11条（準拠法・管轄裁判所）</Text>
          <Text style={styles.sectionContent}>
            1. 本規約の解釈にあたっては、日本法を準拠法とします。
            {'\n\n'}
            2. 本規約に関して紛争が生じた場合、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第12条（駐車場利用に関する遵守事項）</Text>
          <Text style={styles.sectionContent}>
            1. ユーザーは、コインパーキングを利用する際、各駐車場運営会社が定める利用規約・場内掲示・係員の指示等に従うものとします。
            {'\n\n'}
            2. 当社は駐車場の運営に関与しておらず、駐車場内外で発生した事故・盗難・損壊・トラブルその他一切の事項について責任を負いません。問題が生じた場合は、当事者間または駐車場運営会社の規定に従い解決してください。
            {'\n\n'}
            3. 駐車中の長時間アイドリングや騒音行為、周辺住民・他の利用者に迷惑となる行為は禁止します。各地域の条例・駐車場のルールに従ってください。
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
