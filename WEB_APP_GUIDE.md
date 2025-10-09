# 車旅コンシェルジュ Webアプリ開発ガイド

**ブランチ**: `web-app`
**作成日**: 2025-10-08

---

## 🎯 概要

このガイドは、既存のReact Native/Expoアプリ（iPhone/Android対応済み）をWebアプリとして展開するための手順とベストプラクティスをまとめたものです。

---

## 📋 前提条件

### ✅ 完了済み
- [x] React Native/Expo アプリの実装完了
- [x] iPhone/Android での動作確認完了
- [x] `web-app` ブランチの作成
- [x] Web設定の追加（`app.config.ts`）
- [x] 必要なパッケージのインストール
  - `react-native-web`: ^0.21.0
  - `react-dom`: 19.1.0

### 🔧 環境要件
- Node.js 18以上
- npm または yarn
- Expo CLI (`npm install -g expo-cli`)

---

## 🚀 Webアプリの起動方法

### 基本的な起動
```bash
cd car-concierge-app
npm run web
```

### 開発サーバー
```bash
npm start
# ブラウザでプロンプトに従い "w" を押してWeb版を起動
```

### ポート指定
```bash
npx expo start --web --port 3000
```

---

## ⚠️ Web対応で注意が必要な機能

### 1. 地図コンポーネント (`react-native-maps`)
**問題**: `react-native-maps` はWeb非対応

**解決策**:
- **オプション1**: Google Maps JavaScript APIを直接使用
- **オプション2**: `react-map-gl` または `@vis.gl/react-google-maps` を使用
- **オプション3**: Platform.select() で条件分岐

```typescript
// 例: 条件分岐の実装
import { Platform } from 'react-native';

const MapComponent = Platform.select({
  web: () => require('./WebMapView').default,
  default: () => require('./NativeMapView').default,
})();
```

**影響範囲**:
- `src/screens/MapScreen.tsx` - メインマップ画面
- `src/components/CustomMarker.tsx` - マーカー表示

### 2. ネイティブモジュール

以下のExpoモジュールは、Webでの動作確認が必要です：

| モジュール | Web対応 | 代替案 |
|----------|--------|--------|
| `expo-location` | ✅ 部分対応 | ブラウザのGeolocation API |
| `expo-image-picker` | ⚠️ 制限あり | HTML5 File Input API |
| `expo-auth-session` | ✅ 対応 | - |
| `expo-web-browser` | ✅ 対応 | - |
| `@react-native-async-storage/async-storage` | ✅ 対応 | localStorage にフォールバック |

### 3. レスポンシブデザイン

**対応が必要な画面**:
- `MapScreen` - 地図表示とパネルのレイアウト
- `RankingListModal` - モーダルの幅調整
- `SpotDetailBottomSheet` - 詳細表示のレイアウト

**実装例**:
```typescript
import { Dimensions, Platform } from 'react-native';

const isWeb = Platform.OS === 'web';
const windowWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    width: isWeb ? Math.min(windowWidth, 1200) : '100%',
    maxWidth: isWeb ? 1200 : undefined,
    alignSelf: isWeb ? 'center' : undefined,
  },
});
```

---

## 🔧 Web専用設定

### 環境変数 (`.env`)
```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://jhqnypyxrkwdrgutzttf.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Google Maps (Web用)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### `app.config.ts` - Web設定
```typescript
web: {
  favicon: './assets/favicon.png',
  bundler: 'metro',
  output: 'static',
},
```

### Faviconの作成
```bash
# assets/favicon.png を作成（推奨サイズ: 32x32 または 48x48）
```

---

## 📱 プラットフォーム固有の実装

### 地図コンポーネントの分岐

```typescript
// src/components/MapView/index.tsx
import { Platform } from 'react-native';

export const MapView = Platform.select({
  web: require('./MapView.web').default,
  default: require('./MapView.native').default,
});
```

### WebMapView.web.tsx の実装例
```typescript
import React from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

interface Props {
  initialRegion: Region;
  markers: MarkerData[];
  onRegionChange: (region: Region) => void;
}

export default function WebMapView({ initialRegion, markers, onRegionChange }: Props) {
  return (
    <LoadScript googleMapsApiKey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <GoogleMap
        zoom={13}
        center={{ lat: initialRegion.latitude, lng: initialRegion.longitude }}
        onBoundsChanged={(map) => {
          // onRegionChange logic
        }}
      >
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={{ lat: marker.latitude, lng: marker.longitude }}
          />
        ))}
      </GoogleMap>
    </LoadScript>
  );
}
```

---

## 🎨 UI/UXの最適化

### 1. ホバーエフェクトの追加
```typescript
import { Pressable } from 'react-native';

<Pressable
  onHoverIn={() => setIsHovered(true)}
  onHoverOut={() => setIsHovered(false)}
  style={({ hovered }) => [
    styles.button,
    hovered && styles.buttonHovered,
  ]}
>
  <Text>ボタン</Text>
</Pressable>
```

### 2. マウスカーソルの変更
```typescript
// Web専用のスタイル
const webStyles = Platform.OS === 'web' ? {
  cursor: 'pointer',
} : {};
```

### 3. キーボードショートカット
```typescript
import { useEffect } from 'react';

useEffect(() => {
  if (Platform.OS !== 'web') return;

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // モーダルを閉じる
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

---

## 🚢 デプロイ方法

### Vercel へのデプロイ（推奨）

1. **ビルド**
```bash
npx expo export:web
```

2. **Vercel設定**
`vercel.json` を作成:
```json
{
  "buildCommand": "cd car-concierge-app && npm run web",
  "outputDirectory": "car-concierge-app/web-build",
  "framework": "react",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

3. **デプロイ**
```bash
vercel --prod
```

### Netlify へのデプロイ

1. **ビルド**
```bash
npx expo export:web
```

2. **`netlify.toml` 作成**
```toml
[build]
  command = "cd car-concierge-app && npx expo export:web"
  publish = "car-concierge-app/web-build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

3. **デプロイ**
```bash
netlify deploy --prod
```

### GitHub Pages へのデプロイ

1. **ビルド**
```bash
npx expo export:web
```

2. **gh-pages インストール**
```bash
npm install --save-dev gh-pages
```

3. **package.json に追加**
```json
{
  "scripts": {
    "deploy": "gh-pages -d web-build"
  },
  "homepage": "https://hiroakiyasa.github.io/car-concierge-app"
}
```

4. **デプロイ**
```bash
npm run deploy
```

---

## 🐛 トラブルシューティング

### 問題1: 地図が表示されない
**原因**: `react-native-maps` がWeb非対応

**解決**:
```bash
npm install @react-google-maps/api
```

### 問題2: AsyncStorage エラー
**原因**: Web版のAsyncStorage実装の違い

**解決**:
```bash
npm install @react-native-async-storage/async-storage
```

### 問題3: スタイリングの崩れ
**原因**: Webでのレイアウト計算の違い

**解決**:
```typescript
// Platform.select() でWeb専用スタイルを適用
const styles = StyleSheet.create({
  container: Platform.select({
    web: { maxWidth: 1200, alignSelf: 'center' },
    default: { width: '100%' },
  }),
});
```

### 問題4: expo-location が動作しない
**原因**: Web版の位置情報API制約

**解決**:
```typescript
if (Platform.OS === 'web') {
  // ブラウザのGeolocation APIを直接使用
  navigator.geolocation.getCurrentPosition(
    (position) => {
      console.log(position.coords);
    },
    (error) => console.error(error),
    { enableHighAccuracy: true }
  );
} else {
  // expo-locationを使用
  const location = await Location.getCurrentPositionAsync();
}
```

---

## 📦 必要なパッケージの追加

### Google Maps for Web
```bash
npm install @react-google-maps/api
npm install --save-dev @types/google.maps
```

### その他の推奨パッケージ
```bash
# レスポンシブデザイン支援
npm install react-native-responsive-screen

# Web専用のルーティング（オプション）
npm install react-router-dom
npm install --save-dev @types/react-router-dom
```

---

## ✅ チェックリスト

### 開発前
- [ ] `web-app` ブランチで作業中
- [ ] 必要なパッケージがインストール済み
- [ ] `.env` ファイルが設定済み

### 実装中
- [ ] `react-native-maps` の代替実装完了
- [ ] レスポンシブデザイン対応完了
- [ ] Platform.select() での条件分岐実装
- [ ] Web専用のスタイル調整完了

### デプロイ前
- [ ] ローカルでの動作確認（`npm run web`）
- [ ] ビルドの成功確認（`npx expo export:web`）
- [ ] 環境変数の設定確認
- [ ] favicon.png の配置確認

### デプロイ後
- [ ] 本番環境での動作確認
- [ ] レスポンシブデザインの確認（モバイル/タブレット/デスクトップ）
- [ ] パフォーマンス測定（Lighthouse）
- [ ] SEO対策の確認

---

## 📚 参考リソース

- [Expo Web ドキュメント](https://docs.expo.dev/workflow/web/)
- [React Native Web](https://necolas.github.io/react-native-web/)
- [Google Maps React](https://github.com/JustFly1984/react-google-maps-api)
- [Expo Platform Differences](https://docs.expo.dev/workflow/customizing/)

---

## 🔄 ブランチ戦略

### masterブランチ
- iPhone/Android対応の安定版
- 本番リリース用

### web-appブランチ（現在のブランチ）
- Webアプリ開発用
- master からマージして最新機能を取り込む

### マージ方法
```bash
# masterの最新変更をweb-appに取り込む
git checkout web-app
git merge master

# web-appの変更をmasterに反映（Webアプリ完成後）
git checkout master
git merge web-app
```

---

## 📞 サポート

問題が発生した場合：
1. このガイドのトラブルシューティングセクションを確認
2. Expo公式ドキュメントを参照
3. GitHubのIssueを検索

---

**最終更新**: 2025-10-08
**バージョン**: 1.0.0
