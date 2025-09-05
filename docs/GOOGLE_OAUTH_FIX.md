# Google OAuth認証エラーの修正方法

## エラー内容
"The OAuth client was not found" (Error 401: invalid_client)

## 原因
SupabaseダッシュボードでGoogle OAuth認証の設定が不完全または未設定。

## 修正手順

### 1. Supabaseダッシュボードでの設定

1. [Supabase Dashboard](https://app.supabase.com)にログイン
2. プロジェクト「jhqnypyxrkwdrgutzttf」を選択
3. Authentication → Providers → Google を開く

### 2. Google Cloud Consoleでの確認

必要な情報：
- **Client ID**: Webアプリケーション用のOAuthクライアントID
- **Client Secret**: Webアプリケーション用のクライアントシークレット

**重要**: iOSタイプのOAuthクライアントではなく、**Webアプリケーション**タイプのOAuthクライアントを使用する必要があります。

### 3. Google Cloud Consoleでの設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 適切なプロジェクトを選択
3. APIs & Services → Credentials に移動
4. 「OAuth 2.0 Client IDs」セクションで「Webアプリケーション」タイプのクライアントがあるか確認

#### Webアプリケーションクライアントがない場合：
1. 「+ CREATE CREDENTIALS」→「OAuth client ID」をクリック
2. Application type: 「Web application」を選択
3. Name: 「CAR Concierge Web OAuth」など分かりやすい名前を設定
4. Authorized redirect URIs に以下を追加：
   ```
   https://jhqnypyxrkwdrgutzttf.supabase.co/auth/v1/callback
   ```
5. 「CREATE」をクリック
6. 表示されたClient IDとClient Secretをメモ

### 4. Supabaseでの設定入力

1. Supabase Dashboard → Authentication → Providers → Google
2. 以下の情報を入力：
   - **Google enabled**: ONにする
   - **Client ID**: Google Cloud ConsoleのWebアプリケーションのClient ID
   - **Client Secret**: Google Cloud ConsoleのWebアプリケーションのClient Secret
   - **Authorized Client IDs**: 空欄でOK（iOSクライアントIDは不要）
3. 「Save」をクリック

### 5. アプリケーション側の確認

`src/services/auth.service.ts`のGoogleサインイン実装を確認：
- redirectToはSupabaseのcallback URLと一致している必要があります
- URLスキームは`car-concierge-app://`を使用

### 6. テスト手順

1. アプリを再起動
2. ログイン画面で「Googleでログイン」をタップ
3. Googleアカウントを選択
4. 認証が成功し、アプリにリダイレクトされることを確認

## トラブルシューティング

### エラーが継続する場合

1. **ブラウザのキャッシュをクリア**
2. **Supabaseの設定を再保存**
3. **Google Cloud Consoleで承認済みリダイレクトURIを確認**
4. **アプリを完全に再起動（ビルドし直し）**

### よくある間違い

- ❌ iOSタイプのOAuthクライアントのIDを使用
- ❌ Client Secretを間違えている
- ❌ リダイレクトURIの設定ミス
- ✅ WebアプリケーションタイプのOAuthクライアントを使用
- ✅ 正しいClient IDとClient Secretを入力
- ✅ Supabaseのcallback URLを正確に設定

## 注意事項

- Google Cloud ConsoleとSupabaseの両方で設定が必要
- 設定変更後、反映まで数分かかる場合がある
- 開発環境と本番環境で異なるOAuthクライアントを使用することを推奨