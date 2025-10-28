import * as Linking from 'expo-linking';
import { supabase } from '@/config/supabase';
import { Platform } from 'react-native';

/**
 * Deep Link Handler for Supabase Auth
 *
 * Handles:
 * - OAuth callbacks (Google, Apple, etc.)
 * - Password reset links from email
 * - Email verification links
 *
 * URLs expected:
 * - https://jhqnypyxrkwdrgutzttf.supabase.co/auth/v1/callback?...
 * - car-concierge-app://auth/callback?...
 */

export interface DeepLinkResult {
  type: 'oauth_callback' | 'password_reset' | 'email_verification' | 'unknown';
  success: boolean;
  error?: string;
  accessToken?: string;
  refreshToken?: string;
}

/**
 * Parse and handle a deep link URL
 */
export async function handleDeepLink(url: string): Promise<DeepLinkResult> {
  console.log('🔗 Deep Link: Received URL', { url });

  try {
    const parsedUrl = Linking.parse(url);
    console.log('🔗 Deep Link: Parsed', { parsedUrl });

    // Extract query parameters
    const params = parsedUrl.queryParams as Record<string, any>;

    // Check for OAuth callback or password reset tokens
    if (params.access_token || params.refresh_token) {
      console.log('🔗 Deep Link: OAuth tokens detected');
      return await handleOAuthCallback(params);
    }

    // Check for password reset token
    if (params.type === 'recovery' || params.token) {
      console.log('🔗 Deep Link: Password reset token detected');
      return await handlePasswordReset(params);
    }

    // Check for email verification
    if (params.type === 'email' || params.type === 'signup') {
      console.log('🔗 Deep Link: Email verification detected');
      return await handleEmailVerification(params);
    }

    console.log('🔗 Deep Link: Unknown link type', { params });
    return {
      type: 'unknown',
      success: false,
      error: 'Unknown link type'
    };
  } catch (error) {
    console.error('🔗 Deep Link: Error handling', { error });
    return {
      type: 'unknown',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Handle OAuth callback with tokens
 */
async function handleOAuthCallback(params: Record<string, any>): Promise<DeepLinkResult> {
  try {
    const accessToken = params.access_token;
    const refreshToken = params.refresh_token;

    if (!accessToken || !refreshToken) {
      console.error('🔗 OAuth: Missing tokens', { params });
      return {
        type: 'oauth_callback',
        success: false,
        error: 'Missing access or refresh token'
      };
    }

    console.log('🔗 OAuth: Setting session with tokens');

    // Set the session in Supabase
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    if (error) {
      console.error('🔗 OAuth: Session error', { error });
      return {
        type: 'oauth_callback',
        success: false,
        error: error.message
      };
    }

    console.log('✅ OAuth: Session established', {
      userId: data.user?.id,
      email: data.user?.email
    });

    return {
      type: 'oauth_callback',
      success: true,
      accessToken,
      refreshToken
    };
  } catch (error) {
    console.error('🔗 OAuth: Unexpected error', { error });
    return {
      type: 'oauth_callback',
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected error'
    };
  }
}

/**
 * Handle password reset token
 */
async function handlePasswordReset(params: Record<string, any>): Promise<DeepLinkResult> {
  try {
    const accessToken = params.access_token;
    const refreshToken = params.refresh_token;

    if (!accessToken) {
      console.error('🔗 Password Reset: Missing access token', { params });
      return {
        type: 'password_reset',
        success: false,
        error: 'Missing access token'
      };
    }

    console.log('🔗 Password Reset: Validating token');

    // Verify the session is valid
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || ''
    });

    if (error) {
      console.error('🔗 Password Reset: Invalid token', { error });
      return {
        type: 'password_reset',
        success: false,
        error: error.message
      };
    }

    console.log('✅ Password Reset: Token validated', {
      userId: data.user?.id
    });

    return {
      type: 'password_reset',
      success: true,
      accessToken,
      refreshToken
    };
  } catch (error) {
    console.error('🔗 Password Reset: Unexpected error', { error });
    return {
      type: 'password_reset',
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected error'
    };
  }
}

/**
 * Handle email verification
 */
async function handleEmailVerification(params: Record<string, any>): Promise<DeepLinkResult> {
  try {
    const accessToken = params.access_token;
    const refreshToken = params.refresh_token;

    if (!accessToken) {
      console.error('🔗 Email Verification: Missing access token', { params });
      return {
        type: 'email_verification',
        success: false,
        error: 'Missing access token'
      };
    }

    console.log('🔗 Email Verification: Validating token');

    // Set the session to verify email
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || ''
    });

    if (error) {
      console.error('🔗 Email Verification: Invalid token', { error });
      return {
        type: 'email_verification',
        success: false,
        error: error.message
      };
    }

    console.log('✅ Email Verification: Success', {
      userId: data.user?.id,
      emailConfirmed: data.user?.email_confirmed_at
    });

    return {
      type: 'email_verification',
      success: true,
      accessToken,
      refreshToken
    };
  } catch (error) {
    console.error('🔗 Email Verification: Unexpected error', { error });
    return {
      type: 'email_verification',
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected error'
    };
  }
}

/**
 * Initialize deep link listener
 * Call this in App.tsx to start listening for deep links
 */
export function initializeDeepLinkListener(
  onDeepLink: (result: DeepLinkResult) => void
): () => void {
  console.log('🔗 Deep Link: Initializing listener');

  // Handle initial URL (app opened via deep link)
  Linking.getInitialURL().then((url) => {
    if (url) {
      console.log('🔗 Deep Link: Initial URL detected', { url });
      handleDeepLink(url).then(onDeepLink);
    }
  });

  // Handle subsequent URLs (app already open)
  const subscription = Linking.addEventListener('url', ({ url }) => {
    console.log('🔗 Deep Link: URL event received', { url });
    handleDeepLink(url).then(onDeepLink);
  });

  console.log('✅ Deep Link: Listener initialized');

  // Return cleanup function
  return () => {
    console.log('🔗 Deep Link: Cleaning up listener');
    subscription.remove();
  };
}

/**
 * Create a redirect URL for OAuth providers
 * This is the URL that OAuth providers will redirect to after authentication
 */
export function getOAuthRedirectUrl(): string {
  if (Platform.OS === 'web') {
    // For web, use the current origin
    return `${window.location.origin}/auth/callback`;
  }

  // For native, use the app scheme
  return 'car-concierge-app://auth/callback';
}

/**
 * Create a redirect URL for password reset
 * This is the URL that will be embedded in password reset emails
 */
export function getPasswordResetRedirectUrl(): string {
  if (Platform.OS === 'web') {
    // For web, use the current origin
    return `${window.location.origin}/auth/reset-password`;
  }

  // For native, use the app scheme
  return 'car-concierge-app://auth/reset-password';
}
