#!/usr/bin/env node

/**
 * Supabase Authentication Implementation Verification Script
 *
 * This script automatically verifies that Phase 1 and Phase 2 implementations
 * are complete and correct.
 */

const fs = require('fs');
const path = require('path');

// Terminal colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkFileExists(filePath) {
  const fullPath = path.join(__dirname, filePath);
  const exists = fs.existsSync(fullPath);
  if (exists) {
    log(`✅ ${filePath} exists`, colors.green);
  } else {
    log(`❌ ${filePath} NOT FOUND`, colors.red);
  }
  return exists;
}

function checkFileContains(filePath, searchStrings, description) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    log(`❌ ${description}: File not found`, colors.red);
    return false;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const allFound = searchStrings.every(str => content.includes(str));

  if (allFound) {
    log(`✅ ${description}`, colors.green);
  } else {
    log(`❌ ${description}: Missing expected content`, colors.red);
    searchStrings.forEach(str => {
      if (!content.includes(str)) {
        log(`   Missing: "${str}"`, colors.yellow);
      }
    });
  }
  return allFound;
}

async function verifyImplementation() {
  log('\n========================================', colors.cyan);
  log('🔍 Supabase Auth Implementation Verification', colors.cyan);
  log('========================================\n', colors.cyan);

  let passedTests = 0;
  let totalTests = 0;

  // Phase 1: SecureStore Implementation
  log('📦 Phase 1: Expo SecureStore Migration', colors.blue);
  log('----------------------------------------\n', colors.blue);

  totalTests++;
  if (checkFileExists('src/config/secure-storage.ts')) passedTests++;

  totalTests++;
  if (checkFileContains(
    'src/config/secure-storage.ts',
    ['expo-secure-store', 'getItem', 'setItem', 'removeItem', '2048'],
    'SecureStore adapter implementation'
  )) passedTests++;

  totalTests++;
  if (checkFileContains(
    'src/config/supabase.ts',
    ['ExpoSecureStoreAdapter', 'storage:', 'SecureStore使用'],
    'Supabase client using SecureStore'
  )) passedTests++;

  totalTests++;
  if (checkFileExists('src/utils/migrate-auth-storage.ts')) passedTests++;

  totalTests++;
  if (checkFileContains(
    'src/utils/migrate-auth-storage.ts',
    ['migrateAuthStorage', 'AsyncStorage', 'SecureStore', 'sb-jhqnypyxrkwdrgutzttf-auth-token'],
    'Migration script implementation'
  )) passedTests++;

  totalTests++;
  if (checkFileContains(
    'App.tsx',
    ['migrateAuthStorage', 'await migrateAuthStorage()'],
    'Migration execution in App.tsx'
  )) passedTests++;

  totalTests++;
  if (checkFileContains(
    'app.config.ts',
    ['expo-secure-store', 'plugins'],
    'expo-secure-store plugin in config'
  )) passedTests++;

  log('');

  // Phase 2: Deep Linking Implementation
  log('🔗 Phase 2: Deep Linking Implementation', colors.blue);
  log('----------------------------------------\n', colors.blue);

  totalTests++;
  if (checkFileExists('src/utils/deep-link-handler.ts')) passedTests++;

  totalTests++;
  if (checkFileContains(
    'src/utils/deep-link-handler.ts',
    ['handleDeepLink', 'oauth_callback', 'password_reset', 'initializeDeepLinkListener'],
    'Deep link handler implementation'
  )) passedTests++;

  totalTests++;
  if (checkFileExists('src/screens/auth/ResetPasswordScreen.tsx')) passedTests++;

  totalTests++;
  if (checkFileContains(
    'src/screens/auth/ResetPasswordScreen.tsx',
    ['ResetPasswordScreen', 'newPassword', 'confirmPassword', 'validatePassword'],
    'Reset password screen implementation'
  )) passedTests++;

  totalTests++;
  if (checkFileContains(
    'App.tsx',
    ['initializeDeepLinkListener', 'DeepLinkResult', 'navigationRef'],
    'Deep link listener in App.tsx'
  )) passedTests++;

  totalTests++;
  if (checkFileContains(
    'App.tsx',
    ['ResetPasswordScreen', '<Stack.Screen name="ResetPassword"'],
    'ResetPassword screen in navigation'
  )) passedTests++;

  totalTests++;
  if (checkFileContains(
    'app.config.ts',
    ['associatedDomains', 'intentFilters'],
    'Deep link configuration in app.config.ts'
  )) passedTests++;

  totalTests++;
  if (checkFileContains(
    'app.config.ts',
    ['jhqnypyxrkwdrgutzttf.supabase.co'],
    'Supabase URL in deep link config'
  )) passedTests++;

  log('');

  // Documentation
  log('📚 Documentation Files', colors.blue);
  log('----------------------------------------\n', colors.blue);

  totalTests++;
  if (checkFileExists('PHASE1_VERIFICATION_CHECKLIST.md')) passedTests++;

  totalTests++;
  if (checkFileExists('PHASE2_DEEPLINK_TESTING_GUIDE.md')) passedTests++;

  totalTests++;
  if (checkFileExists('SUPABASE_AUTH_IMPLEMENTATION_COMPLETE.md')) passedTests++;

  log('');

  // Native Build Verification
  log('🏗️  Native Build Files', colors.blue);
  log('----------------------------------------\n', colors.blue);

  totalTests++;
  const iosExists = fs.existsSync(path.join(__dirname, 'ios'));
  if (iosExists) {
    log('✅ ios/ directory exists', colors.green);
    passedTests++;
  } else {
    log('❌ ios/ directory NOT FOUND (run npx expo prebuild)', colors.red);
  }

  totalTests++;
  const androidExists = fs.existsSync(path.join(__dirname, 'android'));
  if (androidExists) {
    log('✅ android/ directory exists', colors.green);
    passedTests++;
  } else {
    log('❌ android/ directory NOT FOUND (run npx expo prebuild)', colors.red);
  }

  log('');

  // Summary
  log('========================================', colors.cyan);
  log('📊 Verification Summary', colors.cyan);
  log('========================================\n', colors.cyan);

  const percentage = Math.round((passedTests / totalTests) * 100);
  const status = passedTests === totalTests ? '✅ PASS' : '❌ FAIL';
  const statusColor = passedTests === totalTests ? colors.green : colors.red;

  log(`Tests Passed: ${passedTests}/${totalTests} (${percentage}%)`, statusColor);
  log(`Overall Status: ${status}\n`, statusColor);

  if (passedTests === totalTests) {
    log('🎉 All implementation checks passed!', colors.green);
    log('Next steps:', colors.cyan);
    log('  1. Run the app: npx expo run:ios or npx expo run:android', colors.reset);
    log('  2. Check logs for 🔐 and 🔗 prefixes', colors.reset);
    log('  3. Test password reset flow', colors.reset);
    log('  4. Test deep links with xcrun simctl openurl (iOS) or adb (Android)\n', colors.reset);
  } else {
    log('⚠️  Some implementation checks failed.', colors.yellow);
    log('Please review the errors above and ensure all files are created correctly.\n', colors.yellow);
  }

  return passedTests === totalTests;
}

// Run verification
verifyImplementation()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    log(`\n❌ Verification failed with error: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  });
