import { supabase } from '@/config/supabase';

export interface Review {
  id: string;
  user_id: string;
  spot_id: string;
  spot_type: string;
  rating: number;
  comment: string;
  images?: string[];
  likes_count: number;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

export interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  rating_distribution: Record<number, number>;
}

export class ReviewsService {
  // レビューを投稿
  static async createReview(
    userId: string,
    spotId: string,
    spotType: string,
    rating: number,
    comment: string,
    images?: string[]
  ): Promise<{ review: Review | null, error: string | null }> {
    try {
      // 既存のレビューがあるか確認
      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('user_id', userId)
        .eq('spot_id', spotId)
        .single();

      if (existing) {
        return { review: null, error: '既にレビューを投稿しています' };
      }

      const { data, error } = await supabase
        .from('reviews')
        .insert({
          user_id: userId,
          spot_id: spotId,
          spot_type: spotType,
          rating,
          comment,
          images: images || [],
          likes_count: 0,
        })
        .select()
        .single();

      if (error) {
        return { review: null, error: error.message };
      }

      return { review: data, error: null };
    } catch (error) {
      console.error('Create review error:', error);
      return { review: null, error: 'レビュー投稿中にエラーが発生しました' };
    }
  }

  // レビューを更新
  static async updateReview(
    reviewId: string,
    userId: string,
    updates: {
      rating?: number;
      comment?: string;
      images?: string[];
    }
  ): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId)
        .eq('user_id', userId);

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      console.error('Update review error:', error);
      return { error: 'レビュー更新中にエラーが発生しました' };
    }
  }

  // レビューを削除
  static async deleteReview(reviewId: string, userId: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)
        .eq('user_id', userId);

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      console.error('Delete review error:', error);
      return { error: 'レビュー削除中にエラーが発生しました' };
    }
  }

  // スポットのレビュー一覧を取得
  static async getSpotReviews(
    spotId: string,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: 'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'likes';
    } = {}
  ): Promise<{ reviews: Review[], error: string | null }> {
    try {
      const { limit = 20, offset = 0, sortBy = 'newest' } = options;

      let query = supabase
        .from('reviews')
        .select(`
          *,
          user:profiles!user_id (
            id,
            name,
            avatar_url
          )
        `)
        .eq('spot_id', spotId)
        .range(offset, offset + limit - 1);

      // ソート条件を適用
      switch (sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'rating_high':
          query = query.order('rating', { ascending: false });
          break;
        case 'rating_low':
          query = query.order('rating', { ascending: true });
          break;
        case 'likes':
          query = query.order('likes_count', { ascending: false });
          break;
      }

      const { data, error } = await query;

      if (error) {
        return { reviews: [], error: error.message };
      }

      return { reviews: data || [], error: null };
    } catch (error) {
      console.error('Get spot reviews error:', error);
      return { reviews: [], error: 'レビュー取得中にエラーが発生しました' };
    }
  }

  // スポットの評価統計を取得
  static async getSpotReviewStats(spotId: string): Promise<ReviewStats> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('spot_id', spotId);

      if (error || !data || data.length === 0) {
        return {
          average_rating: 0,
          total_reviews: 0,
          rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        };
      }

      const ratings = data.map(r => r.rating);
      const average = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
      
      const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratings.forEach(rating => {
        distribution[rating] = (distribution[rating] || 0) + 1;
      });

      return {
        average_rating: Math.round(average * 10) / 10,
        total_reviews: data.length,
        rating_distribution: distribution,
      };
    } catch (error) {
      console.error('Get review stats error:', error);
      return {
        average_rating: 0,
        total_reviews: 0,
        rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }
  }

  // レビューにいいねを追加
  static async likeReview(reviewId: string, userId: string): Promise<{ error: string | null }> {
    try {
      // 既にいいねしているか確認
      const { data: existing } = await supabase
        .from('review_likes')
        .select('id')
        .eq('review_id', reviewId)
        .eq('user_id', userId)
        .single();

      if (existing) {
        return { error: '既にいいねしています' };
      }

      // いいねを追加
      const { error: likeError } = await supabase
        .from('review_likes')
        .insert({
          review_id: reviewId,
          user_id: userId,
        });

      if (likeError) {
        return { error: likeError.message };
      }

      // いいね数を更新
      const { error: updateError } = await supabase.rpc('increment_review_likes', {
        review_id: reviewId,
      });

      if (updateError) {
        return { error: updateError.message };
      }

      return { error: null };
    } catch (error) {
      console.error('Like review error:', error);
      return { error: 'いいね追加中にエラーが発生しました' };
    }
  }

  // レビューのいいねを削除
  static async unlikeReview(reviewId: string, userId: string): Promise<{ error: string | null }> {
    try {
      const { error: deleteError } = await supabase
        .from('review_likes')
        .delete()
        .eq('review_id', reviewId)
        .eq('user_id', userId);

      if (deleteError) {
        return { error: deleteError.message };
      }

      // いいね数を更新
      const { error: updateError } = await supabase.rpc('decrement_review_likes', {
        review_id: reviewId,
      });

      if (updateError) {
        return { error: updateError.message };
      }

      return { error: null };
    } catch (error) {
      console.error('Unlike review error:', error);
      return { error: 'いいね削除中にエラーが発生しました' };
    }
  }

  // ユーザーがレビューにいいねしているか確認
  static async hasLikedReview(reviewId: string, userId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('review_likes')
        .select('id')
        .eq('review_id', reviewId)
        .eq('user_id', userId)
        .single();

      return !!data;
    } catch (error) {
      return false;
    }
  }

  // ユーザーのレビュー履歴を取得
  static async getUserReviews(userId: string): Promise<{ reviews: Review[], error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return { reviews: [], error: error.message };
      }

      return { reviews: data || [], error: null };
    } catch (error) {
      console.error('Get user reviews error:', error);
      return { reviews: [], error: 'レビュー取得中にエラーが発生しました' };
    }
  }
}