#!/usr/bin/env bash
set -euo pipefail

# Usage: scripts/eas_auto_ios.sh <ABS_P8_PATH> <KEY_ID> <ISSUER_ID>
# Example:
#   scripts/eas_auto_ios.sh \
#     /Users/user/Downloads/ApiKey_GJF0TV1WKXPX.p8 \
#     GJF0TV1WKXPX \
#     16651899-0897-4d44-ac7e-6e5a262f2286

P8_PATH=${1:-}
KEY_ID=${2:-}
ISSUER_ID=${3:-}

if [[ -z "${P8_PATH}" || -z "${KEY_ID}" || -z "${ISSUER_ID}" ]]; then
  echo "Usage: $0 <ABS_P8_PATH> <KEY_ID> <ISSUER_ID>" >&2
  exit 1
fi

if [[ ! -f "${P8_PATH}" ]]; then
  echo "❌ Private key not found: ${P8_PATH}" >&2
  exit 1
fi

if ! command -v eas >/dev/null 2>&1; then
  echo "ℹ️ Installing eas-cli globally..."
  npm i -g eas-cli >/dev/null 2>&1 || {
    echo "❌ Failed to install eas-cli. Please run: npm i -g eas-cli" >&2
    exit 1
  }
fi

echo "🔐 Checking Expo login..."
if ! eas whoami >/dev/null 2>&1; then
  echo "❌ Not logged in to Expo. Run 'eas login' first (or set EXPO_TOKEN)" >&2
  exit 1
fi

echo "📦 Ensuring project is linked..."
eas project:info >/dev/null 2>&1 || eas project:init --non-interactive || true

echo "🧩 Encoding ASC API key to Base64..."
APPLE_API_KEY_BASE64=$(base64 -i "${P8_PATH}" | tr -d '\n')

echo "🔑 Creating/updating EAS secrets (project scope)..."
eas secret:create --name APPLE_API_KEY_BASE64 --value "${APPLE_API_KEY_BASE64}" --scope project --non-interactive || true
eas secret:create --name APPLE_API_KEY_ID --value "${KEY_ID}" --scope project --non-interactive || true
eas secret:create --name APPLE_API_KEY_ISSUER_ID --value "${ISSUER_ID}" --scope project --non-interactive || true

echo "🏗️  Triggering iOS production build..."
eas build --platform ios --profile production --non-interactive

echo "📤 Submitting latest iOS build to App Store Connect via ASC API key..."
eas submit --platform ios --profile production --latest \
  --asc-api-key-path "${P8_PATH}" \
  --asc-api-key-id "${KEY_ID}" \
  --asc-api-key-issuer-id "${ISSUER_ID}" \
  --non-interactive

echo "✅ Done. Please finalize metadata in App Store Connect and submit for review."

