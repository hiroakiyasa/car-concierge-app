#!/bin/bash

# Clean up Apple API key after successful build
if [ -f "./AuthKey_$EAS_BUILD_APPLE_API_KEY_ID.p8" ]; then
  rm -f "./AuthKey_$EAS_BUILD_APPLE_API_KEY_ID.p8"
  echo "✅ Apple API key cleaned up"
fi