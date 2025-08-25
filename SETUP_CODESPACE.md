# GitHub Codespaces セットアップガイド

## 🚀 Codespacesでの開発環境構築

### 1. Codespacesを起動

1. GitHubリポジトリ: https://github.com/hiroakiyasa/car-concierge-app
2. 「Code」ボタン → 「Codespaces」タブ
3. 「Create codespace on main」をクリック

### 2. 環境変数の設定

Codespace内のターミナルで：

```bash
# .envファイルを作成
cp .env.example .env

# 以下の情報を.envに追加（エディタで編集）
# EXPO_PUBLIC_SUPABASE_URL=https://jhqnypyxrkwdrgutzttf.supabase.co
# EXPO_PUBLIC_SUPABASE_ANON_KEY=your_service_role_key
```

### 3. 依存関係のインストール

```bash
# Node.jsパッケージをインストール
npm install

# Expo CLIをグローバルにインストール（必要な場合）
npm install -g expo-cli
```

### 4. 開発サーバーの起動

```bash
# Tunnelモードで起動（Codespaces用）
npx expo start --tunnel

# または、Webブラウザで確認
npx expo start --web
```

### 5. モバイルデバイスでのテスト

1. Expo Goアプリをインストール
   - iOS: App Store
   - Android: Google Play

2. ターミナルに表示されるQRコードをスキャン

### 6. よく使うコマンド

```bash
# 開発サーバー起動
npx expo start --tunnel

# キャッシュクリア
npx expo start --clear

# TypeScriptチェック
npx tsc --noEmit

# iOS/Androidビルド（EAS）
eas build --platform ios
eas build --platform android
```

## 📝 注意事項

- Codespacesでは`--tunnel`オプションが必要
- 環境変数は`.env`ファイルで管理
- Supabaseの認証情報は安全に管理すること

## 🔧 トラブルシューティング

### ポート転送エラーの場合
1. Ports タブを確認
2. Port 8081 (または使用中のポート)を Public に設定

### Expo接続エラーの場合
```bash
# Expo アカウントにログイン
npx expo login

# キャッシュクリア
npx expo start --clear
```