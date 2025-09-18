#!/usr/bin/env bash
set -euo pipefail

# Simple logger helpers
log()  { echo "[+] $*"; }
warn() { echo "[!] $*"; }
die()  { echo "[x] $*"; exit 1; }

# Ensure we run from repo root (script can be called from anywhere)
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT_DIR"

log "Project root: $ROOT_DIR"

# Make Homebrew tools take precedence (fastlane, pod)
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"
hash -r || true

# 0) Quick prerequisite checks
command -v xcodebuild >/dev/null || die "xcodebuild が見つかりません。Xcode をインストールしてください。"
command -v eas >/dev/null || die "eas CLI が見つかりません。'npm i -g eas-cli' を実行してください。"

# 1) Select proper Xcode and accept license
if ! xcode-select -p | grep -q "/Applications/Xcode.app/Contents/Developer"; then
  log "Selecting Xcode: /Applications/Xcode.app"
  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
fi

log "Accepting Xcode license (may prompt for password)"
sudo xcodebuild -license accept || true

log "Running Xcode first launch (may prompt)"
sudo xcodebuild -runFirstLaunch || true

# 2) Ensure iOS platform SDK is present
if ! xcodebuild -showsdks | grep -q "iphoneos"; then
  warn "iOS SDK (iphoneos) が見つかりません。iOS プラットフォームをダウンロードします。"
  sudo xcodebuild -downloadPlatform iOS || warn "自動ダウンロードに失敗しました。Xcode > Settings > Platforms から iOS を追加してください。"
fi

log "Available SDKs:" 
xcodebuild -showsdks || true

# 3) Ensure fastlane / CocoaPods
if ! command -v fastlane >/dev/null; then
  warn "fastlane が見つかりません。Homebrew でのインストールを試みます。"
  if command -v brew >/dev/null; then
    brew install fastlane || die "fastlane のインストールに失敗しました。手動で 'brew install fastlane' を実行してください。"
  else
    die "Homebrew がありません。'brew install fastlane' もしくは 'sudo gem install fastlane -NV' を実行してください。"
  fi
fi

if ! command -v pod >/dev/null; then
  warn "CocoaPods (pod) が見つかりません。Homebrew でのインストールを試みます。"
  if command -v brew >/dev/null; then
    brew install cocoapods || die "CocoaPods のインストールに失敗しました。手動で 'brew install cocoapods' を実行してください。"
  else
    die "Homebrew がありません。'brew install cocoapods' もしくは 'sudo gem install cocoapods' を実行してください。"
  fi
fi

log "pod version: $(pod --version || echo 'unknown')"
log "fastlane version: $(fastlane --version || echo 'unknown')"

# 4) Install Pods
if [ -d ios ]; then
  log "Installing CocoaPods in ./ios"
  pushd ios >/dev/null
  pod install || { pod repo update && pod install; } || die "pod install に失敗しました。"
  popd >/dev/null
else
  warn "ios ディレクトリが見つかりませんでした。Expo Prebuild が未実施の可能性があります。必要なら 'expo prebuild -p ios' を実行してください。"
fi

# 5) npm install with safer peer strategy, to avoid ERESOLVE
if [ -f package.json ]; then
  log "Installing JS dependencies (npm ci fallback to npm i)"
  if command -v npm >/dev/null; then
    npm config set legacy-peer-deps true >/dev/null 2>&1 || true
    if [ -f package-lock.json ]; then
      npm ci || npm install || die "npm install に失敗しました。"
    else
      npm install || die "npm install に失敗しました。"
    fi
  else
    warn "npm が見つかりません。Node.js のインストールを確認してください。"
  fi
fi

# 6) Set gym overrides to stabilize destination and increase verbosity
export GYM_SDK=iphoneos
export GYM_DESTINATION="generic/platform=iOS"
export GYM_SUPPRESS_XCODE_OUTPUT=false
export GYM_BUILDLOG_PATH="$ROOT_DIR/.eas-local-logs"
export FASTLANE_XCODEBUILD_SETTINGS_TIMEOUT=180
mkdir -p "$GYM_BUILDLOG_PATH"

# 7) Ensure EAS login
if ! eas whoami >/dev/null 2>&1; then
  warn "Expo アカウントに未ログインです。プロンプトに従ってログインしてください。"
  eas login || die "eas login に失敗しました。"
fi

# 8) Local build (Release, App Store)
log "Starting local iOS build via EAS (production profile)"
if ! eas build -p ios --profile production --local; then
  warn "EAS ローカルビルドに失敗しました。Xcode/fastlane ログを出力します。"
  if [ -d "$GYM_BUILDLOG_PATH" ]; then
    echo "--- Last 200 lines from $GYM_BUILDLOG_PATH ---"
    tail -n 200 "$GYM_BUILDLOG_PATH"/* 2>/dev/null || true
  fi
  die "EAS ローカルビルドに失敗しました。上記ログを確認してください。"
fi

# 9) Find the IPA produced by gym (Fastlane)
IPA_PATH=""
if [ -d build ]; then
  IPA_CANDIDATE=$(ls -t build/*.ipa 2>/dev/null | head -n1 || true)
  if [ -n "${IPA_CANDIDATE:-}" ]; then
    IPA_PATH="$IPA_CANDIDATE"
  fi
fi

if [ -z "$IPA_PATH" ]; then
  # Try common archive locations
  TODAY_DIR="$HOME/Library/Developer/Xcode/Archives/$(date +%Y-%m-%d)"
  IPA_CANDIDATE=$(find "$TODAY_DIR" -type f -name "*.ipa" -print 2>/dev/null | sort -r | head -n1 || true)
  if [ -n "${IPA_CANDIDATE:-}" ]; then
    IPA_PATH="$IPA_CANDIDATE"
  fi
fi

[ -n "$IPA_PATH" ] || die "IPA が見つかりませんでした。上のログを確認してください。"
log "Found IPA: $IPA_PATH"

# 10) Submit to TestFlight using configured submit profile (API Key in eas.json)
log "Submitting IPA to TestFlight via EAS Submit (production profile)"
eas submit -p ios --profile production --path "$IPA_PATH" || die "EAS Submit に失敗しました。"

log "Done. TestFlight の処理完了（Processing）をお待ちください。"
log "App Store Connect > My Apps > 該当アプリ > TestFlight で確認できます。"
