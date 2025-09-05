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
import { Colors } from '@/utils/constants';

interface TermsOfServiceScreenProps {
  navigation: any;
}

export const TermsOfServiceScreen: React.FC<TermsOfServiceScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>利用規約</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>第1条（目的）</Text>
        <Text style={styles.content}>
          本利用規約（以下「本規約」といいます。）は、CAR Concierge（以下「当社」といいます。）が提供するCAR Concieregeアプリケーション（以下「本サービス」といいます。）の利用条件を定めるものです。登録ユーザーの皆さま（以下「ユーザー」といいます。）には、本規約に従って、本サービスをご利用いただきます。
        </Text>

        <Text style={styles.sectionTitle}>第2条（利用登録）</Text>
        <Text style={styles.content}>
          1. 本サービスにおいては、登録希望者が本規約に同意の上、当社の定める方法によって利用登録を申請し、当社がこれを承認することによって、利用登録が完了するものとします。{'\n\n'}
          2. 当社は、利用登録の申請者に以下の事由があると判断した場合、利用登録の申請を承認しないことがあり、その理由については一切の開示義務を負わないものとします。{'\n'}
          　・利用登録の申請に際して虚偽の事項を届け出た場合{'\n'}
          　・本規約に違反したことがある者からの申請である場合{'\n'}
          　・その他、当社が利用登録を相当でないと判断した場合
        </Text>

        <Text style={styles.sectionTitle}>第3条（個人情報の取扱い）</Text>
        <Text style={styles.content}>
          当社は、本サービスの利用によって取得する個人情報については、当社「プライバシーポリシー」に従い適切に取り扱うものとします。
        </Text>

        <Text style={styles.sectionTitle}>第4条（利用料金）</Text>
        <Text style={styles.content}>
          本サービスの基本機能は無料でご利用いただけます。ただし、将来的に有料機能を追加する場合があります。その際は事前に通知いたします。
        </Text>

        <Text style={styles.sectionTitle}>第5条（禁止事項）</Text>
        <Text style={styles.content}>
          ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。{'\n\n'}
          1. 法令または公序良俗に違反する行為{'\n'}
          2. 犯罪行為に関連する行為{'\n'}
          3. 本サービスの内容等、本サービスに含まれる著作権、商標権ほか知的財産権を侵害する行為{'\n'}
          4. 当社、ほかのユーザー、またはその他第三者のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為{'\n'}
          5. 本サービスによって得られた情報を商業的に利用する行為{'\n'}
          6. 当社のサービスの運営を妨害するおそれのある行為{'\n'}
          7. 不正アクセスをし、またはこれを試みる行為{'\n'}
          8. 他のユーザーに関する個人情報等を収集または蓄積する行為{'\n'}
          9. 不正な目的を持って本サービスを利用する行為{'\n'}
          10. 本サービスの他のユーザーまたはその他の第三者に不利益、損害、不快感を与える行為{'\n'}
          11. その他当社が不適切と判断する行為
        </Text>

        <Text style={styles.sectionTitle}>第6条（本サービスの提供の停止等）</Text>
        <Text style={styles.content}>
          当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。{'\n\n'}
          1. 本サービスにかかるコンピュータシステムの保守点検または更新を行う場合{'\n'}
          2. 地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合{'\n'}
          3. コンピュータまたは通信回線等が事故により停止した場合{'\n'}
          4. その他、当社が本サービスの提供が困難と判断した場合
        </Text>

        <Text style={styles.sectionTitle}>第7条（利用制限および登録抹消）</Text>
        <Text style={styles.content}>
          当社は、ユーザーが以下のいずれかに該当する場合には、事前の通知なく、ユーザーに対して、本サービスの全部もしくは一部の利用を制限し、またはユーザーとしての登録を抹消することができるものとします。{'\n\n'}
          1. 本規約のいずれかの条項に違反した場合{'\n'}
          2. 登録事項に虚偽の事実があることが判明した場合{'\n'}
          3. その他、当社が本サービスの利用を適当でないと判断した場合
        </Text>

        <Text style={styles.sectionTitle}>第8条（免責事項）</Text>
        <Text style={styles.content}>
          1. 当社は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。{'\n\n'}
          2. 当社は、本サービスに起因してユーザーに生じたあらゆる損害について一切の責任を負いません。
        </Text>

        <Text style={styles.sectionTitle}>第9条（サービス内容の変更等）</Text>
        <Text style={styles.content}>
          当社は、ユーザーに通知することなく、本サービスの内容を変更しまたは本サービスの提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。
        </Text>

        <Text style={styles.sectionTitle}>第10条（利用規約の変更）</Text>
        <Text style={styles.content}>
          当社は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。なお、本規約の変更後、本サービスの利用を継続した場合には、変更後の本規約に同意したものとみなします。
        </Text>

        <Text style={styles.sectionTitle}>第11条（通知または連絡）</Text>
        <Text style={styles.content}>
          ユーザーと当社との間の通知または連絡は、当社の定める方法によって行うものとします。
        </Text>

        <Text style={styles.sectionTitle}>第12条（権利義務の譲渡の禁止）</Text>
        <Text style={styles.content}>
          ユーザーは、当社の書面による事前の承諾なく、利用契約上の地位または本規約に基づく権利もしくは義務を第三者に譲渡し、または担保に供することはできません。
        </Text>

        <Text style={styles.sectionTitle}>第13条（準拠法・裁判管轄）</Text>
        <Text style={styles.content}>
          本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。
        </Text>

        <Text style={styles.lastUpdated}>
          最終更新日：2025年9月5日
        </Text>
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
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24,
    marginBottom: 12,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
    marginBottom: 16,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 32,
  },
});