# Google認証の設定手順

## 1. Google Cloud Consoleでの設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを作成または選択
3. 「APIとサービス」→「認証情報」を開く
4. 「認証情報を作成」→「OAuth クライアント ID」を選択
5. アプリケーションの種類で「ウェブ アプリケーション」を選択
6. 以下の設定を行う：
   - 名前: `CAR Concierge App`
   - 承認済みのJavaScript生成元:
     ```
     https://jhqnypyxrkwdrgutzttf.supabase.co
     ```
   - 承認済みのリダイレクトURI:
     ```
     https://jhqnypyxrkwdrgutzttf.supabase.co/auth/v1/callback
     car-concierge-app://auth/callback
     exp://192.168.1.100:8081 (開発用)
     ```
7. 作成後、Client IDとClient Secretをコピー

## 2. Supabaseダッシュボードでの設定

1. [Supabase Dashboard](https://supabase.com/dashboard/project/jhqnypyxrkwdrgutzttf)にアクセス
2. 「Authentication」→「Providers」を選択
3. 「Google」を見つけて「Enable」をオン
4. 以下を設定：
   - **Client ID**: Google Consoleでコピーした値
   - **Client Secret**: Google Consoleでコピーした値
   - **Redirect URL**: 自動生成される値をGoogle Consoleに追加
5. 「Save」をクリック

## 3. アプリケーションの設定

### 環境変数の追加 (.env)
```env
# 既存の設定
EXPO_PUBLIC_SUPABASE_URL=https://jhqnypyxrkwdrgutzttf.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Google OAuth用（必要に応じて）
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

### app.json の更新
```json
{
  "expo": {
    "scheme": "car-concierge-app",
    "ios": {
      "bundleIdentifier": "com.carconcierge.app",
      "infoPlist": {
        "CFBundleURLTypes": [
          {
            "CFBundleURLSchemes": ["car-concierge-app"]
          }
        ]
      }
    },
    "android": {
      "package": "com.carconcierge.app",
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [{
            "scheme": "car-concierge-app",
            "host": "auth",
            "pathPrefix": "/callback"
          }],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

## 4. テスト用の認証情報（開発環境）

開発環境でテストする場合：

1. Expo Goアプリを使用している場合:
   - `exp://` スキームが自動的に使用される
   - Google Consoleに開発用URLを追加する

2. スタンドアロンアプリの場合:
   - `car-concierge-app://` スキームが使用される
   - プロダクションビルドで動作確認

## 5. トラブルシューティング

### よくある問題と解決方法

#### 「redirect_uri_mismatch」エラー
- Google ConsoleのリダイレクトURIが正しく設定されているか確認
- Supabaseのダッシュボードに表示されるCallback URLをGoogle Consoleに追加

#### 認証後にアプリに戻らない
- app.jsonのscheme設定を確認
- iOS/Androidのディープリンク設定を確認

#### 「invalid_client」エラー
- Client IDとClient Secretが正しくコピーされているか確認
- Supabaseダッシュボードで保存されているか確認

## 6. 本番環境への移行

1. Google Consoleで本番用のOAuth認証情報を作成
2. Supabaseの本番プロジェクトに設定
3. アプリのビルド設定を本番用に更新
4. App Store/Google Playのアプリ設定でURLスキームを登録

## セキュリティに関する注意事項

- Client Secretは絶対にクライアントアプリに含めない
- 環境変数は.gitignoreに含める
- 本番環境では必ずHTTPSを使用する