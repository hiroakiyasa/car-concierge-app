# Phase 1: Expo SecureStore Migration - Verification Checklist

## ✅ Implementation Complete

All code changes for Phase 1 have been successfully implemented:

1. ✅ Installed `expo-secure-store` package
2. ✅ Added plugin to `app.config.ts`
3. ✅ Created SecureStore adapter (`src/config/secure-storage.ts`)
4. ✅ Updated Supabase client to use SecureStore (`src/config/supabase.ts`)
5. ✅ Created migration script (`src/utils/migrate-auth-storage.ts`)
6. ✅ Integrated migration in `App.tsx`
7. ✅ Rebuilt native projects with `npx expo prebuild --clean`

## 📋 Manual Testing Checklist

When the app runs, verify the following in the console logs:

### 1. App Initialization Logs

Look for these logs in the console when the app starts:

```
🚀 App: アプリ初期化開始
🚀 App: セッション移行開始
🔐 Migration: 開始
```

### 2. Migration Success Logs

**For first-time users or users without existing sessions:**
```
🔐 Migration: 移行対象のセッションなし
🚀 App: セッション移行完了
```

**For existing users with sessions:**
```
🔐 Migration: 古いセッション発見、SecureStoreに移行中
🔐 Migration: SecureStoreへの保存完了
✅ Migration: 完了 - AsyncStorageから削除済み
🚀 App: セッション移行完了
```

### 3. Supabase Client Initialization Logs

```
🔧 Supabase設定初期化（Expo SecureStore使用）: { hasUrl: true, hasKey: true, ... }
✅ Supabaseクライアント作成完了（SecureStore使用）
```

### 4. SecureStore Adapter Logs

When authentication operations occur (login/logout), you should see:

```
🔐 SecureStore: setItem { key: 'sb-jhqnypyxrkwdrgutzttf-auth-token', valueLength: ..., platform: 'ios' }
🔐 SecureStore: setItem success { key: 'sb-jhqnypyxrkwdrgutzttf-auth-token' }
```

Or on web:
```
🔐 SecureStore: setItem { key: 'sb-jhqnypyxrkwdrgutzttf-auth-token', valueLength: ..., platform: 'web' }
(Falls back to AsyncStorage automatically)
```

### 5. Platform-Specific Verification

**iOS:**
- SecureStore should use Keychain (visible in logs as `platform: 'ios'`)
- No fallback to AsyncStorage (unless token exceeds 2048 bytes)

**Android:**
- SecureStore should use KeyStore (visible in logs as `platform: 'android'`)
- No fallback to AsyncStorage (unless token exceeds 2048 bytes)

**Web:**
- SecureStore should fallback to AsyncStorage (visible in logs as `platform: 'web'`)
- Log: `🔐 Migration: Web環境のためスキップ`

## 🧪 Functional Testing

### Test Case 1: New User Login
1. Open app on a fresh install
2. Log in with credentials
3. Verify login success
4. Close and reopen app
5. Verify user remains logged in (session persisted)

**Expected Logs:**
```
🔐 Migration: 移行対象のセッションなし
🔐 SecureStore: setItem (on login)
🔐 SecureStore: getItem (on app reopen)
```

### Test Case 2: Existing User Session Migration
1. (If you have a test device with old app installed)
2. Update to new version with SecureStore
3. Open app
4. Verify user remains logged in (migration successful)

**Expected Logs:**
```
🔐 Migration: 古いセッション発見、SecureStoreに移行中
✅ Migration: 完了 - AsyncStorageから削除済み
```

### Test Case 3: Logout
1. Log in successfully
2. Navigate to Profile screen
3. Tap logout
4. Verify user is logged out
5. Reopen app
6. Verify user remains logged out

**Expected Logs:**
```
🔐 SecureStore: removeItem { key: 'sb-jhqnypyxrkwdrgutzttf-auth-token' }
🔐 SecureStore: removeItem success
```

### Test Case 4: Token Refresh
1. Log in and wait for token to expire (or trigger manually)
2. Verify app automatically refreshes token
3. Check SecureStore logs for token update

**Expected Logs:**
```
🔐 SecureStore: getItem (reading old token)
🔐 SecureStore: setItem (saving new token)
```

## 🔍 Security Verification

### iOS Keychain Verification
On a physical iOS device:
1. Settings → Privacy → Keychain
2. Look for app entry (may not be visible in UI, but keychain is used internally)

### Android KeyStore Verification
On an Android device:
1. Settings → Security → Credential Storage
2. Verify encrypted storage is being used

## ⚠️ Common Issues and Solutions

### Issue: Migration logs not appearing
**Solution:** Check that `migrateAuthStorage()` is being called in `App.tsx` before `initializeAuth()`

### Issue: SecureStore errors on iOS/Android
**Solution:** Verify `expo-secure-store` plugin is in `app.config.ts` and native projects were rebuilt with `npx expo prebuild --clean`

### Issue: Session not persisting after app restart
**Solution:**
1. Check SecureStore logs for errors
2. Verify `persistSession: true` in supabase client config
3. Check that `autoRefreshToken: true` is enabled

### Issue: Value exceeds 2048 bytes warning
**Expected behavior:** SecureStore automatically falls back to AsyncStorage for large values. This is normal and safe.

## 📊 Success Criteria

Phase 1 is considered successful if:

- ✅ No errors in console logs during app initialization
- ✅ Migration completes without errors (for existing users)
- ✅ Login/logout functions correctly
- ✅ Sessions persist across app restarts
- ✅ SecureStore is being used on iOS/Android (check platform in logs)
- ✅ AsyncStorage is used as fallback on web (expected behavior)
- ✅ No plain-text tokens in AsyncStorage after migration (check with React Native Debugger)

## 🔄 Next Steps

After verifying Phase 1, proceed to:
- **Phase 2: Deep Linking Implementation**
  - App config updates for URL schemes
  - Deep link handler creation
  - Password reset flow via email
  - OAuth callback handling

---

**Testing Environment:**
- iOS: Use iOS Simulator or physical device
- Android: Use Android Emulator or physical device
- Web: Use browser console (http://localhost:3000)

**Tools:**
- React Native Debugger (for AsyncStorage inspection)
- Xcode Console (for iOS native logs)
- Android Studio Logcat (for Android native logs)
- Browser DevTools (for web console logs)
