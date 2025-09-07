import { supabase } from '@/config/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export interface ParkingReview {
  id: string;
  parking_spot_id: number;
  user_id: string;
  content: string;
  rating: number;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
}

export class ReviewService {
  /**
   * 駐車場の感想を取得
   */
  static async getReviews(parkingSpotId: number): Promise<ParkingReview[]> {
    try {
      // まずレビューを取得
      const { data: reviews, error } = await supabase
        .from('parking_reviews')
        .select('*')
        .eq('parking_spot_id', parkingSpotId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reviews:', error);
        return [];
      }

      if (!reviews || reviews.length === 0) {
        return [];
      }

      // ユーザーIDの配列を取得
      const userIds = [...new Set(reviews.map(review => review.user_id))];

      // user_profilesから表示名を取得
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(
        profiles?.map(profile => [profile.id, profile]) || []
      );

      return reviews.map(review => ({
        id: review.id,
        parking_spot_id: review.parking_spot_id,
        user_id: review.user_id,
        content: review.content,
        rating: review.rating,
        created_at: review.created_at,
        updated_at: review.updated_at,
        user_email: '', // user_profilesにemailはないので空文字
        user_name: profileMap.get(review.user_id)?.display_name || '匿名ユーザー'
      }));
    } catch (error) {
      console.error('Error in getReviews:', error);
      return [];
    }
  }

  /**
   * 感想を投稿
   */
  static async createReview(
    parkingSpotId: number,
    content: string,
    rating: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📝 レビュー投稿開始 - parkingSpotId:', parkingSpotId);
      
      // AuthStoreの状態をチェック
      const authState = useAuthStore.getState();
      console.log('📝 AuthStore状態:', {
        hasUser: !!authState.user,
        isAuthenticated: authState.isAuthenticated,
        isLoading: authState.isLoading,
        userEmail: authState.user?.email
      });
      
      // セッション情報を詳細にチェック
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('📝 セッション情報:', {
        hasSession: !!sessionData.session,
        hasUser: !!sessionData.session?.user,
        userId: sessionData.session?.user?.id,
        error: sessionError
      });

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('📝 ユーザー情報:', {
        hasUser: !!user,
        userId: user?.id,
        email: user?.email,
        error: userError
      });
      
      if (!user) {
        console.error('📝 ユーザーが見つかりません - 認証が必要');
        console.error('📝 詳細エラー情報:', {
          sessionError: sessionError?.message,
          userError: userError?.message,
          hasSessionData: !!sessionData.session,
          sessionUserId: sessionData.session?.user?.id,
        });
        
        // AuthStoreは認証済みだがSupabaseセッションがない場合の対処
        if (authState.isAuthenticated && authState.user) {
          console.log('📝 AuthStoreは認証済み - Supabaseセッション再同期を試行');
          
          // AuthStoreの認証状態を再検証
          try {
            await useAuthStore.getState().checkAuth();
            
            // 再検証後に再度Supabaseセッションをチェック
            const { data: newSessionData } = await supabase.auth.getSession();
            const { data: { user: newUser } } = await supabase.auth.getUser();
            
            console.log('📝 再同期後のSupabase状態:', {
              hasNewSession: !!newSessionData.session,
              hasNewUser: !!newUser,
              newUserId: newUser?.id
            });
            
            if (newUser) {
              console.log('📝 Supabaseセッション再同期成功 - 処理を続行');
              // 再同期成功した場合は処理を続行
              const { error } = await supabase
                .from('parking_reviews')
                .insert({
                  parking_spot_id: parkingSpotId,
                  user_id: newUser.id,
                  content: content.trim(),
                  rating
                });

              if (error) {
                console.error('Error creating review (after resync):', error);
                return { success: false, error: '感想の投稿に失敗しました' };
              }

              console.log('📝 レビュー投稿成功（再同期後）');
              return { success: true };
            }
          } catch (resyncError) {
            console.error('📝 再同期中にエラー:', resyncError);
          }
        }
        
        return { 
          success: false, 
          error: '認証セッションが無効です。一度ログアウトして再度ログインしてください。' 
        };
      }

      const { error } = await supabase
        .from('parking_reviews')
        .insert({
          parking_spot_id: parkingSpotId,
          user_id: user.id,
          content: content.trim(),
          rating
        });

      if (error) {
        console.error('Error creating review:', error);
        return { success: false, error: '感想の投稿に失敗しました' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in createReview:', error);
      return { success: false, error: '感想の投稿に失敗しました' };
    }
  }

  /**
   * 感想を更新
   */
  static async updateReview(
    reviewId: string,
    content: string,
    rating: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('parking_reviews')
        .update({
          content: content.trim(),
          rating
        })
        .eq('id', reviewId);

      if (error) {
        console.error('Error updating review:', error);
        return { success: false, error: '感想の更新に失敗しました' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in updateReview:', error);
      return { success: false, error: '感想の更新に失敗しました' };
    }
  }

  /**
   * 感想を削除
   */
  static async deleteReview(reviewId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('parking_reviews')
        .delete()
        .eq('id', reviewId);

      if (error) {
        console.error('Error deleting review:', error);
        return { success: false, error: '感想の削除に失敗しました' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in deleteReview:', error);
      return { success: false, error: '感想の削除に失敗しました' };
    }
  }

  /**
   * 駐車場の平均評価を取得
   */
  static async getAverageRating(parkingSpotId: number): Promise<{ average: number; count: number }> {
    try {
      const { data, error } = await supabase
        .from('parking_reviews')
        .select('rating')
        .eq('parking_spot_id', parkingSpotId);

      if (error) {
        console.error('Error fetching rating:', error);
        return { average: 0, count: 0 };
      }

      if (!data || data.length === 0) {
        return { average: 0, count: 0 };
      }

      const total = data.reduce((sum, review) => sum + review.rating, 0);
      const average = total / data.length;

      return { average: Math.round(average * 10) / 10, count: data.length };
    } catch (error) {
      console.error('Error in getAverageRating:', error);
      return { average: 0, count: 0 };
    }
  }
}