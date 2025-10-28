# Phase 2: Deep Linking Implementation - Testing Guide

## ✅ Implementation Complete

All code changes for Phase 2 have been successfully implemented:

1. ✅ Updated `app.config.ts` with deep link configuration (iOS & Android)
2. ✅ Created deep link handler (`src/utils/deep-link-handler.ts`)
3. ✅ Integrated deep link listener in `App.tsx`
4. ✅ Created password reset screen (`src/screens/auth/ResetPasswordScreen.tsx`)
5. ✅ Added navigation configuration for ResetPassword screen
6. ✅ Connected deep link handler to navigation

## 📋 Deep Link URL Schemes

### iOS & Android (Native Apps)
- OAuth Callback: `car-concierge-app://auth/callback?access_token=...&refresh_token=...`
- Password Reset: `car-concierge-app://auth/reset-password?access_token=...&refresh_token=...`
- Email Verification: `car-concierge-app://auth/verify?access_token=...&refresh_token=...`

### Web
- OAuth Callback: `https://your-domain.com/auth/callback?access_token=...&refresh_token=...`
- Password Reset: `https://your-domain.com/auth/reset-password?access_token=...&refresh_token=...`

### Supabase URLs (Universal Links)
- OAuth Callback: `https://jhqnypyxrkwdrgutzttf.supabase.co/auth/v1/callback?access_token=...`
- These will automatically redirect to the app if configured correctly

## 🧪 Testing Deep Links

### Method 1: iOS Simulator (xcrun simctl)

```bash
# Boot the iOS simulator
xcrun simctl boot "iPhone 15 Pro"

# Open the simulator
open -a Simulator

# Test OAuth callback
xcrun simctl openurl booted "car-concierge-app://auth/callback?access_token=test_token&refresh_token=test_refresh"

# Test password reset
xcrun simctl openurl booted "car-concierge-app://auth/callback?access_token=test_token&refresh_token=test_refresh&type=recovery"

# Test email verification
xcrun simctl openurl booted "car-concierge-app://auth/callback?access_token=test_token&refresh_token=test_refresh&type=email"
```

### Method 2: Android Emulator (adb)

```bash
# Start the Android emulator
emulator -avd Pixel_5_API_33

# Test OAuth callback
adb shell am start -W -a android.intent.action.VIEW -d "car-concierge-app://auth/callback?access_token=test_token&refresh_token=test_refresh"

# Test password reset
adb shell am start -W -a android.intent.action.VIEW -d "car-concierge-app://auth/callback?access_token=test_token&refresh_token=test_refresh&type=recovery"
```

### Method 3: Physical Device (QR Code)

Generate QR codes for deep links:
1. Go to https://www.qr-code-generator.com/
2. Enter the deep link URL (e.g., `car-concierge-app://auth/callback?access_token=test`)
3. Generate and scan with device camera

### Method 4: Safari/Chrome (iOS/Android)

1. Open Safari (iOS) or Chrome (Android)
2. Enter the deep link URL in the address bar
3. Tap "Go"
4. The app should open automatically

## 📊 Test Cases

### Test Case 1: Password Reset Flow (End-to-End)

**Prerequisites:**
- User account created in Supabase
- App installed on device/simulator

**Steps:**
1. Open the app
2. Navigate to "Forgot Password" screen
3. Enter email address
4. Tap "Send Reset Link"
5. Check email for password reset link
6. Click the link in email
7. App should open and navigate to ResetPassword screen
8. Enter new password (meets requirements)
9. Confirm new password
10. Tap "Update Password"
11. Verify success message
12. Verify navigation to Map screen
13. Try logging in with new password

**Expected Logs:**
```
🔗 Deep Link: Received URL { url: 'car-concierge-app://auth/callback?access_token=...' }
🔗 Deep Link: Password reset token detected
🔗 Password Reset: Validating token
✅ Password Reset: Token validated { userId: '...' }
🔗 App: Navigating to ResetPassword screen
🔐 ResetPassword: Updating password
✅ ResetPassword: Success { userId: '...' }
```

### Test Case 2: OAuth Callback (Google Sign-In)

**Prerequisites:**
- Google OAuth configured in Supabase
- App installed on device/simulator

**Steps:**
1. Open the app
2. Navigate to Login screen
3. Tap "Sign in with Google"
4. Complete Google authentication in browser
5. App should open automatically
6. Verify "Login Success" alert
7. Verify user is logged in

**Expected Logs:**
```
🔗 Deep Link: Received URL { url: 'car-concierge-app://auth/callback?access_token=...' }
🔗 Deep Link: OAuth tokens detected
🔗 OAuth: Setting session with tokens
✅ OAuth: Session established { userId: '...', email: '...' }
🔗 App: Deep link handled { result: { type: 'oauth_callback', success: true } }
```

### Test Case 3: Email Verification

**Prerequisites:**
- User signed up but email not verified
- App installed on device/simulator

**Steps:**
1. Sign up with new email
2. Check email for verification link
3. Click the link in email
4. App should open
5. Verify "Email Confirmed" alert
6. Check that email is verified in Supabase dashboard

**Expected Logs:**
```
🔗 Deep Link: Received URL { url: 'car-concierge-app://auth/callback?access_token=...&type=email' }
🔗 Deep Link: Email verification detected
🔗 Email Verification: Validating token
✅ Email Verification: Success { userId: '...', emailConfirmed: '...' }
```

### Test Case 4: Invalid Token

**Steps:**
1. Create a deep link with invalid tokens
2. Open the link (e.g., `car-concierge-app://auth/callback?access_token=invalid`)
3. Verify error alert is shown
4. Verify user is not logged in

**Expected Logs:**
```
🔗 Deep Link: Received URL { url: '...' }
🔗 OAuth: Setting session with tokens
🔗 OAuth: Session error { error: '...' }
🔗 App: Deep link failed { error: '...' }
```

### Test Case 5: App Already Open (Background Deep Link)

**Steps:**
1. Open the app
2. Navigate to any screen
3. Switch to browser/email
4. Click a password reset link
5. App should come to foreground
6. Navigate to ResetPassword screen

**Expected Behavior:**
- App transitions smoothly to foreground
- Navigation happens immediately
- No crashes or freezes

## 🔍 Verification Checklist

### iOS Deep Linking
- [ ] Associated domains configured in `app.config.ts`
- [ ] Universal links work from Safari
- [ ] Universal links work from email apps
- [ ] Custom URL scheme works (`car-concierge-app://`)
- [ ] OAuth callback redirects properly
- [ ] Password reset links open app and navigate correctly

### Android Deep Linking
- [ ] Intent filters configured in `app.config.ts`
- [ ] App links work from Chrome
- [ ] App links work from email apps
- [ ] Custom URL scheme works (`car-concierge-app://`)
- [ ] OAuth callback redirects properly
- [ ] Password reset links open app and navigate correctly

### Password Reset Screen
- [ ] Screen renders correctly
- [ ] Password validation works (8+ chars, uppercase, lowercase, number)
- [ ] Password visibility toggle works
- [ ] Confirmation password matching works
- [ ] Success alert appears after update
- [ ] Navigation to Map screen after success
- [ ] New password works for login

### Error Handling
- [ ] Invalid tokens show error alert
- [ ] Expired tokens show error alert
- [ ] Network errors handled gracefully
- [ ] No crashes on malformed URLs

## ⚙️ Supabase Configuration

### Required Settings in Supabase Dashboard

1. **Auth > URL Configuration**
   - Site URL: `car-concierge-app://` (or your web URL for web builds)
   - Redirect URLs:
     - `car-concierge-app://auth/callback`
     - `car-concierge-app://auth/reset-password`
     - `car-concierge-app://auth/verify`
     - `https://your-domain.com/auth/callback` (for web)

2. **Auth > Email Templates**
   - Reset Password Email:
     ```
     Click the link below to reset your password:
     {{ .ConfirmationURL }}
     ```
   - The `{{ .ConfirmationURL }}` will automatically use your configured redirect URLs

3. **Auth > Providers**
   - Enable Google OAuth (if using)
   - Configure redirect URLs for each provider

### Testing with Supabase CLI (Local Development)

```bash
# Start Supabase local development
supabase start

# Update redirect URLs for local testing
supabase auth update --redirect-urls "car-concierge-app://auth/callback,http://localhost:3000/auth/callback"

# Check current configuration
supabase auth get
```

## 🐛 Common Issues and Solutions

### Issue: Deep links not opening app

**iOS:**
1. Check that `associatedDomains` is in `app.config.ts`
2. Run `npx expo prebuild --clean` after changes
3. Verify app is installed (not just in Metro)
4. Check iOS Settings > [App Name] > Default Browser App

**Android:**
1. Check that `intentFilters` is in `app.config.ts`
2. Run `npx expo prebuild --clean` after changes
3. Verify `autoVerify: true` is set
4. Check Android Settings > Apps > [App Name] > Set as default

### Issue: Password reset link redirects to browser instead of app

**Solution:**
1. Update Supabase redirect URLs to include `car-concierge-app://auth/callback`
2. Verify app scheme in `app.config.ts` matches the redirect URL
3. Test with universal links (HTTPS) instead of custom scheme

### Issue: "Invalid token" error

**Solution:**
1. Check that token hasn't expired (tokens expire after 1 hour by default)
2. Verify Supabase project URL matches in redirect URLs
3. Check that access_token and refresh_token are both present in URL

### Issue: Navigation not working after deep link

**Solution:**
1. Verify `navigationRef` is properly set up in `App.tsx`
2. Check that screen name matches exactly (case-sensitive)
3. Ensure navigation is called after `NavigationContainer` is mounted

## 📝 Implementation Summary

### Files Created/Modified

**Phase 1 (SecureStore):**
- `app.config.ts` - Added expo-secure-store plugin
- `src/config/secure-storage.ts` - SecureStore adapter (new)
- `src/config/supabase.ts` - Updated to use SecureStore
- `src/utils/migrate-auth-storage.ts` - Migration script (new)
- `App.tsx` - Added migration execution

**Phase 2 (Deep Linking):**
- `app.config.ts` - Added associatedDomains (iOS) and intentFilters (Android)
- `src/utils/deep-link-handler.ts` - Deep link handler utility (new)
- `src/screens/auth/ResetPasswordScreen.tsx` - Password reset UI (new)
- `App.tsx` - Added deep link listener and navigation

### Security Improvements

1. **Encrypted Token Storage**
   - iOS: Keychain (hardware-backed encryption)
   - Android: KeyStore (hardware-backed encryption)
   - Web: AsyncStorage fallback (no encryption)

2. **Secure Deep Links**
   - Token validation before navigation
   - HTTPS-only for production (universal links)
   - Error handling for invalid/expired tokens

3. **Password Reset Security**
   - Time-limited tokens (1 hour)
   - Strong password requirements
   - Confirmation required

## 🚀 Next Steps

After completing Phase 1 & 2 testing:

1. **Production Deployment**
   ```bash
   eas build --platform ios --profile production
   eas build --platform android --profile production
   ```

2. **Update Supabase Redirect URLs**
   - Add production app schemes
   - Test on TestFlight/Google Play Internal Testing

3. **Monitor Logs**
   - Check for deep link errors
   - Monitor password reset success rate
   - Track OAuth conversion rate

4. **Optional Enhancements**
   - Add biometric authentication (Face ID/Touch ID)
   - Implement magic link login
   - Add social providers (Apple, GitHub, etc.)

---

**Implementation Date:** 2025-10-26
**Status:** ✅ Complete - Ready for Testing
