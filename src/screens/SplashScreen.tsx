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
        {/* 動画の影を演出 */}
        <View style={styles.videoShadow}>
          <View style={styles.videoWrapper}>
            <Video
              ref={videoRef}
              // MP4ファイルを使用（全プラットフォーム対応）
              source={require('../../assets/flush_movie.mp4')}
              style={styles.videoSquare}
              resizeMode={ResizeMode.CONTAIN}
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
          </View>
        </View>
        
        {/* ブランドテキスト */}
        <View style={styles.brandContainer}>
          <Text style={styles.brandTitle}>CAR</Text>
          <Text style={styles.brandSubtitle}>CONCIERGE</Text>
          <View style={styles.brandDivider} />
          <Text style={styles.brandTagline}>Premium Parking Service</Text>
        </View>
      </View>
    );
  }

  // フォールバック: アニメーション付きスプラッシュ
  return (
    <View style={[styles.container, styles.fallbackContainer]}>
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
          <Text style={styles.fallbackTitle}>CAR</Text>
          <Text style={styles.fallbackTitle}>CONCIERGE</Text>
          <View style={styles.brandDivider} />
          <Text style={styles.fallbackTagline}>Premium Parking Service</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', // 真っ白な背景
  },
  fallbackContainer: {
    backgroundColor: '#F8F8F8',
  },
  videoShadow: {
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 15,
    },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
  },
  videoWrapper: {
    width: SCREEN_WIDTH * 0.8,  // 画面横幅の80%
    height: SCREEN_WIDTH * 0.8, // 正方形にする
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: 20, // 角を少し丸める
    overflow: 'hidden',
  },
  videoSquare: {
    width: '100%',
    height: '100%',
  },
  brandContainer: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#1A1A1A',
    letterSpacing: 8,
    marginBottom: -5,
  },
  brandSubtitle: {
    fontSize: 32,
    fontWeight: '300',
    color: '#2A2A2A',
    letterSpacing: 6,
    marginBottom: 15,
  },
  brandDivider: {
    width: 60,
    height: 2,
    backgroundColor: '#1A1A1A',
    marginVertical: 15,
  },
  brandTagline: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A4A4A',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoBackground: {
    width: 180,
    height: 180,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 15,
  },
  logo: {
    width: 140,
    height: 140,
  },
  textContainer: {
    alignItems: 'center',
  },
  fallbackTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: '#1A1A1A',
    letterSpacing: 6,
    marginBottom: 2,
  },
  fallbackTagline: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4A4A4A',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  // 削除された未使用のスタイル
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