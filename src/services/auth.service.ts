import { supabase } from '@/config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  is_premium?: boolean;
  created_at?: string;
}

export class AuthService {
  // ユーザー登録
  static async signUp(email: string, password: string, name?: string): Promise<{ user: User | null, error: string | null }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || '',
          },
        },
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        // プロフィール作成
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            name: name || '',
            is_premium: false,
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }

        return {
          user: {
            id: data.user.id,
            email: data.user.email!,
            name: name || '',
            is_premium: false,
          },
          error: null,
        };
      }

      return { user: null, error: '登録に失敗しました' };
    } catch (error) {
      console.error('Sign up error:', error);
      return { user: null, error: '登録中にエラーが発生しました' };
    }
  }

  // ログイン
  static async signIn(email: string, password: string): Promise<{ user: User | null, error: string | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        // プロフィール取得
        const profile = await this.getProfile(data.user.id);
        
        return {
          user: profile || {
            id: data.user.id,
            email: data.user.email!,
          },
          error: null,
        };
      }

      return { user: null, error: 'ログインに失敗しました' };
    } catch (error) {
      console.error('Sign in error:', error);
      return { user: null, error: 'ログイン中にエラーが発生しました' };
    }
  }

  // ログアウト
  static async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return { error: error.message };
      }

      // ローカルストレージをクリア
      await AsyncStorage.removeItem('user');
      
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error: 'ログアウト中にエラーが発生しました' };
    }
  }

  // 現在のユーザー取得
  static async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return null;
      }

      const profile = await this.getProfile(user.id);
      
      return profile || {
        id: user.id,
        email: user.email!,
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  // プロフィール取得
  static async getProfile(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        email: data.email,
        name: data.name,
        avatar_url: data.avatar_url,
        is_premium: data.is_premium,
        created_at: data.created_at,
      };
    } catch (error) {
      console.error('Get profile error:', error);
      return null;
    }
  }

  // プロフィール更新
  static async updateProfile(userId: string, updates: Partial<User>): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      console.error('Update profile error:', error);
      return { error: 'プロフィール更新中にエラーが発生しました' };
    }
  }

  // パスワードリセット
  static async resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'com.carConcierge://reset-password',
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      console.error('Reset password error:', error);
      return { error: 'パスワードリセット中にエラーが発生しました' };
    }
  }

  // Google Sign-In
  static async signInWithGoogle(): Promise<{ user: User | null, error: string | null }> {
    try {
      WebBrowser.maybeCompleteAuthSession();
      
      // Supabaseのリダイレクトを使用（開発環境と本番環境で自動切り替え）
      const redirectTo = AuthSession.makeRedirectUri({
        scheme: 'car-concierge-app',
        path: 'auth/callback',
        preferLocalhost: false,
        isTripleSlashed: false,
      });
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true
        }
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectTo,
          {
            showInRecents: true,
          }
        );

        if (result.type === 'success' && result.url) {
          const params = new URLSearchParams(result.url.split('#')[1]);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token) {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token: refresh_token || '',
            });

            if (sessionError) {
              return { user: null, error: sessionError.message };
            }

            if (sessionData.user) {
              // プロフィールの作成または更新
              const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', sessionData.user.id)
                .single();

              if (!profileData) {
                await supabase
                  .from('profiles')
                  .insert({
                    id: sessionData.user.id,
                    email: sessionData.user.email,
                    name: sessionData.user.user_metadata?.full_name || sessionData.user.email?.split('@')[0],
                    avatar_url: sessionData.user.user_metadata?.avatar_url,
                    is_premium: false,
                  });
              }

              const profile = await this.getProfile(sessionData.user.id);
              
              return {
                user: profile || {
                  id: sessionData.user.id,
                  email: sessionData.user.email!,
                  name: sessionData.user.user_metadata?.full_name,
                  avatar_url: sessionData.user.user_metadata?.avatar_url,
                },
                error: null,
              };
            }
          }
        }
      }

      return { user: null, error: 'Google認証に失敗しました' };
    } catch (error) {
      console.error('Google sign in error:', error);
      return { user: null, error: 'Google認証中にエラーが発生しました' };
    }
  }

  // セッションの監視
  static subscribeToAuthChanges(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await this.getProfile(session.user.id);
        callback(profile || {
          id: session.user.id,
          email: session.user.email!,
        });
      } else {
        callback(null);
      }
    });
  }
}