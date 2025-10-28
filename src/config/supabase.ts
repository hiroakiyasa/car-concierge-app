import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import ExpoSecureStoreAdapter from './secure-storage';

// Expo TestFlight/Store では Constants.expoConfig は利用できないため、process.env を信頼する
// EAS ビルド時に EXPO_PUBLIC_* が JS に埋め込まれる前提
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔧 Supabase設定初期化（Expo SecureStore使用）:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'なし',
  keyPrefix: supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'なし'
});

if (!supabaseUrl || !supabaseAnonKey) {
  // 本番で throw すると白画面になるため、ログのみに留める
  console.error('💥💥💥 [Supabase] 環境変数が設定されていません！');
  console.error('[Supabase] Missing config: set EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY in EAS env');
  console.error('[Supabase] .envファイルを確認してください');
}

console.log('🔧 Supabaseクライアント作成中...');
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    storage: ExpoSecureStoreAdapter as any, // ✅ SecureStoreに変更（iOS: Keychain, Android: KeyStore）
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
console.log('✅ Supabaseクライアント作成完了（SecureStore使用）');

// 起動時に古いセッションをクリーンアップ（非同期処理）
(async () => {
  try {
    const { error } = await supabase.auth.getSession();
    if (error) {
      if (error.message?.includes('Refresh Token') ||
          error.message?.includes('Invalid') ||
          error.name === 'AuthApiError') {
        console.log('🔧 Supabase: 起動時に古いセッションを検出、クリーンアップ実行');
        await supabase.auth.signOut();
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('supabase.auth.token');
        console.log('✅ Supabase: セッションクリーンアップ完了');
      }
    }
  } catch (err) {
    console.error('🔧 Supabase: セッションチェックエラー（無視）:', err);
  }
})();

// Supabase Authの自動リフレッシュを管理
// アプリがフォアグラウンドにいる間、セッションを自動的にリフレッシュ
// これにより、onAuthStateChangeイベントでTOKEN_REFRESHEDまたはSIGNED_OUTイベントを受信し続ける
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

// Database types
export type Database = {
  public: {
    Tables: {
      parking_spots: {
        Row: {
          id: string;
          name: string;
          lat: number;
          lng: number;
          category: string;
          address: string | null;
          rates: any;
          hours: any;
          capacity: number | null;
          elevation: number | null;
          created_at: string;
          type?: string;
          description?: string;
          rating?: number;
          payment_methods?: string;
          restrictions?: string;
        };
        Insert: Omit<Database['public']['Tables']['parking_spots']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['parking_spots']['Insert']>;
      };
      convenience_stores: {
        Row: {
          id: string;
          name: string;
          lat: number;
          lng: number;
          category: string;
          address: string | null;
          sub_type?: string;
          phone_number?: string;
          operating_hours?: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['convenience_stores']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['convenience_stores']['Insert']>;
      };
      hot_springs: {
        Row: {
          id: string;
          name: string;
          lat: number;
          lng: number;
          category: string;
          address: string | null;
          price?: string;
          operating_hours?: string;
          holiday_info?: string;
          facility_type?: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['hot_springs']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['hot_springs']['Insert']>;
      };
      gas_stations: {
        Row: {
          id: string;
          name: string;
          lat: number;
          lng: number;
          category: string;
          address: string | null;
          brand?: string;
          services?: string[];
          operating_hours?: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['gas_stations']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['gas_stations']['Insert']>;
      };
      festivals: {
        Row: {
          id: string;
          name: string;
          lat: number;
          lng: number;
          category: string;
          address: string | null;
          event_date?: string;
          description?: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['festivals']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['festivals']['Insert']>;
      };
    };
  };
};
