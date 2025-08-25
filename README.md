# CAR Concierge App

ExpoとReact Nativeで構築された駐車場検索アプリケーション

## 機能

- 🗺️ 地図上で駐車場・施設を検索
- 🅿️ コインパーキングの料金ランキング表示
- 🏪 コンビニ、♨️ 温泉、⛽ ガソリンスタンドなど複数カテゴリー対応
- 📍 現在地からの距離計算
- 💰 駐車料金の自動計算
- 🔄 Supabaseによるリアルタイムデータ同期

## セットアップ

### 必要要件
- Node.js 16+
- Expo CLI
- iOS/Android シミュレーター or Expo Go アプリ

### インストール
```bash
npm install
```

### 環境変数
`.env` ファイルに以下を設定:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

### 起動
```bash
# 開発サーバー起動
npx expo start

# iOS
npx expo run:ios

# Android
npx expo run:android

# Web
npx expo start --web
```

## プロジェクト構造
```
src/
├── components/     # UIコンポーネント
├── screens/        # 画面コンポーネント
├── services/       # API・サービス
├── stores/         # 状態管理(Zustand)
├── types/          # TypeScript型定義
└── utils/          # ユーティリティ
```

## 技術スタック
- Expo SDK 50
- React Native 0.73
- TypeScript
- Zustand (状態管理)
- React Query (データフェッチング)
- Supabase (バックエンド)
- React Native Maps