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
  static async createProfileSafely(userId: string, displayName: string, avatarUrl?: string): Promise<boolean> {
    try {
      console.log('🔐 安全なプロフィール作成開始 - ユーザーID:', userId);
      
      // まず既存のプロフィールを確認
      const { data: existing, error: selectError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .single();
      
      // エラーが「行が見つからない」以外の場合は問題あり
      if (selectError && selectError.code !== 'PGRST116') {
        console.error('🔐 プロフィール確認エラー:', selectError);
        return false;
      }
      
      if (existing) {
        console.log('🔐 プロフィールは既に存在します');
        return true;
      }
      
      // プロフィールが存在しない場合は作成
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          display_name: displayName,
          avatar_url: avatarUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        // 重複エラーの場合は成功とみなす
        if (insertError.code === '23505') {
          console.log('🔐 プロフィールは既に存在していました（重複エラー）');
          return true;
        }
        
        console.error('🔐 プロフィール作成エラー:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          userId
        });
        
        // RLSエラーの場合、エラーメッセージを分かりやすくする
        if (insertError.code === '42501') {
          console.error('🔐 RLSポリシーエラー: ユーザーは自分のプロフィールのみ作成可能です');
        }
        
        return false;
      } else {
        console.log('🔐 プロフィール作成成功');
        return true;
      }
    } catch (error) {
      console.error('🔐 プロフィール作成で予期しないエラー:', error);
      return false;
    }
  }

  // ユーザー登録
  static async signUp(email: string, password: string, name?: string): Promise<{ user: User | null, error: string | null }> {
    try {
      console.log('🔐 SignUp: 新規登録処理開始', { email });
      
      // 入力値バリデーション（Zennの記事のパターン）
      if (!email || !password) {
        return { user: null, error: 'メールアドレスとパスワードは必須です' };
      }
      
      if (password.length < 6) {
        return { user: null, error: 'パスワードは6文字以上である必要があります' };
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { user: null, error: '有効なメールアドレスを入力してください' };
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || '',
            full_name: name || '',
          },
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
        
        // よくあるエラーメッセージを日本語化
        let errorMessage = error.message;
        if (error.message.includes('already registered')) {
          errorMessage = 'このメールアドレスは既に登録されています';
        } else if (error.message.includes('Invalid email')) {
          errorMessage = '無効なメールアドレスです';
        } else if (error.message.includes('Password')) {
          errorMessage = 'パスワードが要件を満たしていません';
        } else if (error.message.includes('weak password')) {
          errorMessage = 'パスワードが弱すぎます。より強力なパスワードを使用してください';
        }
        
        return { user: null, error: errorMessage };
      }

      if (data.user) {
        // プロフィール作成
        const profileCreated = await this.createProfileSafely(
          data.user.id,
          name || data.user.email?.split('@')[0] || ''
        );
        
        if (!profileCreated) {
          console.warn('🔐 SignUp: プロフィール作成に失敗しましたが、ユーザー登録は成功しました');
        }
        
        // セッションがない場合は自動ログインを試行
        if (!data.session) {
          console.log('🔐 SignUp: セッションがないため自動ログインを試行');
          
          // 少し待機してからログイン（DBトリガーの処理を待つ）
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const signInResult = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (signInResult.data.session && signInResult.data.user) {
            console.log('🔐 SignUp: 自動ログイン成功');
            
            const profile = await this.getProfile(signInResult.data.user.id);
            
            return {
              user: profile ? {
                ...profile,
                email: signInResult.data.user.email!
              } : {
                id: signInResult.data.user.id,
                email: signInResult.data.user.email!,
                name: name || signInResult.data.user.email?.split('@')[0] || '',
              },
              error: null,
            };
          } else {
            console.log('🔐 SignUp: 自動ログイン失敗、ユーザー情報のみ返却');
            return {
              user: {
                id: data.user.id,
                email: data.user.email!,
                name: name || data.user.email?.split('@')[0] || '',
              },
              error: null,
            };
          }
        }
        
        // セッションがある場合
        console.log('🔐 SignUp: セッション作成済み');
        const profile = await this.getProfile(data.user.id);
        
        return {
          user: profile ? {
            ...profile,
            email: data.user.email!
          } : {
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
      
      // 入力値バリデーション
      if (!email || !password) {
        return { user: null, error: 'メールアドレスとパスワードを入力してください' };
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { user: null, error: '有効なメールアドレスを入力してください' };
      }
      
      // 現在のセッションを確認（不要なsignOutを避ける）
      const { data: currentSession } = await supabase.auth.getSession();
      if (currentSession.session?.user?.email !== email) {
        // 異なるユーザーの場合のみクリア
        await supabase.auth.signOut();
        console.log('🔐 SignIn: 異なるユーザーのセッションをクリア');
      }
      
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
        
        // よくあるエラーメッセージを日本語化
        let errorMessage = error.message;
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'メールアドレスまたはパスワードが間違っています';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'メールアドレスが確認されていません。メールボックスを確認してください';
        } else if (error.message.includes('Account not found')) {
          errorMessage = 'アカウントが見つかりません';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'しばらく時間をおいてから再度お試しください';
        }
        
        return { user: null, error: errorMessage };
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

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('🔐 プロフィールが見つかりません（正常）');
        } else {
          console.error('🔐 プロフィール取得エラー:', error);
        }
        return null;
      }

      if (!data) {
        console.log('🔐 プロフィールデータが空です');
        return null;
      }

      console.log('🔐 プロフィール取得成功:', {
        id: data.id,
        display_name: data.display_name
      });

      return {
        id: data.id,
        email: '', // user_profilesにはemailがないので空文字
        name: data.display_name || '',
        avatar_url: data.avatar_url,
        created_at: data.created_at,
      };
    } catch (error) {
      console.error('🔐 プロフィール取得で予期しないエラー:', error);
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
      console.log('🔐 Google認証開始');

      // WebBrowserセッションをリセット
      WebBrowser.maybeCompleteAuthSession();

      // Expo環境に応じたリダイレクトURIを生成
      const redirectTo = AuthSession.makeRedirectUri({
        scheme: 'car-concierge-app',
        path: 'auth/callback',
        preferLocalhost: false,
        isTripleSlashed: true,
      });

      console.log('🔐 生成されたリダイレクトURI:', redirectTo);

      // Supabaseに設定されているURLを確認
      const supabaseRedirectUrl = `${redirectTo}`;
      console.log('🔐 Supabaseに渡すリダイレクトURL:', supabaseRedirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: supabaseRedirectUrl,
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
        console.log('🔐 認証URL取得成功');
        console.log('🔐 OAuth URL:', data.url.substring(0, 100) + '...');

        // WebBrowserでOAuth認証を開く
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectTo,
          {
            showInRecents: true,
            preferEphemeralSession: false, // セッション情報を保持
            createTask: false, // Android用の設定
          }
        );

        console.log('🔐 WebBrowser結果:', {
          type: result.type,
          hasUrl: !!result.url,
        });

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
            console.log('🔐 アクセストークン取得成功、セッション設定開始');
            
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token: refresh_token || '',
            });

            if (sessionError) {
              console.error('🔐 セッション設定エラー:', {
                error: sessionError.message,
                code: sessionError.code,
                details: sessionError.details
              });
              return { user: null, error: `セッション設定失敗: ${sessionError.message}` };
            }

            if (sessionData.user) {
              console.log('🔐 セッション設定成功:', {
                userId: sessionData.user.id,
                email: sessionData.user.email,
                metadata: sessionData.user.user_metadata
              });
              
              // プロフィールの確認
              const { data: profileData, error: profileCheckError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', sessionData.user.id)
                .single();
              
              if (profileCheckError && profileCheckError.code !== 'PGRST116') {
                console.error('🔐 プロフィール確認エラー:', profileCheckError);
              }

              if (!profileData) {
                console.log('🔐 プロフィールが存在しないため作成開始');
                const profileCreated = await this.createProfileSafely(
                  sessionData.user.id,
                  sessionData.user.user_metadata?.full_name || sessionData.user.email?.split('@')[0] || 'ユーザー',
                  sessionData.user.user_metadata?.avatar_url
                );
                
                if (!profileCreated) {
                  console.warn('🔐 プロフィール作成に失敗しましたが、認証は成功しています');
                }
              } else {
                console.log('🔐 既存のプロフィールを使用');
              }

              // プロフィール再取得
              const profile = await this.getProfile(sessionData.user.id);
              
              if (profile) {
                console.log('🔐 Google認証完了 - プロフィール取得成功');
                return {
                  user: {
                    ...profile,
                    email: sessionData.user.email!
                  },
                  error: null,
                };
              } else {
                console.log('🔐 Google認証完了 - プロフィールなし、メタデータから生成');
                return {
                  user: {
                    id: sessionData.user.id,
                    email: sessionData.user.email!,
                    name: sessionData.user.user_metadata?.full_name || sessionData.user.user_metadata?.name,
                    avatar_url: sessionData.user.user_metadata?.avatar_url || sessionData.user.user_metadata?.picture,
                  },
                  error: null,
                };
              }
            } else {
              console.error('🔐 セッションは設定されたがユーザー情報がありません');
              return { user: null, error: 'ユーザー情報の取得に失敗しました' };
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
      console.error('🔐 Google認証エラー詳細:', {
        error,
        errorMessage: error instanceof Error ? error.message : '不明なエラー',
        errorStack: error instanceof Error ? error.stack : undefined,
      });

      // より詳細なエラーメッセージ
      let errorMessage = 'Google認証中にエラーが発生しました';
      if (error instanceof Error) {
        if (error.message.includes('network')) {
          errorMessage = 'ネットワーク接続を確認してください';
        } else if (error.message.includes('cancelled')) {
          errorMessage = 'Google認証がキャンセルされました';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Google認証がタイムアウトしました';
        } else {
          errorMessage = `Google認証エラー: ${error.message}`;
        }
      }

      return { user: null, error: errorMessage };
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