import { supabase } from '@/config/supabase';
import { Spot } from '@/types';

export interface Favorite {
  id: string;
  user_id: string;
  spot_id: string;
  spot_type: string;
  created_at: string;
  spot?: Spot;
}

export class FavoritesService {
  // お気に入りを追加
  static async addFavorite(userId: string, spotId: string, spotType: string): Promise<{ error: string | null }> {
    try {
      // 既に登録されているか確認
      const { data: existing } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('spot_id', spotId)
        .single();

      if (existing) {
        return { error: '既にお気に入りに登録されています' };
      }

      const { error } = await supabase
        .from('favorites')
        .insert({
          user_id: userId,
          spot_id: spotId,
          spot_type: spotType,
        });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      console.error('Add favorite error:', error);
      return { error: 'お気に入り追加中にエラーが発生しました' };
    }
  }

  // お気に入りを削除
  static async removeFavorite(userId: string, spotId: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('spot_id', spotId);

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      console.error('Remove favorite error:', error);
      return { error: 'お気に入り削除中にエラーが発生しました' };
    }
  }

  // ユーザーのお気に入り一覧を取得
  static async getUserFavorites(userId: string): Promise<{ favorites: Favorite[], error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return { favorites: [], error: error.message };
      }

      return { favorites: data || [], error: null };
    } catch (error) {
      console.error('Get favorites error:', error);
      return { favorites: [], error: 'お気に入り取得中にエラーが発生しました' };
    }
  }

  // 特定のスポットがお気に入りに登録されているか確認
  static async isFavorite(userId: string, spotId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('spot_id', spotId)
        .single();

      return !!data;
    } catch (error) {
      return false;
    }
  }

  // お気に入りの統計情報を取得
  static async getFavoriteStats(userId: string): Promise<{ 
    total: number, 
    byCategory: Record<string, number> 
  }> {
    try {
      const { data } = await supabase
        .from('favorites')
        .select('spot_type')
        .eq('user_id', userId);

      if (!data) {
        return { total: 0, byCategory: {} };
      }

      const byCategory: Record<string, number> = {};
      data.forEach(item => {
        byCategory[item.spot_type] = (byCategory[item.spot_type] || 0) + 1;
      });

      return {
        total: data.length,
        byCategory,
      };
    } catch (error) {
      console.error('Get favorite stats error:', error);
      return { total: 0, byCategory: {} };
    }
  }

  // お気に入りに登録されたスポットの詳細情報を取得
  static async getFavoriteSpots(userId: string): Promise<{ spots: Spot[], error: string | null }> {
    try {
      // まずお気に入り一覧を取得
      const { data: favorites, error: favError } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (favError || !favorites) {
        return { spots: [], error: favError?.message || 'お気に入りの取得に失敗しました' };
      }

      // カテゴリー別にスポットIDをグループ化
      const spotsByType: Record<string, string[]> = {};
      favorites.forEach(fav => {
        if (!spotsByType[fav.spot_type]) {
          spotsByType[fav.spot_type] = [];
        }
        spotsByType[fav.spot_type].push(fav.spot_id);
      });

      // 各カテゴリーのテーブルから情報を取得
      const allSpots: Spot[] = [];

      // コインパーキング
      if (spotsByType['コインパーキング']) {
        const { data } = await supabase
          .from('parking_spots')
          .select('*')
          .in('id', spotsByType['コインパーキング']);
        
        if (data) {
          allSpots.push(...data.map(spot => ({
            ...spot,
            category: 'コインパーキング' as const,
          })));
        }
      }

      // コンビニ
      if (spotsByType['コンビニ']) {
        const { data } = await supabase
          .from('convenience_stores')
          .select('*')
          .in('id', spotsByType['コンビニ']);
        
        if (data) {
          allSpots.push(...data.map(spot => ({
            ...spot,
            category: 'コンビニ' as const,
          })));
        }
      }

      // 温泉
      if (spotsByType['温泉']) {
        const { data } = await supabase
          .from('hot_springs')
          .select('*')
          .in('id', spotsByType['温泉']);
        
        if (data) {
          allSpots.push(...data.map(spot => ({
            ...spot,
            category: '温泉' as const,
          })));
        }
      }

      // ガソリンスタンド
      if (spotsByType['ガソリンスタンド']) {
        const { data } = await supabase
          .from('gas_stations')
          .select('*')
          .in('id', spotsByType['ガソリンスタンド']);
        
        if (data) {
          allSpots.push(...data.map(spot => ({
            ...spot,
            category: 'ガソリンスタンド' as const,
          })));
        }
      }

      // お祭り・花火大会
      if (spotsByType['お祭り・花火大会']) {
        const { data } = await supabase
          .from('festivals')
          .select('*')
          .in('id', spotsByType['お祭り・花火大会']);
        
        if (data) {
          allSpots.push(...data.map(spot => ({
            ...spot,
            category: 'お祭り・花火大会' as const,
          })));
        }
      }

      // お気に入り登録順にソート
      const sortedSpots = allSpots.sort((a, b) => {
        const favA = favorites.find(f => f.spot_id === a.id);
        const favB = favorites.find(f => f.spot_id === b.id);
        return new Date(favB?.created_at || 0).getTime() - new Date(favA?.created_at || 0).getTime();
      });

      return { spots: sortedSpots, error: null };
    } catch (error) {
      console.error('Get favorite spots error:', error);
      return { spots: [], error: 'お気に入りスポットの取得中にエラーが発生しました' };
    }
  }
}