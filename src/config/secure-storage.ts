import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Expo SecureStore Adapter for Supabase Auth
 *
 * - iOS/Android: Uses Keychain/KeyStore for encrypted storage
 * - Web: Falls back to AsyncStorage (unencrypted)
 */
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    console.debug('🔐 SecureStore: getItem', { key, platform: Platform.OS });

    if (Platform.OS === 'web') {
      // Web環境ではAsyncStorageにフォールバック
      return AsyncStorage.getItem(key);
    }

    try {
      const value = await SecureStore.getItemAsync(key);
      console.debug('🔐 SecureStore: getItem success', {
        key,
        hasValue: !!value,
        valueLength: value?.length
      });
      return value;
    } catch (error) {
      console.error('🔐 SecureStore: getItem error', { key, error });
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    console.debug('🔐 SecureStore: setItem', {
      key,
      valueLength: value.length,
      platform: Platform.OS
    });

    if (Platform.OS === 'web') {
      // Web環境ではAsyncStorageにフォールバック
      return AsyncStorage.setItem(key, value);
    }

    try {
      // SecureStoreの最大サイズは2048バイト
      if (value.length > 2048) {
        console.warn('🔐 SecureStore: Value size exceeds 2048 bytes', {
          key,
          size: value.length,
          willFallbackToAsyncStorage: true
        });

        // 大きなデータはAsyncStorageにフォールバック
        return AsyncStorage.setItem(key, value);
      }

      await SecureStore.setItemAsync(key, value);
      console.debug('🔐 SecureStore: setItem success', { key });
    } catch (error) {
      console.error('🔐 SecureStore: setItem error', { key, error });

      // エラー時はAsyncStorageにフォールバック
      return AsyncStorage.setItem(key, value);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    console.debug('🔐 SecureStore: removeItem', { key, platform: Platform.OS });

    if (Platform.OS === 'web') {
      // Web環境ではAsyncStorageにフォールバック
      return AsyncStorage.removeItem(key);
    }

    try {
      await SecureStore.deleteItemAsync(key);
      console.debug('🔐 SecureStore: removeItem success', { key });
    } catch (error) {
      console.error('🔐 SecureStore: removeItem error', { key, error });

      // エラー時はAsyncStorageもクリア
      return AsyncStorage.removeItem(key);
    }
  },
};

export default ExpoSecureStoreAdapter;
