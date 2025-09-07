import { supabase } from '@/config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at?: string;
}

export class AuthService {
  // プロフィール安全作成（重複チェック付き）
  private static async createProfileSafely(userId: string, displayName: string, avatarUrl?: string): Promise<void> {
    try {
      console.log('🔐 安全なプロフィール作成開始 - ユーザーID:', userId);
      
      // UPSERT（存在しなければINSERT、存在すればUPDATE）を使用
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          display_name: displayName,
          avatar_url: avatarUrl,
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false  // 既存の場合はUPDATEする
        });

      if (error) {
        console.error('🔐 プロフィールUPSERTエラー:', {
          code: error.code,
          message: error.message,
          details: error.details,
          userId
        });
      } else {
        console.log('🔐 プロフィールUPSERT成功');
      }
    } catch (error) {
      console.error('🔐 プロフィール作成で予期しないエラー:', error);
    }
  }

  // ユーザー登録
  static async signUp(email: string, password: string, name?: string): Promise<{ user: User | null, error: string | null }> {
    try {
      console.log('🔐 SignUp: 新規登録処理開始', { email });
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || '',
          },
          emailRedirectTo: undefined, // 自動ログインを有効化
        },
      });

      console.log('🔐 SignUp: signUp結果', {
        hasData: !!data,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        error: error?.message
      });

      if (error) {
        console.error('🔐 SignUp: 登録エラー', error);
        return { user: null, error: error.message };
      }

      if (data.user) {
        // セッションが作成されているか確認
        if (data.session) {
          console.log('🔐 SignUp: セッション作成確認済み');
        } else {
          console.log('🔐 SignUp: メール確認が必要な可能性があります');
        }
        
        // 安全なプロフィール作成
        await this.createProfileSafely(
          data.user.id,
          name || data.user.email?.split('@')[0] || ''
        );

        return {
          user: {
            id: data.user.id,
            email: data.user.email!,
            name: name || data.user.email?.split('@')[0] || '',
          },
          error: null,
        };
      }

      return { user: null, error: '登録に失敗しました' };
    } catch (error) {
      console.error('🔐 SignUp: 予期しないエラー', error);
      return { user: null, error: '登録中にエラーが発生しました' };
    }
  }

  // ログイン
  static async signIn(email: string, password: string): Promise<{ user: User | null, error: string | null }> {
    try {
      console.log('🔐 SignIn: ログイン処理開始', { email });
      
      // 既存のセッションをクリア（重要：古いセッションが残っている可能性）
      await supabase.auth.signOut();
      console.log('🔐 SignIn: 既存セッションをクリア');
      
      // ログイン実行
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('🔐 SignIn: signInWithPassword結果', {
        hasData: !!data,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        error: error?.message
      });

      if (error) {
        console.error('🔐 SignIn: ログインエラー', error);
        return { user: null, error: error.message };
      }

      if (data.session && data.user) {
        // セッションが正しく取得できたことを確認
        console.log('🔐 SignIn: セッション取得成功', {
          userId: data.user.id,
          email: data.user.email,
          sessionToken: data.session.access_token ? '***取得済み***' : 'なし'
        });
        
        // セッションの永続性を確認
        const { data: sessionCheck } = await supabase.auth.getSession();
        console.log('🔐 SignIn: セッション永続性確認', {
          hasSession: !!sessionCheck.session,
          sessionUserId: sessionCheck.session?.user?.id
        });
        
        // プロフィール取得または作成
        let profile = await this.getProfile(data.user.id);
        
        if (!profile) {
          console.log('🔐 SignIn: プロフィールが存在しないため作成');
          await this.createProfileSafely(
            data.user.id,
            data.user.email?.split('@')[0] || 'ユーザー'
          );
          profile = await this.getProfile(data.user.id);
        }
        
        const userData = profile ? {
          ...profile,
          email: data.user.email!
        } : {
          id: data.user.id,
          email: data.user.email!,
          name: data.user.email?.split('@')[0] || 'ユーザー'
        };
        
        console.log('🔐 SignIn: ログイン成功 - ユーザーデータ返却');
        return {
          user: userData,
          error: null,
        };
      }

      console.error('🔐 SignIn: セッションまたはユーザーが取得できませんでした');
      return { user: null, error: 'ログインに失敗しました' };
    } catch (error) {
      console.error('🔐 SignIn: 予期しないエラー', error);
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
      
      // profileが見つからない場合は新しく作成
      if (!profile) {
        await this.createProfileSafely(
          user.id,
          user.user_metadata?.full_name || user.email?.split('@')[0] || 'ユーザー',
          user.user_metadata?.avatar_url
        );
        
        return {
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'ユーザー',
          avatar_url: user.user_metadata?.avatar_url,
        };
      }
      
      // profileが見つかった場合はauth.usersのemailと統合
      return {
        ...profile,
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
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.log('Profile not found, will be created on next login');
        return null;
      }

      return {
        id: data.id,
        email: '', // user_profilesにはemailがないので空文字
        name: data.display_name || '',
        avatar_url: data.avatar_url,
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
      // User型からuser_profiles対応のフィールドにマッピング
      const profileUpdates: any = {};
      if (updates.name !== undefined) {
        profileUpdates.display_name = updates.name;
      }
      if (updates.avatar_url !== undefined) {
        profileUpdates.avatar_url = updates.avatar_url;
      }

      const { error } = await supabase
        .from('user_profiles')
        .update(profileUpdates)
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
      
      // モバイルアプリ用の固定リダイレクトURIを使用
      const redirectTo = `car-concierge-app://auth/callback`;
      
      console.log('🔐 Google認証 - Redirect URI:', redirectTo);
      
      // 開発環境の場合の追加情報
      const expoRedirectUri = AuthSession.makeRedirectUri({
        scheme: 'car-concierge-app',
        path: 'auth/callback',
      });
      console.log('🔐 Expo Generated URI:', expoRedirectUri);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error('🔐 Supabase OAuth エラー:', error);
        return { user: null, error: `認証URL取得エラー: ${error.message}` };
      }

      if (data?.url) {
        console.log('🔐 認証URL取得成功:', data.url);
        
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectTo,
          {
            showInRecents: true,
            preferEphemeralSession: false, // セッション情報を保持
          }
        );
        
        console.log('🔐 WebBrowser結果詳細:', {
          type: result.type,
          url: result.url ? result.url.substring(0, 100) + '...' : null,
          // URLの最初の100文字のみ表示（セキュリティのため）
        });

        console.log('🔐 認証結果:', result);

        if (result.type === 'success' && result.url) {
          console.log('🔐 成功時のURL:', result.url);
          
          // URLからパラメータを抽出（fragment形式とquery形式の両方に対応）
          let params: URLSearchParams;
          if (result.url.includes('#')) {
            params = new URLSearchParams(result.url.split('#')[1]);
          } else {
            params = new URLSearchParams(result.url.split('?')[1]);
          }
          
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          const error_description = params.get('error_description');
          
          console.log('🔐 抽出されたパラメータ:', {
            access_token: access_token ? '***取得済み***' : 'なし',
            refresh_token: refresh_token ? '***取得済み***' : 'なし',
            error_description
          });

          if (error_description) {
            return { user: null, error: error_description };
          }

          if (access_token) {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token: refresh_token || '',
            });

            if (sessionError) {
              console.error('🔐 セッション設定エラー:', sessionError);
              return { user: null, error: sessionError.message };
            }

            if (sessionData.user) {
              // プロフィールの作成または更新
              const { data: profileData } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', sessionData.user.id)
                .single();

              if (!profileData) {
                await this.createProfileSafely(
                  sessionData.user.id,
                  sessionData.user.user_metadata?.full_name || sessionData.user.email?.split('@')[0] || 'ユーザー',
                  sessionData.user.user_metadata?.avatar_url
                );
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
          } else {
            console.error('🔐 アクセストークンが取得できませんでした');
            return { user: null, error: 'Google認証でアクセストークンを取得できませんでした' };
          }
        } else if (result.type === 'cancel') {
          console.log('🔐 ユーザーが認証をキャンセルしました');
          return { user: null, error: 'Google認証がキャンセルされました' };
        } else {
          console.error('🔐 認証が失敗しました:', result);
          return { user: null, error: `Google認証に失敗しました: ${result.type}` };
        }
      } else {
        console.error('🔐 認証URLが取得できませんでした');
        return { user: null, error: 'Google認証URLの取得に失敗しました' };
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
      console.log('🔐 Auth state changed:', event, session?.user?.id);
      
      if (session?.user) {
        const profile = await this.getProfile(session.user.id);
        
        if (!profile) {
          // profileが見つからない場合は作成
          await this.createProfileSafely(
            session.user.id,
            session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'ユーザー',
            session.user.user_metadata?.avatar_url
          );
        }
        
        callback(profile ? { ...profile, email: session.user.email! } : {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'ユーザー',
          avatar_url: session.user.user_metadata?.avatar_url,
        });
      } else {
        callback(null);
      }
    });
  }
}