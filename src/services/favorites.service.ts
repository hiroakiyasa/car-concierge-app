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
  // カテゴリ名を変換（日本語 → データベース用）
  private static convertCategoryToDbType(category: string): string {
    const categoryMap: Record<string, string> = {
      'コインパーキング': 'parking',
      'コンビニ': 'facility',
      '温泉': 'facility',
      'ガソリンスタンド': 'facility',
      'お祭り・花火大会': 'facility',
    };
    return categoryMap[category] || 'facility';
  }

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

      // カテゴリ名をデータベース用に変換
      const dbSpotType = this.convertCategoryToDbType(spotType);
      console.log('🔖 お気に入り追加:', { originalType: spotType, dbType: dbSpotType });

      const { error } = await supabase
        .from('favorites')
        .insert({
          user_id: userId,
          spot_id: spotId,
          spot_type: dbSpotType,
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

      console.log('🔖 お気に入り取得結果:', { 
        userId, 
        favoritesCount: favorites?.length || 0,
        favorites: favorites,
        error: favError 
      });

      if (favError || !favorites) {
        return { spots: [], error: favError?.message || 'お気に入りの取得に失敗しました' };
      }

      if (favorites.length === 0) {
        return { spots: [], error: null };
      }

      // カテゴリー別にスポットIDをグループ化
      const spotsByType: Record<string, string[]> = {};
      favorites.forEach(fav => {
        if (!spotsByType[fav.spot_type]) {
          spotsByType[fav.spot_type] = [];
        }
        spotsByType[fav.spot_type].push(fav.spot_id);
      });
      
      console.log('🔖 カテゴリー別スポットID:', spotsByType);

      // 各カテゴリーのテーブルから情報を取得
      const allSpots: Spot[] = [];

      // コインパーキング (データベースでは 'parking' として保存)
      if (spotsByType['parking']) {
        console.log('🚗 駐車場検索中:', spotsByType['parking']);
        // parking_spots.id is bigint, so we need to convert strings to numbers
        const parkingIds = spotsByType['parking'].map(id => parseInt(id, 10));
        const { data, error } = await supabase
          .from('parking_spots')
          .select('*')
          .in('id', parkingIds);
        
        console.log('🚗 駐車場検索結果:', { count: data?.length || 0, error });
        
        if (data) {
          allSpots.push(...data.map(spot => ({
            ...spot,
            id: spot.id.toString(), // Convert bigint back to string for consistency
            category: 'コインパーキング' as const,
          })));
        }
      }

      // 施設系 (データベースでは 'facility' として保存)
      if (spotsByType['facility']) {
        // コンビニ、温泉、ガソリンスタンド、お祭りなどすべての施設IDを取得
        const facilityIds = spotsByType['facility'];
        console.log('🏢 施設系ID:', facilityIds);
        
        // コンビニ
        const { data: convenienceData, error: convError } = await supabase
          .from('convenience_stores')
          .select('*')
          .in('id', facilityIds);
        
        console.log('🏪 コンビニ検索結果:', { count: convenienceData?.length || 0, error: convError });
        
        if (convenienceData) {
          allSpots.push(...convenienceData.map(spot => ({
            ...spot,
            category: 'コンビニ' as const,
          })));
        }

        // 温泉
        const { data: hotSpringData, error: hotError } = await supabase
          .from('hot_springs')
          .select('*')
          .in('id', facilityIds);
        
        console.log('♨️ 温泉検索結果:', { count: hotSpringData?.length || 0, error: hotError });
        
        if (hotSpringData) {
          allSpots.push(...hotSpringData.map(spot => ({
            ...spot,
            category: '温泉' as const,
          })));
        }

        // ガソリンスタンド
        const { data: gasStationData, error: gasError } = await supabase
          .from('gas_stations')
          .select('*')
          .in('id', facilityIds);
        
        console.log('⛽ ガソリンスタンド検索結果:', { count: gasStationData?.length || 0, error: gasError });
        
        if (gasStationData) {
          allSpots.push(...gasStationData.map(spot => ({
            ...spot,
            category: 'ガソリンスタンド' as const,
          })));
        }

        // お祭り・花火大会
        const { data: festivalData, error: festError } = await supabase
          .from('festivals')
          .select('*')
          .in('id', facilityIds);
        
        console.log('🎆 お祭り検索結果:', { count: festivalData?.length || 0, error: festError });
        
        if (festivalData) {
          allSpots.push(...festivalData.map(spot => ({
            ...spot,
            category: 'お祭り・花火大会' as const,
          })));
        }
      }
      
      console.log('🔖 全スポット取得結果:', { totalSpots: allSpots.length });

      // お気に入り登録順にソート
      const sortedSpots = allSpots.sort((a, b) => {
        // Convert both IDs to strings for comparison
        const favA = favorites.find(f => f.spot_id === a.id.toString());
        const favB = favorites.find(f => f.spot_id === b.id.toString());
        return new Date(favB?.created_at || 0).getTime() - new Date(favA?.created_at || 0).getTime();
      });

      return { spots: sortedSpots, error: null };
    } catch (error) {
      console.error('Get favorite spots error:', error);
      return { spots: [], error: 'お気に入りスポットの取得中にエラーが発生しました' };
    }
  }
}