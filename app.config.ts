import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  expo: {
    ...config.expo,
    name: '車旅コンシェルジュ',
    slug: 'car-concierge-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'car-concierge-app',
    jsEngine: 'hermes',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#1976d2'
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.carconciege.app',
      buildNumber: '42',
      infoPlist: {
        NSCameraUsageDescription: 'このアプリは駐車場や施設の写真を撮影するためにカメラを使用します。',
        NSPhotoLibraryUsageDescription: 'このアプリは駐車場や施設の写真を選択するために写真ライブラリへのアクセスが必要です。',
        NSPhotoLibraryAddUsageDescription: 'このアプリは撮影した写真を保存するために写真ライブラリへの書き込み権限が必要です。',
        NSLocationWhenInUseUsageDescription: 'このアプリは現在地周辺の駐車場や施設を表示するために位置情報を使用します。',
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: ['car-concierge-app']
          }
        ],
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true
        }
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff'
      },
      package: 'com.carconciege.app',
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE'
      ],
      intentFilters: [
        {
          action: 'VIEW',
          data: [
            {
              scheme: 'car-concierge-app',
              host: 'auth',
              pathPrefix: '/callback'
            }
          ],
          category: ['BROWSABLE', 'DEFAULT']
        }
      ]
    },
    web: {
      favicon: './assets/favicon.png',
      output: 'single'
    },
    assetBundlePatterns: ['**/*'],
    plugins: [
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: 'Allow $(PRODUCT_NAME) to use your location.'
        }
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'このアプリは駐車場や施設の写真を選択するために写真ライブラリへのアクセスが必要です。',
          cameraPermission: 'このアプリは駐車場や施設の写真を撮影するためにカメラを使用します。'
        }
      ],
      [
        'expo-asset',
        {
          assets: ['./assets/flush_movie.mp4', './assets/flush_movie.MOV']
        }
      ],
      'expo-video',
      'expo-web-browser'
    ],
    extra: {
      eas: {
        projectId: 'faf23c02-6ed4-4585-bd02-6c6e5130890c'
      },
      // 環境変数をextraフィールドに移動
      // EASビルド時はprocess.envが使えないため、直接値を設定
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://jhqnypyxrkwdrgutzttf.supabase.co',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW55cHl4cmt3ZHJndXR6dHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNTk5MjIsImV4cCI6MjA3MDczNTkyMn0.VdbVtE_sIlCFjQd1OAgmyYVoi-uoGVbjKQvdMIgJ5qY'
    },
    owner: 'hiroakiyasa'
  }
});