import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/stores/useAuthStore';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MapScreen } from '@/screens/MapScreen';
import { SpotDetailScreen } from '@/screens/SpotDetailScreen';
import { TestMapBounds } from '@/screens/TestMapBounds';
import { TestDataFetch } from '@/screens/TestDataFetch';
import { DebugSupabase } from '@/screens/DebugSupabase';
import { TestOperatingHours } from '@/screens/TestOperatingHours';
import { TestNearbyData } from '@/screens/TestNearbyData';
import TestParkingFeeAdvanced from '@/screens/TestParkingFeeAdvanced';
import { TestAuth } from '@/screens/TestAuth';
// Auth screens
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { SignUpScreen } from '@/screens/auth/SignUpScreen';
import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '@/screens/auth/ResetPasswordScreen';
import { TermsOfServiceScreen } from '@/screens/auth/TermsOfServiceScreen';
// Main screens
import { ProfileScreen } from '@/screens/ProfileScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { HelpScreen } from '@/screens/HelpScreen';
import { AboutScreen } from '@/screens/AboutScreen';
import { FavoritesScreen } from '@/screens/FavoritesScreen';
import { MyReviewsScreen } from '@/screens/MyReviewsScreen';
import { PremiumScreen } from '@/screens/PremiumScreen';
import { TermsScreen } from '@/screens/TermsScreen';
import { PrivacyScreen } from '@/screens/PrivacyScreen';
import { GuideScreen } from '@/screens/GuideScreen';
import { TestParkingType } from '@/screens/TestParkingType';
import { AddParkingScreen } from '@/screens/AddParkingScreen';
import { AdminSubmissionsScreen } from '@/screens/AdminSubmissionsScreen';
import { SplashOverlay } from '@/components/SplashOverlay';
import { useMainStore } from '@/stores/useMainStore';
import { migrateAuthStorage } from '@/utils/migrate-auth-storage';
import { initializeDeepLinkListener, DeepLinkResult } from '@/utils/deep-link-handler';
import { Alert } from 'react-native';

const Stack = createStackNavigator();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
});

export default function App() {
  const initializeAuth = useAuthStore(state => state.initializeAuth);
  const appBootReady = useMainStore(state => state.appBootReady);
  const navigationRef = React.useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    // 認証状態の監視を開始（非同期処理）
    const initAuth = async () => {
      console.log('🚀 App: アプリ初期化開始');

      try {
        // Step 1: AsyncStorage → SecureStore移行（一度だけ実行）
        console.log('🚀 App: セッション移行開始');
        await migrateAuthStorage();
        console.log('🚀 App: セッション移行完了');

        // Step 2: 認証状態の初期化
        console.log('🚀 App: 認証初期化開始');
        await initializeAuth();
        console.log('🚀 App: 認証初期化完了');
      } catch (error) {
        console.error('🚀 App: 初期化エラー:', error);
      }
    };

    initAuth();
  }, [initializeAuth]);

  // Deep link listener for OAuth and password reset
  useEffect(() => {
    console.log('🔗 App: Initializing deep link listener');

    const cleanup = initializeDeepLinkListener((result: DeepLinkResult) => {
      console.log('🔗 App: Deep link handled', { result });

      if (result.success) {
        switch (result.type) {
          case 'oauth_callback':
            Alert.alert(
              'ログイン成功',
              'アカウントにログインしました',
              [{ text: 'OK' }]
            );
            break;

          case 'password_reset':
            console.log('🔗 App: Navigating to ResetPassword screen');
            navigationRef.current?.navigate('ResetPassword' as never);
            break;

          case 'email_verification':
            Alert.alert(
              'メール確認完了',
              'メールアドレスの確認が完了しました',
              [{ text: 'OK' }]
            );
            break;
        }
      } else {
        console.error('🔗 App: Deep link failed', { error: result.error });
        Alert.alert(
          'エラー',
          `リンクの処理に失敗しました: ${result.error}`,
          [{ text: 'OK' }]
        );
      }
    });

    console.log('✅ App: Deep link listener initialized');

    return cleanup;
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="Map" component={MapScreen} />
            
            {/* Auth Screens */}
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
            
            {/* Main Screens */}
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Help" component={HelpScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
            <Stack.Screen name="Favorites" component={FavoritesScreen} />
            <Stack.Screen name="MyReviews" component={MyReviewsScreen} />
            <Stack.Screen name="Premium" component={PremiumScreen} />
            <Stack.Screen name="Terms" component={TermsScreen} />
            <Stack.Screen name="Privacy" component={PrivacyScreen} />
            <Stack.Screen name="Guide" component={GuideScreen} />
            <Stack.Screen name="AddParking" component={AddParkingScreen} />
            <Stack.Screen name="AdminSubmissions" component={AdminSubmissionsScreen} />

            {/* Test Screens */}
            <Stack.Screen name="TestAuth" component={TestAuth} />
            <Stack.Screen name="TestMap" component={TestMapBounds} />
            <Stack.Screen name="TestData" component={TestDataFetch} />
            <Stack.Screen name="DebugSupabase" component={DebugSupabase} />
            <Stack.Screen name="TestHours" component={TestOperatingHours} />
            <Stack.Screen name="TestNearby" component={TestNearbyData} />
            <Stack.Screen name="TestParkingFee" component={TestParkingFeeAdvanced} />
            <Stack.Screen name="TestParkingType" component={TestParkingType} />
            
            <Stack.Screen 
              name="SpotDetail" 
              component={SpotDetailScreen}
              options={{
                presentation: 'modal',
              }}
            />
          </Stack.Navigator>
          <StatusBar style="auto" />
        </NavigationContainer>
        {!appBootReady && <SplashOverlay />}
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
