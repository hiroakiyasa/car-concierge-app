import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import Constants from 'expo-constants';

// 本番ビルドではprocess.envが使えないので、Constants.expoConfigから取得
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase config missing:', {
    supabaseUrl: !!supabaseUrl,
    supabaseAnonKey: !!supabaseAnonKey,
    extra: Constants.expoConfig?.extra
  });
  throw new Error(
    'Missing Supabase config: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Set them in .env for dev and in EAS build env for production.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Supabase Authの自動リフレッシュを管理
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
