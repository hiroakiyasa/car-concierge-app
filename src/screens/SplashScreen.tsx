import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, Image } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/utils/constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [showVideo, setShowVideo] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<Video>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    console.log('スプラッシュスクリーン開始');
    
    // 2秒後に必ず地図画面へ遷移
    timeoutRef.current = setTimeout(() => {
      console.log('2秒経過 - 地図画面へ遷移');
      onComplete();
    }, 2000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onComplete]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      // 動画が2秒に達したら遷移
      if (status.positionMillis && status.positionMillis >= 2000) {
        console.log('動画2秒経過 - 遷移');
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        onComplete();
      }
      
      // 動画が終了した場合も遷移
      if (status.didJustFinish) {
        console.log('動画再生完了 - 遷移');
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        onComplete();
      }
    }
  };

  const handleError = (error: string) => {
    console.error('動画再生エラー:', error);
    setVideoError(true);
    setShowVideo(false);
  };

  // 動画が表示できる場合
  if (showVideo && !videoError) {
    return (
      <View style={styles.container}>
        <Video
          ref={videoRef}
          // MP4ファイルを使用（全プラットフォーム対応）
          source={require('../../assets/flush_movie.mp4')}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping={false}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onError={handleError}
          volume={1.0}
          isMuted={false}
          useNativeControls={false}
          onLoad={(status) => {
            console.log('動画ロード成功');
          }}
          onLoadStart={() => {
            console.log('動画ロード開始');
          }}
        />
        
        {/* オーバーレイテキスト */}
        <View style={styles.overlay}>
          <View style={styles.overlayContainer}>
            <Text style={styles.overlayTitle}>Car Concierge</Text>
            <Text style={styles.overlaySubtitle}>駐車場検索アプリ</Text>
          </View>
        </View>
      </View>
    );
  }

  // フォールバック: アニメーション付きスプラッシュ
  return (
    <LinearGradient
      colors={[Colors.primaryDark, Colors.primary, Colors.primaryLight]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoBackground}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Car Concierge</Text>
          <Text style={styles.subtitle}>駐車場検索アプリ</Text>
          
          <View style={styles.loadingContainer}>
            <View style={styles.loadingDot} />
            <View style={[styles.loadingDot, styles.loadingDotCenter]} />
            <View style={styles.loadingDot} />
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>最寄りの駐車場を簡単検索</Text>
        <Text style={styles.copyrightText}>Powered by AI</Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.black,
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  overlay: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  overlayContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 25,
    alignItems: 'center',
  },
  overlayTitle: {
    color: Colors.white,
    fontSize: 36,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: 5,
  },
  overlaySubtitle: {
    color: Colors.white,
    fontSize: 18,
    opacity: 0.95,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 30,
  },
  logoBackground: {
    width: 180,
    height: 180,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  logo: {
    width: 140,
    height: 140,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    color: Colors.white,
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    color: Colors.white,
    fontSize: 20,
    opacity: 0.95,
    marginBottom: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.white,
    marginHorizontal: 5,
    opacity: 0.6,
  },
  loadingDotCenter: {
    opacity: 0.8,
    transform: [{ scale: 1.2 }],
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  footerText: {
    color: Colors.white,
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 5,
  },
  copyrightText: {
    color: Colors.white,
    fontSize: 12,
    opacity: 0.6,
  },
});