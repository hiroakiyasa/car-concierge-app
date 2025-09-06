#!/bin/bash

# EAS Build pre-install hook to restore Apple API key from environment variable
if [ ! -z "$APPLE_API_KEY_BASE64" ]; then
  echo "$APPLE_API_KEY_BASE64" | base64 -d > "./AuthKey_$APPLE_API_KEY_ID.p8"
  echo "✅ Apple API key restored successfully"
  
  # Update credentials.json with the key path
  cat > credentials.json << EOF
{
  "ios": {
    "provisioningProfilePath": null,
    "distributionCertificate": {
      "path": null,
      "password": null
    },
    "appStoreConnectApiKeyPath": "./AuthKey_$APPLE_API_KEY_ID.p8",
    "appStoreConnectApiKeyId": "$APPLE_API_KEY_ID",
    "appStoreConnectApiKeyIssuerId": "$APPLE_API_KEY_ISSUER_ID"
  }
}
EOF
  echo "✅ credentials.json updated with API key configuration"
else
  echo "⚠️ APPLE_API_KEY_BASE64 environment variable not found"
fi