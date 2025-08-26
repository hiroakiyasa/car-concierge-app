import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MapScreen } from '@/screens/MapScreen';
import { SpotDetailScreen } from '@/screens/SpotDetailScreen';
import { TestMapBounds } from '@/screens/TestMapBounds';
import { TestDataFetch } from '@/screens/TestDataFetch';
import { DebugSupabase } from '@/screens/DebugSupabase';

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
            <Stack.Screen name="TestMap" component={TestMapBounds} />
            <Stack.Screen name="TestData" component={TestDataFetch} />
            <Stack.Screen name="DebugSupabase" component={DebugSupabase} />
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
