# Google OAuth完全設定ガイド

## エラー: 401 invalid_client の解決方法

### ステップ1: Google Cloud Consoleの設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択（または新規作成）
3. **APIs & Services** → **Credentials** に移動

### ステップ2: OAuthクライアントの作成

#### Webアプリケーション用クライアントの作成（必須）
1. **+ CREATE CREDENTIALS** → **OAuth client ID** をクリック
2. **Application type**: `Web application` を選択
3. **Name**: `CAR Concierge Supabase Auth` など
4. **Authorized JavaScript origins**:
   ```
   https://jhqnypyxrkwdrgutzttf.supabase.co
   ```
5. **Authorized redirect URIs**:
   ```
   https://jhqnypyxrkwdrgutzttf.supabase.co/auth/v1/callback
   ```
6. **CREATE** をクリック
7. 表示される **Client ID** と **Client Secret** をコピー

#### iOSクライアントの作成（オプション - アプリ検証用）
1. **+ CREATE CREDENTIALS** → **OAuth client ID** をクリック
2. **Application type**: `iOS` を選択
3. **Bundle ID**: `com.carconciege.app`
4. **CREATE** をクリック
5. 表示される **Client ID** をコピー（Client Secretはありません）

### ステップ3: Supabaseダッシュボードの設定

1. [Supabase Dashboard](https://app.supabase.com/project/jhqnypyxrkwdrgutzttf/auth/providers)にアクセス
2. **Authentication** → **Providers** → **Google** を開く
3. 以下を設定:

```
Google enabled: ON

Client ID (for OAuth): 
[WebアプリケーションのClient IDを入力]

Client Secret (for OAuth):
[WebアプリケーションのClient Secretを入力]

Authorized Client IDs (optional):
[iOSのClient IDを入力（オプション）]

Skip nonce checks: OFF（デフォルトのまま）
```

4. **Save** をクリック

### ステップ4: アプリケーション側の確認

`app.json`のURL schemeが正しいことを確認:
```json
{
  "expo": {
    "scheme": "car-concierge-app",
    "ios": {
      "bundleIdentifier": "com.carconciege.app",
      "infoPlist": {
        "CFBundleURLTypes": [
          {
            "CFBundleURLSchemes": ["car-concierge-app"]
          }
        ]
      }
    }
  }
}
```

### ステップ5: 認証フローの確認

1. アプリでGoogleログインボタンをタップ
2. Googleアカウント選択画面が表示される
3. アカウントを選択
4. アプリにリダイレクトされる
5. 認証成功

## よくある間違いと解決策

### ❌ 間違い1: iOSクライアントのIDを使用
- iOSタイプのOAuthクライアントには**Client Secretがありません**
- SupabaseにはWebアプリケーションタイプが必要です

### ❌ 間違い2: リダイレクトURIの不一致
- Google ConsoleのリダイレクトURIとSupabaseのCallback URLが完全に一致する必要があります
- 末尾のスラッシュ（/）の有無も含めて正確に一致させてください

### ❌ 間違い3: Client IDとClient Secretの入れ違い
- Client IDは長い文字列（例: 123456789-abcdefg.apps.googleusercontent.com）
- Client Secretは短い文字列（例: GOCSPX-xxxxxxxxxxxxx）

## トラブルシューティング

### エラーが継続する場合:

1. **Supabaseの設定を再保存**
   - 設定を変更していなくても、もう一度Saveボタンをクリック

2. **5分待つ**
   - 設定の反映に時間がかかる場合があります

3. **ブラウザのキャッシュをクリア**
   - SafariやChromeのキャッシュをクリア

4. **アプリを完全に再起動**
   ```bash
   # iOS Simulatorの場合
   # Cmd+Shift+H を2回押してアプリスイッチャーを開き、アプリを上にスワイプして終了
   # その後、アプリを再度起動
   ```

5. **新しいシークレットウィンドウで試す**
   - プライベートブラウジングモードで認証を試す

## 設定値の例

### Google Cloud Console
```
Client ID: 262907785661-6tv9v2iq2fsqoef6blq1h1b4s422jg.apps.googleusercontent.com
Client Secret: GOCSPX-AbCdEfGhIjKlMnOpQrStUvWxYz
Redirect URI: https://jhqnypyxrkwdrgutzttf.supabase.co/auth/v1/callback
```

### Supabase Dashboard
```
Client ID: 262907785661-6tv9v2iq2fsqoef6blq1h1b4s422jg.apps.googleusercontent.com
Client Secret: GOCSPX-AbCdEfGhIjKlMnOpQrStUvWxYz
```

## 動作確認チェックリスト

- [ ] Google Cloud ConsoleでWebアプリケーションOAuthクライアントを作成
- [ ] Client IDとClient Secretをコピー
- [ ] SupabaseダッシュボードにClient IDとClient Secretを入力
- [ ] リダイレクトURIが正確に一致している
- [ ] Supabaseで設定を保存
- [ ] 5分待つ
- [ ] アプリを再起動
- [ ] Googleログインをテスト

## サポート

問題が解決しない場合は、以下を確認してください：
- Supabaseプロジェクトの認証設定
- Google Cloud Consoleのプロジェクト設定
- アプリのdeep link設定