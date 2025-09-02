import { create } from 'zustand';
import { AuthService, User } from '@/services/auth.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  signUp: (email: string, password: string, name?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  signUp: async (email: string, password: string, name?: string) => {
    set({ isLoading: true });
    
    const { user, error } = await AuthService.signUp(email, password, name);
    
    if (user) {
      set({ user, isAuthenticated: true, isLoading: false });
      await AsyncStorage.setItem('user', JSON.stringify(user));
    } else {
      set({ isLoading: false });
    }
    
    return { error };
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true });
    
    const { user, error } = await AuthService.signIn(email, password);
    
    if (user) {
      set({ user, isAuthenticated: true, isLoading: false });
      await AsyncStorage.setItem('user', JSON.stringify(user));
    } else {
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
      // まずローカルストレージから取得
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedUser) {
        const user = JSON.parse(storedUser);
        set({ user, isAuthenticated: true });
      }
      
      // Supabaseから最新の状態を取得
      const currentUser = await AuthService.getCurrentUser();
      
      if (currentUser) {
        set({ user: currentUser, isAuthenticated: true });
        await AsyncStorage.setItem('user', JSON.stringify(currentUser));
      } else if (!storedUser) {
        set({ user: null, isAuthenticated: false });
      }
    } catch (error) {
      console.error('Check auth error:', error);
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
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
}));