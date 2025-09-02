import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MapScreen } from '@/screens/MapScreen';
import { SpotDetailScreen } from '@/screens/SpotDetailScreen';
import { SplashScreen } from '@/screens/SplashScreen';
import { TestMapBounds } from '@/screens/TestMapBounds';
import { TestDataFetch } from '@/screens/TestDataFetch';
import { DebugSupabase } from '@/screens/DebugSupabase';
import { TestOperatingHours } from '@/screens/TestOperatingHours';
import { TestNearbyData } from '@/screens/TestNearbyData';
import TestParkingFeeAdvanced from '@/screens/TestParkingFeeAdvanced';
// Auth screens
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { SignUpScreen } from '@/screens/auth/SignUpScreen';
import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';
// Main screens
import { ProfileScreen } from '@/screens/ProfileScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { HelpScreen } from '@/screens/HelpScreen';
import { AboutScreen } from '@/screens/AboutScreen';
import { FavoritesScreen } from '@/screens/FavoritesScreen';
import { MyReviewsScreen } from '@/screens/MyReviewsScreen';
import { PremiumScreen } from '@/screens/PremiumScreen';

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
  const [isSplashComplete, setIsSplashComplete] = useState(false);

  if (!isSplashComplete) {
    return (
      <SplashScreen onComplete={() => setIsSplashComplete(true)} />
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
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
            
            {/* Main Screens */}
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Help" component={HelpScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
            <Stack.Screen name="Favorites" component={FavoritesScreen} />
            <Stack.Screen name="MyReviews" component={MyReviewsScreen} />
            <Stack.Screen name="Premium" component={PremiumScreen} />
            
            {/* Test Screens */}
            <Stack.Screen name="TestMap" component={TestMapBounds} />
            <Stack.Screen name="TestData" component={TestDataFetch} />
            <Stack.Screen name="DebugSupabase" component={DebugSupabase} />
            <Stack.Screen name="TestHours" component={TestOperatingHours} />
            <Stack.Screen name="TestNearby" component={TestNearbyData} />
            <Stack.Screen name="TestParkingFee" component={TestParkingFeeAdvanced} />
            
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
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
