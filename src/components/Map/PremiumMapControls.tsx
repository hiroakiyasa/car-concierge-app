import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Text,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/utils/constants';

interface PremiumMapControlsProps {
  onMenuPress: () => void;
  onLocationPress: () => void;
  onRankingPress: () => void;
  searchStatus?: 'idle' | 'searching' | 'complete';
  resultCount?: number;
}

export const PremiumMapControls: React.FC<PremiumMapControlsProps> = ({
  onMenuPress,
  onLocationPress,
  onRankingPress,
  searchStatus = 'idle',
  resultCount = 0,
}) => {
  // Animations
  const buttonSlideAnimation = useRef(new Animated.Value(0)).current;
  const buttonScaleAnimation = useRef(new Animated.Value(0)).current;
  const searchAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;

  // Initialize button animations
  useEffect(() => {
    // Staggered entrance animation
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        // Slide in from right
        Animated.spring(buttonSlideAnimation, {
          toValue: 1,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
        // Scale up with bounce
        Animated.timing(buttonScaleAnimation, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  // Search status animation
  useEffect(() => {
    if (searchStatus === 'searching') {
      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Show search indicator
      Animated.parallel([
        Animated.timing(searchAnimation, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (searchStatus === 'complete') {
      // Stop pulse
      pulseAnimation.stopAnimation();
      pulseAnimation.setValue(1);

      // Show completion
      Animated.sequence([
        Animated.spring(searchAnimation, {
          toValue: 1.2,
          tension: 50,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(searchAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.parallel([
          Animated.timing(searchAnimation, {
            toValue: 0,
            duration: 300,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnimation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      // Hide indicator
      Animated.parallel([
        Animated.timing(searchAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [searchStatus]);

  return (
    <>
      {/* Search Status Indicator */}
      {searchStatus !== 'idle' && (
        <Animated.View
          style={[
            styles.searchStatusContainer,
            {
              opacity: fadeAnimation,
              transform: [
                {
                  translateY: searchAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-30, 0],
                  }),
                },
                { scale: pulseAnimation },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={
              searchStatus === 'searching'
                ? ['#4F8EF7', '#3B7FE8']
                : ['#10B981', '#059669']
            }
            style={styles.searchStatusGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.searchStatusContent}>
              {searchStatus === 'searching' ? (
                <>
                  <ActivityIndicator size="small" color={Colors.white} />
                  <Text style={styles.searchStatusText}>検索中...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                  <Text style={styles.searchStatusText}>
                    {resultCount > 0 ? `${resultCount}件見つかりました` : '検索完了'}
                  </Text>
                </>
              )}
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      {/* Menu Button - Top Right */}
      <Animated.View
        style={[
          styles.menuButtonContainer,
          {
            opacity: buttonSlideAnimation,
            transform: [
              {
                translateX: buttonSlideAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [60, 0],
                }),
              },
              { scale: buttonScaleAnimation },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.premiumButton}
          onPress={onMenuPress}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#4B5563', '#374151']}
            style={styles.buttonGradient}
          >
            <View style={styles.buttonInner}>
              <Ionicons name="menu" size={20} color={Colors.white} />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Location and Ranking Buttons Stack */}
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            opacity: buttonSlideAnimation,
            transform: [
              {
                translateX: buttonSlideAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
              { scale: buttonScaleAnimation },
            ],
          },
        ]}
      >
        {/* Location Button */}
        <TouchableOpacity
          style={styles.premiumButton}
          onPress={onLocationPress}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[Colors.primary, '#3B7FE8']}
            style={styles.buttonGradient}
          >
            <View style={styles.buttonInner}>
              <Ionicons name="navigate" size={20} color={Colors.white} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Ranking Button */}
        <TouchableOpacity
          style={styles.premiumButton}
          onPress={onRankingPress}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[Colors.warning, '#F59E0B']}
            style={styles.buttonGradient}
          >
            <View style={styles.buttonInner}>
              <Ionicons name="trophy" size={18} color={Colors.white} />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  // Search Status Styles
  searchStatusContainer: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    zIndex: 1000,
  },
  searchStatusGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  searchStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchStatusText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Menu Button Container - Top Right
  menuButtonContainer: {
    position: 'absolute',
    right: 8,
    top: 35,
    alignItems: 'center',
  },
  // Button Container Styles
  buttonContainer: {
    position: 'absolute',
    right: 8,
    bottom: 160,
    alignItems: 'center',
    gap: 8,
  },
  premiumButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginVertical: 2,
  },
  buttonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  buttonInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});