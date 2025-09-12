import { create } from 'zustand';
import { AuthService, User } from '@/services/auth.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/config/supabase';

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
  authListener?: any;
  
  // Actions
  signUp: (email: string, password: string, name?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  setUser: (user: User | null) => void;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isInitialized: false,
  authListener: undefined,

  signUp: async (email: string, password: string, name?: string) => {
    set({ isLoading: true });
    
    console.log('🔐 AuthStore: signUp開始');
    const { user, error } = await AuthService.signUp(email, password, name);
    
    if (user) {
      console.log('🔐 AuthStore: 新規登録成功', { userId: user.id, email: user.email });
      
      // AuthStoreの状態を更新
      set({ user, isAuthenticated: true, isLoading: false });
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      // Supabaseセッションの確認
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('🔐 AuthStore: signUp後のセッション状態', {
        hasSession: !!sessionData.session,
        sessionUserId: sessionData.session?.user?.id
      });
    } else {
      console.log('🔐 AuthStore: signUp失敗', { error });
      set({ isLoading: false });
    }
    
    return { error };
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true });
    
    console.log('🔐 AuthStore: signIn開始');
    const { user, error } = await AuthService.signIn(email, password);
    
    if (user) {
      console.log('🔐 AuthStore: ユーザー情報取得成功', { userId: user.id, email: user.email });
      
      // AuthStoreの状態を更新
      set({ user, isAuthenticated: true, isLoading: false });
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      // Supabaseセッションの確認
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('🔐 AuthStore: signIn後のセッション状態', {
        hasSession: !!sessionData.session,
        sessionUserId: sessionData.session?.user?.id
      });
    } else {
      console.log('🔐 AuthStore: signIn失敗', { error });
      set({ isLoading: false });
    }
    
    return { error };
  },

  signOut: async () => {
    set({ isLoading: true });
    
    await AuthService.signOut();
    await AsyncStorage.removeItem('user');
    
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    
    try {
      console.log('🔐 AuthStore: checkAuth開始');
      
      // まずSupabaseセッションをチェック
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const { data: { user: supabaseUser }, error: userError } = await supabase.auth.getUser();
      
      console.log('🔐 AuthStore: Supabase認証状態:', {
        hasSession: !!sessionData.session,
        hasUser: !!supabaseUser,
        userId: supabaseUser?.id,
        sessionError: sessionError?.message,
        userError: userError?.message
      });
      
      // Supabaseセッションが有効な場合
      if (supabaseUser && sessionData.session) {
        console.log('🔐 AuthStore: 有効なSupabaseセッション確認');
        const currentUser = await AuthService.getCurrentUser();
        
        if (currentUser) {
          set({ user: currentUser, isAuthenticated: true });
          await AsyncStorage.setItem('user', JSON.stringify(currentUser));
          console.log('🔐 AuthStore: Supabaseセッションベースでユーザー設定完了');
          return;
        }
      }
      
      // Supabaseセッションが無効な場合、ローカルストレージをチェック
      const storedUser = await AsyncStorage.getItem('user');
      console.log('🔐 AuthStore: storedUser:', !!storedUser);
      
      if (storedUser) {
        console.log('🔐 AuthStore: Supabaseセッション無効だがローカルストレージにユーザー情報あり');
        console.log('🔐 AuthStore: ローカルストレージをクリアして未認証状態に設定');
        
        // ローカルストレージをクリア
        await AsyncStorage.removeItem('user');
        set({ user: null, isAuthenticated: false });
      } else {
        set({ user: null, isAuthenticated: false });
        console.log('🔐 AuthStore: 未認証状態に設定');
      }
    } catch (error) {
      console.error('🔐 AuthStore: Check auth error:', error);
      
      // エラー時はローカルストレージもクリア
      await AsyncStorage.removeItem('user');
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
      console.log('🔐 AuthStore: checkAuth完了');
    }
  },

  updateProfile: async (updates: Partial<User>) => {
    const { user } = get();
    
    if (!user) {
      return { error: 'ユーザーがログインしていません' };
    }
    
    const { error } = await AuthService.updateProfile(user.id, updates);
    
    if (!error) {
      const updatedUser = { ...user, ...updates };
      set({ user: updatedUser });
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    }
    
    return { error };
  },

  resetPassword: async (email: string) => {
    return await AuthService.resetPassword(email);
  },

  signInWithGoogle: async () => {
    set({ isLoading: true });
    
    console.log('🔐 AuthStore: Google認証開始');
    const { user, error } = await AuthService.signInWithGoogle();
    
    if (user) {
      console.log('🔐 AuthStore: Google認証成功', {
        userId: user.id,
        email: user.email,
        name: user.name
      });
      
      // Storeとローカルストレージを更新
      set({ user, isAuthenticated: true, isLoading: false });
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      // セッション確認
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('🔐 AuthStore: Google認証後のセッション状態', {
        hasSession: !!sessionData.session,
        sessionUserId: sessionData.session?.user?.id,
        sessionEmail: sessionData.session?.user?.email
      });
    } else {
      console.error('🔐 AuthStore: Google認証失敗', { error });
      set({ isLoading: false });
    }
    
    return { error };
  },

  setUser: (user: User | null) => {
    console.log('🔐 AuthStore: setUser called with:', !!user ? user.email : 'null');
    if (user) {
      set({ user, isAuthenticated: true });
      AsyncStorage.setItem('user', JSON.stringify(user));
    } else {
      set({ user: null, isAuthenticated: false });
      AsyncStorage.removeItem('user');
    }
  },

  initializeAuth: async () => {
    console.log('🔐 AuthStore: initializeAuth - 認証状態初期化開始');
    
    if (get().isInitialized) {
      console.log('🔐 AuthStore: 既に初期化済み');
      return;
    }
    
    set({ isLoading: true });
    
    try {
      // 1. まずSupabaseセッションを確認（Zennの記事のパターン）
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('🔐 AuthStore: 初期セッション確認:', {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        error: sessionError?.message
      });
      
      if (sessionError) {
        console.error('🔐 AuthStore: セッション取得エラー:', sessionError);
        throw sessionError;
      }
      
      // 2. セッションが存在する場合の処理
      if (session?.user) {
        console.log('🔐 AuthStore: 有効なセッション発見、プロフィール取得中');
        
        // プロフィール取得（安全に）
        let profile: User | null = null;
        try {
          profile = await AuthService.getCurrentUser();
        } catch (profileError) {
          console.error('🔐 AuthStore: プロフィール取得エラー:', profileError);
          // プロフィール取得に失敗してもセッションが有効なら基本情報で継続
        }
        
        if (profile) {
          set({ 
            user: profile, 
            isAuthenticated: true, 
            isLoading: false, 
            isInitialized: true 
          });
          await AsyncStorage.setItem('user', JSON.stringify(profile));
          console.log('🔐 AuthStore: セッション復元成功（プロフィール付き）');
        } else {
          // プロフィールがない場合でもセッションは有効
          const basicUser: User = {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata?.full_name || 
                  session.user.user_metadata?.name ||
                  session.user.email?.split('@')[0] || 'ユーザー',
            avatar_url: session.user.user_metadata?.avatar_url ||
                       session.user.user_metadata?.picture
          };
          
          set({ 
            user: basicUser, 
            isAuthenticated: true, 
            isLoading: false, 
            isInitialized: true 
          });
          await AsyncStorage.setItem('user', JSON.stringify(basicUser));
          console.log('🔐 AuthStore: 基本ユーザー情報で初期化');
          
          // バックグラウンドでプロフィール作成を試行
          try {
            await AuthService.createProfileSafely(
              basicUser.id,
              basicUser.name || 'ユーザー',
              basicUser.avatar_url
            );
            console.log('🔐 AuthStore: バックグラウンドプロフィール作成完了');
          } catch (createError) {
            console.error('🔐 AuthStore: バックグラウンドプロフィール作成失敗:', createError);
          }
        }
      } else {
        // 3. セッションがない場合の処理
        console.log('🔐 AuthStore: セッションなし - 未認証状態に設定');
        
        // ローカルストレージもクリア
        await AsyncStorage.removeItem('user');
        
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false, 
          isInitialized: true 
        });
      }
    } catch (error) {
      console.error('🔐 AuthStore: 初期化エラー:', error);
      
      // エラー時はクリーンアップ
      await AsyncStorage.removeItem('user');
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false, 
        isInitialized: true 
      });
    }
    
    // 4. 認証状態変更の監視を設定（一度だけ）
    if (!get().authListener) {
      console.log('🔐 AuthStore: 認証監視の設定開始');
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔐 AuthStore: 認証イベント発生:', event, session?.user?.email);
        
        switch (event) {
          case 'SIGNED_IN':
            if (session?.user) {
              console.log('🔐 AuthStore: サインインイベント処理');
              let profile: User | null = null;
              
              try {
                profile = await AuthService.getCurrentUser();
              } catch (error) {
                console.error('🔐 AuthStore: SIGNED_INでプロフィール取得失敗:', error);
              }
              
              if (profile) {
                set({ user: profile, isAuthenticated: true, isLoading: false });
                await AsyncStorage.setItem('user', JSON.stringify(profile));
              } else {
                const basicUser: User = {
                  id: session.user.id,
                  email: session.user.email!,
                  name: session.user.user_metadata?.full_name || 
                        session.user.user_metadata?.name ||
                        session.user.email?.split('@')[0] || 'ユーザー',
                  avatar_url: session.user.user_metadata?.avatar_url ||
                             session.user.user_metadata?.picture
                };
                set({ user: basicUser, isAuthenticated: true, isLoading: false });
                await AsyncStorage.setItem('user', JSON.stringify(basicUser));
              }
            }
            break;
            
          case 'SIGNED_OUT':
            console.log('🔐 AuthStore: サインアウトイベント処理');
            set({ user: null, isAuthenticated: false, isLoading: false });
            await AsyncStorage.removeItem('user');
            break;
            
          case 'TOKEN_REFRESHED':
            console.log('🔐 AuthStore: トークン更新イベント');
            if (session) {
              const currentState = get();
              if (currentState.user && currentState.isAuthenticated) {
                // 現在の認証状態を維持
                set({ isLoading: false });
              }
            }
            break;
            
          default:
            console.log('🔐 AuthStore: その他の認証イベント:', event);
        }
      });
      
      // サブスクリプションを保存（クリーンアップ用）
      set({ authListener: subscription });
      console.log('🔐 AuthStore: 認証監視設定完了');
    }
  },
}));