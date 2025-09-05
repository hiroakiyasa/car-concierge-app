import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  ImageBackground,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { JAPAN_IMAGES } from '@/constants/japanImages';

interface GuideScreenProps {
  navigation: any;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = {
  primary: '#1e3a5f',
  accent: '#2B7DFF', 
  lightBlue: '#E8F2FF',
  darkText: '#1a1a1a',
  lightText: '#6B7280',
  white: '#ffffff',
  shadow: 'rgba(0,0,0,0.15)',
  cardBg: '#FAFBFD',
  greenAccent: '#10B981',
  orangeAccent: '#F59E0B',
  redAccent: '#EF4444',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  overlay: 'rgba(0,0,0,0.4)',
};

export const GuideScreen: React.FC<GuideScreenProps> = ({ navigation }) => {
  const [activeSection, setActiveSection] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSectionChange = (index: number) => {
    setActiveSection(index);
    scrollViewRef.current?.scrollTo({ 
      x: index * SCREEN_WIDTH, 
      animated: true 
    });
  };

  const sections = [
    {
      id: 'overview',
      title: 'アプリ概要',
      subtitle: 'App Overview',
      icon: 'car-outline',
      gradient: ['#667eea', '#764ba2'],
      backgroundImage: JAPAN_IMAGES.discover[0],
    },
    {
      id: 'parking-fee',
      title: '駐車料金計算',
      subtitle: 'Parking Fee Calculator',
      icon: 'time-outline',
      gradient: ['#4facfe', '#00f2fe'],
      backgroundImage: JAPAN_IMAGES.explore[0],
    },
    {
      id: 'nearby-search',
      title: '周辺施設検索',
      subtitle: 'Nearby Facilities',
      icon: 'location-outline',
      gradient: ['#43e97b', '#38f9d7'],
      backgroundImage: JAPAN_IMAGES.nature[0],
    },
    {
      id: 'elevation',
      title: '標高フィルター',
      subtitle: 'Elevation Filter',
      icon: 'trending-up-outline',
      gradient: ['#fa709a', '#fee140'],
      backgroundImage: JAPAN_IMAGES.ranking[0],
    },
  ];

  const renderOverviewContent = () => (
    <View style={styles.sectionContent}>
      {/* Main App Screenshot with Beautiful Japanese Landscape */}
      <View style={styles.landscapeCard}>
        <ImageBackground
          source={JAPAN_IMAGES.discover[1].source}
          style={styles.landscapeBackground}
          imageStyle={styles.landscapeImage}
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.landscapeGradient}
          >
            <View style={styles.appScreenshotContainer}>
              <View style={styles.phoneFrame}>
                <Image
                  source={require('../../assets/guide.png')}
                  style={styles.appScreenshot}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.landscapeContent}>
                <Text style={styles.landscapeTitle}>CAR Concierge</Text>
                <Text style={styles.landscapeSubtitle}>
                  日本全国の駐車場を瞬時に検索
                </Text>
                <Text style={styles.landscapeDescription}>
                  美しい風景とともに、最適な駐車場を見つけましょう
                </Text>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      </View>

      {/* Feature Overview Cards */}
      <View style={styles.featureOverviewGrid}>
        <View style={styles.overviewCard}>
          <LinearGradient
            colors={[COLORS.accent, '#1e88e5']}
            style={styles.overviewIconContainer}
          >
            <Ionicons name="trophy" size={24} color={COLORS.white} />
          </LinearGradient>
          <Text style={styles.overviewCardTitle}>料金TOP3</Text>
          <Text style={styles.overviewCardDesc}>金・銀・銅マーカーで最安値を表示</Text>
        </View>

        <View style={styles.overviewCard}>
          <LinearGradient
            colors={[COLORS.greenAccent, '#059669']}
            style={styles.overviewIconContainer}
          >
            <Ionicons name="location" size={24} color={COLORS.white} />
          </LinearGradient>
          <Text style={styles.overviewCardTitle}>周辺検索</Text>
          <Text style={styles.overviewCardDesc}>温泉・GSとの距離で絞込</Text>
        </View>

        <View style={styles.overviewCard}>
          <LinearGradient
            colors={[COLORS.orangeAccent, '#d97706']}
            style={styles.overviewIconContainer}
          >
            <Ionicons name="time" size={24} color={COLORS.white} />
          </LinearGradient>
          <Text style={styles.overviewCardTitle}>自動計算</Text>
          <Text style={styles.overviewCardDesc}>駐車時間で料金を自動算出</Text>
        </View>

        <View style={styles.overviewCard}>
          <LinearGradient
            colors={[COLORS.redAccent, '#dc2626']}
            style={styles.overviewIconContainer}
          >
            <Ionicons name="shield-checkmark" size={24} color={COLORS.white} />
          </LinearGradient>
          <Text style={styles.overviewCardTitle}>津波対策</Text>
          <Text style={styles.overviewCardDesc}>標高30m以上でマーク表示</Text>
        </View>
      </View>

      {/* Detailed App Usage Guide */}
      <View style={styles.stepsSection}>
        <Text style={styles.stepsSectionTitle}>🚗 アプリの基本操作</Text>
        
        <View style={styles.detailedInstructions}>
          <View style={styles.instructionRow}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepIndicatorText}>1</Text>
            </View>
            <View style={styles.instructionContent}>
              <Text style={styles.instructionTitle}>地図の操作方法</Text>
              <Text style={styles.instructionDesc}>指でスワイプして地図を移動、ピンチイン・アウトで拡大縮小します</Text>
            </View>
          </View>

          <View style={styles.instructionRow}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepIndicatorText}>2</Text>
            </View>
            <View style={styles.instructionContent}>
              <Text style={styles.instructionTitle}>マーカーの見方</Text>
              <Text style={styles.instructionDesc}>金・銀・銅マーカーが料金TOP3、色分けアイコンが周辺施設を表示</Text>
            </View>
          </View>

          <View style={styles.instructionRow}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepIndicatorText}>3</Text>
            </View>
            <View style={styles.instructionContent}>
              <Text style={styles.instructionTitle}>情報の確認方法</Text>
              <Text style={styles.instructionDesc}>1回目のタップで基本情報、2回目のタップで詳細情報を表示します</Text>
            </View>
          </View>

          <View style={styles.instructionRow}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepIndicatorText}>4</Text>
            </View>
            <View style={styles.instructionContent}>
              <Text style={styles.instructionTitle}>フィルター機能</Text>
              <Text style={styles.instructionDesc}>画面下部のパネルから料金計算・周辺検索・標高フィルターを利用できます</Text>
            </View>
          </View>
        </View>

      </View>
    </View>
  );

  const renderParkingFeeContent = () => (
    <View style={styles.sectionContent}>
      {/* Feature Screenshot */}
      <View style={styles.compactScreenshotSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="time" size={24} color={COLORS.accent} />
          <Text style={styles.sectionTitle}>駐車料金計算</Text>
        </View>
        <View style={styles.screenshotContainer}>
          <Image
            source={require('../../assets/tyuusyaryoukinn.png')}
            style={styles.fullScreenshot}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Detailed Explanation */}
      <View style={styles.explanationCard}>
        <Text style={styles.explanationTitle}>💰 料金計算の使い方</Text>
        
        <View style={styles.detailedInstructions}>
          <View style={styles.instructionRow}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepIndicatorText}>1</Text>
            </View>
            <View style={styles.instructionContent}>
              <Text style={styles.instructionTitle}>駐車料金フィルターを選択</Text>
              <Text style={styles.instructionDesc}>画面下部のフィルターパネルから「駐車料金」ボタンをタップします</Text>
            </View>
          </View>

          <View style={styles.instructionRow}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepIndicatorText}>2</Text>
            </View>
            <View style={styles.instructionContent}>
              <Text style={styles.instructionTitle}>入庫・出庫時間を設定</Text>
              <Text style={styles.instructionDesc}>カレンダーアイコンをタップして、駐車開始時間と終了時間を選択します</Text>
            </View>
          </View>

          <View style={styles.instructionRow}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepIndicatorText}>3</Text>
            </View>
            <View style={styles.instructionContent}>
              <Text style={styles.instructionTitle}>自動計算と表示</Text>
              <Text style={styles.instructionDesc}>駐車時間が自動計算され、料金の安い順に金・銀・銅マーカーで表示されます</Text>
            </View>
          </View>
        </View>

        <View style={styles.featureBenefits}>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.greenAccent} />
            <Text style={styles.benefitText}>10分〜48時間まで対応</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.greenAccent} />
            <Text style={styles.benefitText}>リアルタイム料金計算</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderNearbySearchContent = () => (
    <View style={styles.sectionContent}>
      {/* Feature Screenshot */}
      <View style={styles.compactScreenshotSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="location" size={24} color={COLORS.greenAccent} />
          <Text style={styles.sectionTitle}>周辺施設検索</Text>
        </View>
        <View style={styles.screenshotContainer}>
          <Image
            source={require('../../assets/syuuhenn.png')}
            style={styles.fullScreenshot}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Detailed Usage Instructions */}
      <View style={styles.facilityTypesCard}>
        <Text style={styles.explanationTitle}>🏪 周辺施設検索の使い方</Text>
        
        <View style={styles.detailedInstructions}>
          <View style={styles.instructionRow}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepIndicatorText}>1</Text>
            </View>
            <View style={styles.instructionContent}>
              <Text style={styles.instructionTitle}>周辺検索フィルターを選択</Text>
              <Text style={styles.instructionDesc}>画面下部から「周辺検索」ボタンをタップしてフィルターを開きます</Text>
            </View>
          </View>

          <View style={styles.instructionRow}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepIndicatorText}>2</Text>
            </View>
            <View style={styles.instructionContent}>
              <Text style={styles.instructionTitle}>施設種別を選択</Text>
              <Text style={styles.instructionDesc}>温泉、ガソリンスタンドから検索したい施設を選択</Text>
            </View>
          </View>

          <View style={styles.instructionRow}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepIndicatorText}>3</Text>
            </View>
            <View style={styles.instructionContent}>
              <Text style={styles.instructionTitle}>距離範囲を調整</Text>
              <Text style={styles.instructionDesc}>スライダーで100m〜1000mの範囲から検索距離を設定します</Text>
            </View>
          </View>
        </View>

        <View style={styles.facilityTypesRow}>
          <View style={styles.facilityTypeItem}>
            <View style={[styles.facilityTypeIcon, { backgroundColor: COLORS.redAccent }]}>
              <Ionicons name="water" size={14} color={COLORS.white} />
            </View>
            <Text style={styles.facilityTypeText}>温泉</Text>
          </View>
          <View style={styles.facilityTypeItem}>
            <View style={[styles.facilityTypeIcon, { backgroundColor: COLORS.orangeAccent }]}>
              <Ionicons name="car" size={14} color={COLORS.white} />
            </View>
            <Text style={styles.facilityTypeText}>ガソリンスタンド</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderElevationContent = () => (
    <View style={styles.sectionContent}>
      {/* Feature Screenshot */}
      <View style={styles.compactScreenshotSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trending-up" size={24} color={COLORS.orangeAccent} />
          <Text style={styles.sectionTitle}>標高フィルター</Text>
        </View>
        <View style={styles.screenshotContainer}>
          <Image
            source={require('../../assets/hyoukou.png')}
            style={styles.fullScreenshot}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Detailed Safety Instructions */}
      <View style={styles.safetyCard}>
        <Text style={styles.explanationTitle}>🛡️ 標高フィルターの使い方</Text>
        
        <View style={styles.detailedInstructions}>
          <View style={styles.instructionRow}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepIndicatorText}>1</Text>
            </View>
            <View style={styles.instructionContent}>
              <Text style={styles.instructionTitle}>標高フィルターを選択</Text>
              <Text style={styles.instructionDesc}>画面下部から「標高」ボタンをタップしてフィルターを開きます</Text>
            </View>
          </View>

          <View style={styles.instructionRow}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepIndicatorText}>2</Text>
            </View>
            <View style={styles.instructionContent}>
              <Text style={styles.instructionTitle}>標高範囲を設定</Text>
              <Text style={styles.instructionDesc}>スライダーで検索したい最低標高を0m〜2000mの範囲で設定します</Text>
            </View>
          </View>

          <View style={styles.instructionRow}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepIndicatorText}>3</Text>
            </View>
            <View style={styles.instructionContent}>
              <Text style={styles.instructionTitle}>安全マークの確認</Text>
              <Text style={styles.instructionDesc}>30m以上では津波対策マーク、気温差も自動表示されます</Text>
            </View>
          </View>
        </View>

        <View style={styles.safetyFeaturesRow}>
          <View style={styles.safetyFeatureItem}>
            <View style={[styles.safetyFeatureIcon, { backgroundColor: COLORS.orangeAccent }]}>
              <Ionicons name="warning" size={14} color={COLORS.white} />
            </View>
            <Text style={styles.safetyFeatureText}>津波対策</Text>
          </View>
          <View style={styles.safetyFeatureItem}>
            <View style={[styles.safetyFeatureIcon, { backgroundColor: COLORS.accent }]}>
              <Ionicons name="thermometer" size={14} color={COLORS.white} />
            </View>
            <Text style={styles.safetyFeatureText}>気温差表示</Text>
          </View>
          <View style={styles.safetyFeatureItem}>
            <View style={[styles.safetyFeatureIcon, { backgroundColor: COLORS.greenAccent }]}>
              <Ionicons name="shield-checkmark" size={14} color={COLORS.white} />
            </View>
            <Text style={styles.safetyFeatureText}>安全レベル</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const currentSection = sections[activeSection];

  return (
    <SafeAreaView style={styles.container}>
      {/* Dynamic Hero Background */}
      <ImageBackground
        source={currentSection.backgroundImage.source}
        style={styles.heroBackground}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[...currentSection.gradient, COLORS.overlay]}
          style={styles.heroOverlay}
        >
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
            
            <View style={styles.headerContent}>
              <Text style={styles.headerSubtitle}>
                {currentSection.subtitle}
              </Text>
              <Text style={styles.headerTitle}>
                {currentSection.title}
              </Text>
            </View>
            
            <View style={styles.headerIcon}>
              <Ionicons 
                name={currentSection.icon} 
                size={32} 
                color={COLORS.white} 
              />
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
        >
          {sections.map((section, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleSectionChange(index)}
              style={[
                styles.tab,
                activeSection === index && styles.activeTab,
              ]}
            >
              <Ionicons 
                name={section.icon} 
                size={20} 
                color={activeSection === index ? COLORS.accent : COLORS.lightText} 
              />
              <Text style={[
                styles.tabText,
                activeSection === index && styles.activeTabText,
              ]}>
                {section.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Content */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.mainScrollView}
        onMomentumScrollEnd={(event) => {
          const page = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setActiveSection(page);
        }}
      >
        <View style={styles.pageContainer}>
          <ScrollView 
            style={styles.contentScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {renderOverviewContent()}
          </ScrollView>
        </View>

        <View style={styles.pageContainer}>
          <ScrollView 
            style={styles.contentScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {renderParkingFeeContent()}
          </ScrollView>
        </View>

        <View style={styles.pageContainer}>
          <ScrollView 
            style={styles.contentScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {renderNearbySearchContent()}
          </ScrollView>
        </View>

        <View style={styles.pageContainer}>
          <ScrollView 
            style={styles.contentScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {renderElevationContent()}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  heroBackground: {
    height: SCREEN_HEIGHT * 0.18,
    width: '100%',
  },
  heroOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(20px)',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flex: 1,
    marginHorizontal: 20,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tabContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tabScroll: {
    paddingHorizontal: 20,
    gap: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    gap: 8,
    minWidth: 140,
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: COLORS.lightBlue,
    transform: [{ scale: 1.05 }],
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.lightText,
  },
  activeTabText: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  mainScrollView: {
    flex: 1,
  },
  pageContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  contentScrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionContent: {
    gap: 24,
  },

  // Overview Section Styles
  landscapeCard: {
    height: 350,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 16,
  },
  landscapeBackground: {
    flex: 1,
  },
  landscapeImage: {
    borderRadius: 24,
  },
  landscapeGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  appScreenshotContainer: {
    alignItems: 'center',
    gap: 20,
  },
  phoneFrame: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 8,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  appScreenshot: {
    width: 180,
    height: 320,
    borderRadius: 16,
  },
  landscapeContent: {
    alignItems: 'center',
  },
  landscapeTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.white,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  landscapeSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  landscapeDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontWeight: '500',
  },
  
  featureOverviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  overviewCard: {
    width: (SCREEN_WIDTH - 60) / 2,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  overviewIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  overviewCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkText,
    marginBottom: 8,
    textAlign: 'center',
  },
  overviewCardDesc: {
    fontSize: 12,
    color: COLORS.lightText,
    textAlign: 'center',
    lineHeight: 18,
  },

  stepsSection: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  stepsSectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.darkText,
    marginBottom: 24,
    textAlign: 'center',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stepNumberContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  stepNumber: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.darkText,
    marginBottom: 6,
  },
  stepDescription: {
    fontSize: 14,
    color: COLORS.lightText,
    lineHeight: 20,
  },

  // Compact Screenshot Section Styles
  compactScreenshotSection: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkText,
    marginLeft: 8,
  },
  screenshotContainer: {
    alignItems: 'center',
  },
  fullScreenshot: {
    width: SCREEN_WIDTH - 80,
    height: 120,
    borderRadius: 8,
    backgroundColor: COLORS.cardBg,
  },

  // Explanation Card Styles
  explanationCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkText,
    marginBottom: 12,
    textAlign: 'center',
  },
  
  // Detailed Instructions Styles
  detailedInstructions: {
    marginBottom: 12,
  },
  instructionRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  stepIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepIndicatorText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  instructionContent: {
    flex: 1,
  },
  instructionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.darkText,
    marginBottom: 3,
  },
  instructionDesc: {
    fontSize: 11,
    color: COLORS.lightText,
    lineHeight: 16,
  },
  
  // Feature Benefits
  featureBenefits: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 11,
    color: COLORS.greenAccent,
    fontWeight: '600',
    marginLeft: 6,
  },
  
  // Facility Types Row
  facilityTypesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  facilityTypeItem: {
    flex: 1,
    alignItems: 'center',
  },
  facilityTypeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  facilityTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.darkText,
    textAlign: 'center',
  },
  
  // Safety Features Row
  safetyFeaturesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  safetyFeatureItem: {
    flex: 1,
    alignItems: 'center',
  },
  safetyFeatureIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  safetyFeatureText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.darkText,
    textAlign: 'center',
  },
  // Compact Styles
  compactStepsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  compactStep: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  compactIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactStepTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.darkText,
    marginBottom: 4,
    textAlign: 'center',
  },
  compactStepDesc: {
    fontSize: 10,
    color: COLORS.lightText,
    textAlign: 'center',
    lineHeight: 14,
  },
  explanationStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  explanationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  explanationContent: {
    flex: 1,
  },
  explanationStepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkText,
    marginBottom: 4,
  },
  explanationStepDesc: {
    fontSize: 14,
    color: COLORS.lightText,
    lineHeight: 20,
  },
  highlightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightBlue,
    padding: 20,
    borderRadius: 16,
    marginTop: 8,
  },
  highlightContent: {
    marginLeft: 12,
    flex: 1,
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: 4,
  },
  highlightDesc: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
  },

  // Facility Types Styles
  facilityTypesCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  compactGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  compactFacility: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  smallIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactFacilityName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.darkText,
    textAlign: 'center',
  },
  compactDistanceInfo: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  compactDistanceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkText,
    marginBottom: 4,
  },
  compactDistanceDesc: {
    fontSize: 12,
    color: COLORS.lightText,
    textAlign: 'center',
  },
  facilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  facilityItem: {
    width: (SCREEN_WIDTH - 80) / 2,
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
  },
  facilityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  facilityName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkText,
    marginBottom: 4,
    textAlign: 'center',
  },
  facilityDesc: {
    fontSize: 12,
    color: COLORS.lightText,
    textAlign: 'center',
    lineHeight: 16,
  },

  distanceSelector: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 20,
  },
  distanceSelectorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.darkText,
    marginBottom: 16,
    textAlign: 'center',
  },
  distanceOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  distanceOption: {
    alignItems: 'center',
  },
  distanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: 4,
  },
  distanceLabel: {
    fontSize: 12,
    color: COLORS.lightText,
    fontWeight: '500',
  },

  // Safety Features Styles
  safetyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  compactSafetyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  compactSafety: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  compactSafetyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.darkText,
    marginBottom: 4,
    textAlign: 'center',
  },
  compactSafetyDesc: {
    fontSize: 10,
    color: COLORS.lightText,
    textAlign: 'center',
    lineHeight: 14,
  },
  compactElevationScale: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 12,
  },
  compactElevationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkText,
    marginBottom: 12,
    textAlign: 'center',
  },
  compactElevationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  compactElevationItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactElevationLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.darkText,
    marginLeft: 4,
  },
  safetyFeature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  safetyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  safetyContent: {
    flex: 1,
  },
  safetyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.darkText,
    marginBottom: 8,
  },
  safetyDesc: {
    fontSize: 14,
    color: COLORS.lightText,
    lineHeight: 22,
  },

  elevationScale: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 20,
  },
  elevationScaleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.darkText,
    marginBottom: 16,
    textAlign: 'center',
  },
  elevationItems: {
    gap: 12,
  },
  elevationItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  elevationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  elevationLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkText,
    width: 60,
  },
  elevationDesc: {
    fontSize: 14,
    color: COLORS.lightText,
    flex: 1,
  },
});