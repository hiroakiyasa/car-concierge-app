import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * AsyncStorageからExpo SecureStoreへセッションデータを移行
 *
 * このスクリプトは一度だけ実行され、既存のユーザーのセッションデータを
 * AsyncStorage（平文）からSecureStore（暗号化）に移行します。
 */
export async function migrateAuthStorage(): Promise<void> {
  if (Platform.OS === 'web') {
    console.log('🔐 Migration: Web環境のためスキップ');
    return;
  }

  try {
    console.log('🔐 Migration: 開始');

    // AsyncStorageからSupabaseのセッションキーを取得
    // プロジェクトURLに基づくキー名
    const sessionKey = 'sb-jhqnypyxrkwdrgutzttf-auth-token';
    const oldSession = await AsyncStorage.getItem(sessionKey);

    if (!oldSession) {
      console.log('🔐 Migration: 移行対象のセッションなし');

      // 念のため、ユーザー情報もチェック
      const oldUser = await AsyncStorage.getItem('user');
      if (oldUser) {
        console.log('🔐 Migration: 古いユーザー情報を削除');
        await AsyncStorage.removeItem('user');
      }

      return;
    }

    console.log('🔐 Migration: 古いセッション発見、SecureStoreに移行中', {
      sessionKeyLength: oldSession.length
    });

    // SecureStoreに保存
    // 注意: SecureStoreは2048バイト制限があるため、
    // secure-storage.tsのAdapterで自動的にフォールバックされる
    await SecureStore.setItemAsync(sessionKey, oldSession);

    console.log('🔐 Migration: SecureStoreへの保存完了');

    // AsyncStorageから削除
    await AsyncStorage.removeItem(sessionKey);
    await AsyncStorage.removeItem('user'); // 古いユーザー情報も削除
    await AsyncStorage.removeItem('supabase.auth.token'); // レガシーキーも削除

    console.log('✅ Migration: 完了 - AsyncStorageから削除済み');
  } catch (error) {
    console.error('💥 Migration: エラー', error);

    // エラーが発生しても、アプリは継続する
    // 最悪の場合、ユーザーは再ログインが必要になるだけ
  }
}

/**
 * 移行が完了したかどうかを確認
 *
 * これにより、移行スクリプトを複数回実行しても安全
 */
export async function isMigrationComplete(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return true; // Web環境では移行不要
  }

  try {
    const sessionKey = 'sb-jhqnypyxrkwdrgutzttf-auth-token';
    const oldSession = await AsyncStorage.getItem(sessionKey);

    // AsyncStorageにセッションが残っていなければ移行完了
    return !oldSession;
  } catch (error) {
    console.error('💥 Migration check: エラー', error);
    return false;
  }
}
