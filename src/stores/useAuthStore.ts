import { create } from 'zustand';
import { AuthService, User } from '@/services/auth.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/config/supabase';

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
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
    
    const { user, error } = await AuthService.signInWithGoogle();
    
    if (user) {
      set({ user, isAuthenticated: true, isLoading: false });
      await AsyncStorage.setItem('user', JSON.stringify(user));
    } else {
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
    console.log('🔐 AuthStore: initializeAuth - Supabase認証監視を開始');
    
    // まず現在のSupabaseセッション状態を確認
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      console.log('🔐 AuthStore: 初期化時のSupabase状態:', {
        hasSession: !!sessionData.session,
        hasUser: !!currentUser,
        sessionError: sessionError?.message,
        userError: userError?.message,
        userId: currentUser?.id
      });
      
      // Supabaseセッションが有効な場合、AuthStoreを同期
      if (currentUser && sessionData.session) {
        console.log('🔐 AuthStore: 有効なSupabaseセッションを発見 - AuthStoreを同期');
        const profile = await AuthService.getCurrentUser();
        if (profile) {
          set({ user: profile, isAuthenticated: true, isLoading: false });
          await AsyncStorage.setItem('user', JSON.stringify(profile));
          console.log('🔐 AuthStore: Supabaseセッションから復元成功');
        }
      } else {
        // Supabaseセッションが無効な場合、AuthStoreもクリア
        console.log('🔐 AuthStore: Supabaseセッション無効 - AuthStoreをクリア');
        set({ user: null, isAuthenticated: false, isLoading: false });
        await AsyncStorage.removeItem('user');
      }
    } catch (initError) {
      console.error('🔐 AuthStore: 初期化エラー:', initError);
      set({ user: null, isAuthenticated: false, isLoading: false });
      await AsyncStorage.removeItem('user');
    }
    
    // Supabaseの認証状態変更を監視
    const { data: { subscription } } = AuthService.subscribeToAuthChanges(async (user) => {
      console.log('🔐 AuthStore: 認証状態変更:', !!user ? user.email : 'ログアウト');
      
      if (user) {
        const profile = await AuthService.getCurrentUser();
        if (profile) {
          set({ user: profile, isAuthenticated: true, isLoading: false });
          await AsyncStorage.setItem('user', JSON.stringify(profile));
        }
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
        await AsyncStorage.removeItem('user');
      }
    });
    
    console.log('🔐 AuthStore: 認証状態監視設定完了');
    
    // 初期認証チェック（既に上で実行済みだがバックアップとして）
    await get().checkAuth();
  },
}));