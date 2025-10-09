import { ExpoConfig, ConfigContext } from 'expo/config';

// Bare（ios/androidフォルダあり）環境向けに、ネイティブ同期対象のフィールドを削除した最小構成
export default ({ config }: ConfigContext): ExpoConfig => ({
  name: '車旅コンシェルジュ',
  slug: 'car-concierge-app',
  version: '1.0.0',
  scheme: 'car-concierge-app',
  jsEngine: 'hermes',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0B1220',
  },
  android: {
    package: 'com.hiroakiyasa.carconciergeapp',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#0B1220',
    },
  },
  ios: {
    bundleIdentifier: 'com.carconciege.app',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#0B1220',
    },
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
    output: 'static',
  },
  extra: {
    eas: {
      projectId: 'faf23c02-6ed4-4585-bd02-6c6e5130890c'
    },
    // 環境変数をextraフィールドに移動（EASビルド時はprocess.envが使えないため）
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://jhqnypyxrkwdrgutzttf.supabase.co',
    supabaseAnonKey:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW55cHl4cmt3ZHJndXR6dHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNTk5MjIsImV4cCI6MjA3MDczNTkyMn0.VdbVtE_sIlCFjQd1OAgmyYVoi-uoGVbjKQvdMIgJ5qY'
  },
  owner: 'hiroakiyasa'
});
