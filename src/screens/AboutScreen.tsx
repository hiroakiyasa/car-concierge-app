import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
  Dimensions,
  Animated,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors } from '@/utils/constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 日本の美しい画像パス
const japanImages = {
  hero: require('../../assets/japan/discover_1.jpg'),
  culture1: require('../../assets/japan/culture_1.jpg'),
  culture2: require('../../assets/japan/culture_2.jpg'),
  culture3: require('../../assets/japan/culture_3.jpg'),
  nature1: require('../../assets/japan/nature_1.jpg'),
  nature2: require('../../assets/japan/nature_2.jpg'),
  nature3: require('../../assets/japan/nature_3.jpg'),
  nature4: require('../../assets/japan/nature_4.jpg'),
  nature5: require('../../assets/japan/nature_5.jpg'),
  explore1: require('../../assets/japan/explore_1.jpg'),
  explore2: require('../../assets/japan/explore_2.jpg'),
  explore3: require('../../assets/japan/explore_3.jpg'),
  explore4: require('../../assets/japan/explore_4.jpg'),
  explore5: require('../../assets/japan/explore_5.jpg'),
  discover2: require('../../assets/japan/discover_2.jpg'),
  discover3: require('../../assets/japan/discover_3.jpg'),
  discover4: require('../../assets/japan/discover_4.jpg'),
  discover5: require('../../assets/japan/discover_5.jpg'),
};

interface AboutScreenProps {
  navigation: any;
}

export const AboutScreen: React.FC<AboutScreenProps> = ({ navigation }) => {
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const parallaxOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const openURL = (url: string) => {
    Linking.openURL(url);
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const parallaxTransform = scrollY.interpolate({
    inputRange: [0, 500],
    outputRange: [0, -150],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Premium Header */}
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <BlurView intensity={80} style={styles.headerBlur}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Trail × fusion × AI</Text>
          </BlurView>
        </Animated.View>

        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          {/* Hero Section with Parallax Background */}
          <View style={styles.heroContainer}>
            <Animated.View
              style={[
                styles.parallaxImage,
                {
                  transform: [{ translateY: parallaxTransform }],
                },
              ]}
            >
              <ImageBackground source={japanImages.hero} style={styles.heroBackground}>
                <LinearGradient
                  colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
                  style={styles.heroOverlay}
                >
                  <Animated.View style={[styles.heroContent, { opacity: fadeAnim }]}>
                    <LinearGradient
                      colors={['#00ffff', '#ff00ff']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.brandGradient}
                    >
                      <Image
                        source={require('../../assets/AppIcon.appiconset/1024.png')}
                        style={styles.brandLogo}
                      />
                      <Text style={styles.brandText}>Trail</Text>
                      <Text style={styles.brandX}>×</Text>
                      <Text style={styles.brandText}>fusion</Text>
                      <Text style={styles.brandX}>×</Text>
                      <Text style={styles.brandText}>AI</Text>
                    </LinearGradient>

                    <Text style={styles.heroTitle}>車旅コンシェルジュ</Text>
                    <Text style={styles.heroSubtitle}>日本全国を愛車で巡る、あなたのための特別なアプリ</Text>

                    <View style={styles.versionBadge}>
                      <Text style={styles.versionText}>Version 1.0.0</Text>
                    </View>
                  </Animated.View>
                </LinearGradient>
              </ImageBackground>
            </Animated.View>
          </View>

          {/* Founder Profile Section */}
          <View style={styles.founderSection}>
            <Text style={styles.founderSectionTitle}>創業者</Text>
            <View style={styles.founderCard}>
              <LinearGradient
                colors={['rgba(0,255,255,0.1)', 'rgba(255,0,255,0.1)']}
                style={styles.founderGradient}
              >
                <View style={styles.founderImageContainer}>
                  {/* プロフィール画像 */}
                  <Image
                    source={require('../../assets/japan/profile.jpg')}
                    style={styles.founderImage}
                    resizeMode="cover"
                  />
                </View>
                <Text style={styles.founderName}>TrailfusionAI 創業者</Text>
                <Text style={styles.founderTitle}>キャンピングカーから世界へ挑戦する開発者</Text>
                <Text style={styles.founderMessage}>
                  「一度きりの人生、後悔しない生き方を」
                </Text>
              </LinearGradient>
            </View>
          </View>

          {/* Story Section with Background Images */}
          <View style={styles.storySection}>
            <Text style={styles.storySectionTitle}>創業者の想い</Text>

            {/* Story Card 1 - Nature Background */}
            <ImageBackground source={japanImages.nature1} style={styles.storyImageCard}>
              <LinearGradient
                colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
                style={styles.storyCardOverlay}
              >
                <Text style={styles.storyText}>
                  日本が大好きでした。
                  風情ある街並み、心と体を癒す温泉、土地ごとに味わえる美食、そして温かい人々。
                  いつか、この愛する日本を隅々まで駆け巡るのが私の夢でした。
                </Text>
              </LinearGradient>
            </ImageBackground>

            {/* Story Card 2 - Culture Background */}
            <ImageBackground source={japanImages.culture1} style={styles.storyImageCard}>
              <LinearGradient
                colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
                style={styles.storyCardOverlay}
              >
                <Text style={styles.storyText}>
                  しかし、現実は多忙なサラリーマン。
                  まとまった休みなど夢のまた夢で、「日本一周は老後の楽しみ」と、自分に言い聞かせ、諦めかけていました。
                </Text>
              </LinearGradient>
            </ImageBackground>

            {/* Story Card 3 - Explore Background */}
            <ImageBackground source={japanImages.explore1} style={styles.storyImageCard}>
              <LinearGradient
                colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
                style={styles.storyCardOverlay}
              >
                <Text style={styles.storyText}>
                  そんな私の人生が、180度変わる転機が訪れます。
                  新型コロナウイルスへの感染でした。
                </Text>
              </LinearGradient>
            </ImageBackground>

            {/* Highlight Message with Stunning Background */}
            <ImageBackground source={japanImages.discover2} style={styles.highlightImageCard}>
              <LinearGradient
                colors={['rgba(0,100,255,0.8)', 'rgba(255,0,100,0.8)']}
                style={styles.highlightOverlay}
              >
                <Text style={styles.storyHighlightText}>
                  「やりたいと思ったことは、今すぐやらなければ後悔する。
                  人生は、あまりにも短い」
                </Text>
              </LinearGradient>
            </ImageBackground>

            {/* Story Card 4 - Nature Background */}
            <ImageBackground source={japanImages.nature2} style={styles.storyImageCard}>
              <LinearGradient
                colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
                style={styles.storyCardOverlay}
              >
                <Text style={styles.storyText}>
                  部屋から出られるようになったその日、私の第二の人生が始まりました。
                  隔離されていたわずか1週間で、私はキャンピングカーを自作するための全ての計画を立て終えていたのです。
                </Text>
              </LinearGradient>
            </ImageBackground>

            {/* Story Card 5 - Explore Background */}
            <ImageBackground source={japanImages.explore2} style={styles.storyImageCard}>
              <LinearGradient
                colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
                style={styles.storyCardOverlay}
              >
                <Text style={styles.storyText}>
                  2008年式のハイエース スーパーロング（救急車と同サイズ！）を170万円で即決購入。
                  そこから2ヶ月間、使える時間はすべてDIYに捧げました。
                </Text>
              </LinearGradient>
            </ImageBackground>

            {/* Story Card 6 - Culture Background */}
            <ImageBackground source={japanImages.culture2} style={styles.storyImageCard}>
              <LinearGradient
                colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
                style={styles.storyCardOverlay}
              >
                <Text style={styles.storyText}>
                  その旅は、想像を絶するほど感動的なものでした。
                  満室のホテルを横目に、青森ねぶた祭や長岡花火大会の熱狂を最前線で体感する。
                  夏の北海道では、高騰する宿代を気にすることなく10日間も大自然を満喫し、子供たちの満面の笑みに包まれる。
                </Text>
              </LinearGradient>
            </ImageBackground>

            {/* Highlight Message 2 with Beautiful Background */}
            <ImageBackground source={japanImages.discover3} style={styles.highlightImageCard}>
              <LinearGradient
                colors={['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.95)']}
                style={styles.highlightOverlay}
              >
                <Text style={[styles.storyHighlightText, { color: '#000' }]}>
                  「一台のクルマが、これほどまでに人生を豊かにしてくれるのか」
                </Text>
              </LinearGradient>
            </ImageBackground>
          </View>

          {/* Vision Section with Scenic Backgrounds */}
          <ImageBackground source={japanImages.nature3} style={styles.visionBackground}>
            <LinearGradient
              colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.9)']}
              style={styles.visionOverlay}
            >
              <View style={styles.visionSection}>
                <Text style={styles.visionTitle}>Trail × fusion × AI</Text>
                <Text style={styles.visionSubtitle}>世界を旅する開発拠点から生まれるイノベーション</Text>

                <View style={styles.conceptCard}>
                  <BlurView intensity={30} style={styles.conceptBlur}>
                    <LinearGradient
                      colors={['rgba(0,255,255,0.2)', 'rgba(0,255,255,0.05)']}
                      style={styles.conceptGradient}
                    >
                      <Text style={styles.conceptTitle}>Trail（道）</Text>
                      <Text style={styles.conceptText}>
                        キャンピングカーで世界を旅する物理的な「道」であり、
                        誰も歩んだことのない生き方へと続く人生の「道」
                      </Text>
                    </LinearGradient>
                  </BlurView>
                </View>

                <View style={styles.conceptCard}>
                  <BlurView intensity={30} style={styles.conceptBlur}>
                    <LinearGradient
                      colors={['rgba(255,0,255,0.2)', 'rgba(255,0,255,0.05)']}
                      style={styles.conceptGradient}
                    >
                      <Text style={styles.conceptTitle}>Fusion（融合）</Text>
                      <Text style={styles.conceptText}>
                        旅というリアルな体験と、AIアプリ開発というデジタルな創造。
                        世界中のユーザーと私たちの想いを「融合」させる
                      </Text>
                    </LinearGradient>
                  </BlurView>
                </View>

                <View style={styles.conceptCard}>
                  <BlurView intensity={30} style={styles.conceptBlur}>
                    <LinearGradient
                      colors={['rgba(255,255,0,0.2)', 'rgba(255,255,0,0.05)']}
                      style={styles.conceptGradient}
                    >
                      <Text style={styles.conceptTitle}>AI</Text>
                      <Text style={styles.conceptText}>
                        私たちの未来を切り拓き、無限の可能性を生み出す事業の核
                      </Text>
                    </LinearGradient>
                  </BlurView>
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>

          {/* Features Section with Grid Background */}
          <View style={styles.featuresContainer}>
            <ImageBackground source={japanImages.explore3} style={styles.featuresBackground}>
              <LinearGradient
                colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.95)']}
                style={styles.featuresOverlay}
              >
                <View style={styles.featuresSection}>
                  <Text style={styles.featuresSectionTitle}>アプリの特徴</Text>

                  <View style={styles.featureRow}>
                    <BlurView intensity={50} style={styles.featureBlur}>
                      <LinearGradient
                        colors={['rgba(0,255,255,0.1)', 'rgba(0,255,255,0.05)']}
                        style={styles.featureCard}
                      >
                        <Text style={styles.featureIcon}>🅿️</Text>
                        <Text style={styles.featureTitle}>駐車場検索</Text>
                        <Text style={styles.featureDesc}>全国のコインパーキングを瞬時に検索</Text>
                      </LinearGradient>
                    </BlurView>

                    <BlurView intensity={50} style={styles.featureBlur}>
                      <LinearGradient
                        colors={['rgba(255,0,255,0.1)', 'rgba(255,0,255,0.05)']}
                        style={styles.featureCard}
                      >
                        <Text style={styles.featureIcon}>💰</Text>
                        <Text style={styles.featureTitle}>料金計算</Text>
                        <Text style={styles.featureDesc}>時間に応じた料金を自動計算</Text>
                      </LinearGradient>
                    </BlurView>
                  </View>

                  <View style={styles.featureRow}>
                    <BlurView intensity={50} style={styles.featureBlur}>
                      <LinearGradient
                        colors={['rgba(255,255,0,0.1)', 'rgba(255,255,0,0.05)']}
                        style={styles.featureCard}
                      >
                        <Text style={styles.featureIcon}>🏪</Text>
                        <Text style={styles.featureTitle}>周辺施設</Text>
                        <Text style={styles.featureDesc}>コンビニ・温泉・GSも表示</Text>
                      </LinearGradient>
                    </BlurView>

                    <BlurView intensity={50} style={styles.featureBlur}>
                      <LinearGradient
                        colors={['rgba(0,255,0,0.1)', 'rgba(0,255,0,0.05)']}
                        style={styles.featureCard}
                      >
                        <Text style={styles.featureIcon}>⭐</Text>
                        <Text style={styles.featureTitle}>レビュー</Text>
                        <Text style={styles.featureDesc}>ユーザーの口コミで最適な選択</Text>
                      </LinearGradient>
                    </BlurView>
                  </View>
                </View>
              </LinearGradient>
            </ImageBackground>
          </View>

          {/* CTA Section with Epic Background */}
          <ImageBackground source={japanImages.discover4} style={styles.ctaBackground}>
            <LinearGradient
              colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)']}
              style={styles.ctaOverlay}
            >
              <View style={styles.ctaSection}>
                <LinearGradient
                  colors={['#00ffff', '#ff00ff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ctaGradient}
                >
                  <Text style={styles.ctaTitle}>さあ、あなたも私たちと一緒に、</Text>
                  <Text style={styles.ctaSubtitle}>後悔しない人生という名の冒険へ</Text>
                  <Text style={styles.ctaSubtitle}>出発しませんか？</Text>
                </LinearGradient>
              </View>
            </LinearGradient>
          </ImageBackground>

          {/* Contact & SNS Section */}
          <View style={styles.contactSection}>
            <Text style={styles.contactTitle}>お問い合わせ・SNS</Text>

            {/* Email */}
            <TouchableOpacity
              style={styles.contactCard}
              onPress={() => openURL('mailto:trailfusionai@gmail.com')}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                style={styles.contactGradient}
              >
                <View style={styles.contactIconContainer}>
                  <LinearGradient
                    colors={['#00ffff', '#0099ff']}
                    style={styles.contactIconGradient}
                  >
                    <Ionicons name="mail-outline" size={20} color="#fff" />
                  </LinearGradient>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>メールアドレス</Text>
                  <Text style={styles.contactValue}>trailfusionai@gmail.com</Text>
                </View>
                <Ionicons name="open-outline" size={16} color="#00ffff" />
              </LinearGradient>
            </TouchableOpacity>

            {/* YouTube */}
            <TouchableOpacity
              style={styles.contactCard}
              onPress={() => openURL('https://www.youtube.com/@van_oasis')}
            >
              <LinearGradient
                colors={['rgba(255,0,0,0.1)', 'rgba(255,0,0,0.02)']}
                style={styles.contactGradient}
              >
                <View style={styles.contactIconContainer}>
                  <LinearGradient
                    colors={['#FF0000', '#CC0000']}
                    style={styles.contactIconGradient}
                  >
                    <Ionicons name="logo-youtube" size={20} color="#fff" />
                  </LinearGradient>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>YouTube</Text>
                  <Text style={styles.contactValue}>TrailFusion AI チャンネル</Text>
                </View>
                <Ionicons name="open-outline" size={16} color="#FF0000" />
              </LinearGradient>
            </TouchableOpacity>

            {/* TikTok */}
            <TouchableOpacity
              style={styles.contactCard}
              onPress={() => openURL('https://www.tiktok.com/@trailfusionai')}
            >
              <LinearGradient
                colors={['rgba(255,0,255,0.1)', 'rgba(255,0,255,0.02)']}
                style={styles.contactGradient}
              >
                <View style={styles.contactIconContainer}>
                  <LinearGradient
                    colors={['#ff00ff', '#ff0080']}
                    style={styles.contactIconGradient}
                  >
                    <Ionicons name="musical-notes-outline" size={20} color="#fff" />
                  </LinearGradient>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>TikTok</Text>
                  <Text style={styles.contactValue}>@trailfusionai</Text>
                </View>
                <Ionicons name="open-outline" size={16} color="#ff00ff" />
              </LinearGradient>
            </TouchableOpacity>

            {/* X (Twitter) */}
            <TouchableOpacity
              style={styles.contactCard}
              onPress={() => openURL('https://x.com/trailfusionai')}
            >
              <LinearGradient
                colors={['rgba(29,161,242,0.1)', 'rgba(29,161,242,0.02)']}
                style={styles.contactGradient}
              >
                <View style={styles.contactIconContainer}>
                  <LinearGradient
                    colors={['#1DA1F2', '#0E71C8']}
                    style={styles.contactIconGradient}
                  >
                    <Ionicons name="logo-twitter" size={20} color="#fff" />
                  </LinearGradient>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>X (旧Twitter)</Text>
                  <Text style={styles.contactValue}>@trailfusionai</Text>
                </View>
                <Ionicons name="open-outline" size={16} color="#1DA1F2" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Links Section */}
          <View style={styles.linksSection}>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => openURL('https://trailfusionai.com/')}
            >
              <BlurView intensity={80} style={styles.linkBlur}>
                <Ionicons name="globe-outline" size={20} color="#00ffff" />
                <Text style={styles.linkText}>公式ウェブサイト</Text>
                <Ionicons name="open-outline" size={16} color="#00ffff" />
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Terms')}
            >
              <BlurView intensity={80} style={styles.linkBlur}>
                <Ionicons name="document-text-outline" size={20} color="#ff00ff" />
                <Text style={styles.linkText}>利用規約</Text>
                <Ionicons name="chevron-forward" size={20} color="#ff00ff" />
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Privacy')}
            >
              <BlurView intensity={80} style={styles.linkBlur}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#ff00ff" />
                <Text style={styles.linkText}>プライバシーポリシー</Text>
                <Ionicons name="chevron-forward" size={20} color="#ff00ff" />
              </BlurView>
            </TouchableOpacity>
          </View>

          {/* Copyright with Final Image */}
          <ImageBackground source={japanImages.culture3} style={styles.copyrightBackground}>
            <LinearGradient
              colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
              style={styles.copyrightOverlay}
            >
              <View style={styles.copyright}>
                <Text style={styles.copyrightText}>© 2025 Trail×fusion×AI</Text>
                <Text style={styles.copyrightSubtext}>Innovating from the Road</Text>
              </View>
            </LinearGradient>
          </ImageBackground>
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 2,
  },
  heroContainer: {
    height: SCREEN_HEIGHT * 0.7,
    overflow: 'hidden',
  },
  parallaxImage: {
    height: SCREEN_HEIGHT * 0.85,
  },
  heroBackground: {
    flex: 1,
    width: '100%',
  },
  heroOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  brandGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    marginBottom: 30,
  },
  brandLogo: {
    width: 30,
    height: 30,
    borderRadius: 8,
    marginRight: 12,
  },
  contactSection: {
    marginTop: 40,
    paddingHorizontal: 20,
  },
  contactTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  contactCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  contactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
    borderRadius: 16,
  },
  contactIconContainer: {
    marginRight: 12,
  },
  contactIconGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  brandText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1,
  },
  brandX: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000',
    marginHorizontal: 8,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 12,
    textShadowColor: 'rgba(0,255,255,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  versionBadge: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.5)',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  versionText: {
    fontSize: 12,
    color: '#00ffff',
    fontWeight: '600',
  },
  founderSection: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  founderSectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 4,
  },
  founderCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  founderGradient: {
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  founderImageContainer: {
    marginBottom: 20,
  },
  founderImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(0,255,255,0.5)',
  },
  founderImageIcon: {
    fontSize: 60,
  },
  founderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'rgba(0,255,255,0.5)',
  },
  founderName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  founderTitle: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  founderMessage: {
    fontSize: 16,
    color: '#00ffff',
    fontWeight: '600',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  storySection: {
    paddingVertical: 20,
  },
  storySectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 4,
    paddingHorizontal: 20,
  },
  storyImageCard: {
    height: 280,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  storyCardOverlay: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  storyText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 28,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  highlightImageCard: {
    height: 320,
    marginHorizontal: 16,
    marginVertical: 30,
    borderRadius: 20,
    overflow: 'hidden',
  },
  highlightOverlay: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyHighlightText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 32,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  visionBackground: {
    marginTop: 20,
    minHeight: 600,
  },
  visionOverlay: {
    flex: 1,
    paddingVertical: 40,
  },
  visionSection: {
    paddingHorizontal: 20,
  },
  visionTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(255,0,255,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  visionSubtitle: {
    fontSize: 14,
    color: '#ddd',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  conceptCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  conceptBlur: {
    borderRadius: 16,
  },
  conceptGradient: {
    padding: 20,
  },
  conceptTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  conceptText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 22,
  },
  featuresContainer: {
    marginTop: 20,
  },
  featuresBackground: {
    minHeight: 400,
  },
  featuresOverlay: {
    flex: 1,
    paddingVertical: 40,
  },
  featuresSection: {
    paddingHorizontal: 20,
  },
  featuresSectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 4,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  featureBlur: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  featureCard: {
    padding: 20,
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDesc: {
    fontSize: 12,
    color: '#ddd',
    textAlign: 'center',
    lineHeight: 18,
  },
  ctaBackground: {
    marginTop: 20,
    height: 400,
  },
  ctaOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaSection: {
    paddingHorizontal: 20,
    width: '100%',
  },
  ctaGradient: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
  },
  ctaSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    lineHeight: 28,
  },
  linksSection: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  linkButton: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  linkBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  linkText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
    fontWeight: '600',
  },
  copyrightBackground: {
    height: 200,
  },
  copyrightOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyright: {
    alignItems: 'center',
  },
  copyrightText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 4,
  },
  copyrightSubtext: {
    fontSize: 12,
    color: '#aaa',
    fontStyle: 'italic',
  },
});