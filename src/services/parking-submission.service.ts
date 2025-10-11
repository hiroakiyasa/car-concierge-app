/**
 * 駐車場投稿サービス
 * ユーザーからの新規駐車場追加・料金更新投稿を管理
 */

import { supabase } from '@/config/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export interface ParkingSubmission {
  id: string;
  user_id: string;
  submission_type: 'new_parking' | 'update_rates';
  existing_parking_id?: number;
  latitude: number;
  longitude: number;
  image_url: string;
  image_path: string;
  ocr_result?: any;
  extracted_data?: {
    name?: string;
    rates?: any[];
    capacity?: string;
    hours?: string;
    address?: string;
  };
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'merged';
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
  updated_at: string;
  user_notes?: string;
  confidence_score?: number;
}

export interface SubmitParkingParams {
  type: 'new_parking' | 'update_rates';
  existingParkingId?: number;
  latitude: number;
  longitude: number;
  imageUri: string; // ローカル画像パス
  userNotes?: string;
}

class ParkingSubmissionService {
  /**
   * 駐車場情報を投稿
   */
  async submitParking(params: SubmitParkingParams): Promise<{
    success: boolean;
    submission?: ParkingSubmission;
    error?: string;
  }> {
    try {
      // 1. 認証チェック
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return {
          success: false,
          error: '認証エラー: ログインが必要です',
        };
      }

      // 2. 画像をStorageにアップロード
      const uploadResult = await this.uploadImage(user.id, params.imageUri);

      if (!uploadResult.success || !uploadResult.path || !uploadResult.url) {
        return {
          success: false,
          error: uploadResult.error || '画像のアップロードに失敗しました',
        };
      }

      // 3. 投稿レコードを作成
      const { data, error } = await supabase
        .from('parking_submissions')
        .insert({
          user_id: user.id,
          submission_type: params.type,
          existing_parking_id: params.existingParkingId,
          latitude: params.latitude,
          longitude: params.longitude,
          image_url: uploadResult.url,
          image_path: uploadResult.path,
          user_notes: params.userNotes,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('投稿作成エラー:', error);
        return {
          success: false,
          error: '投稿の作成に失敗しました',
        };
      }

      // 4. 投稿完了（OCRは管理者が手動実行）
      console.log('✅ 投稿完了:', data.id);
      console.log('💡 OCRは管理者画面から手動で実行できます');

      return {
        success: true,
        submission: data,
      };
    } catch (error) {
      console.error('submitParking エラー:', error);
      return {
        success: false,
        error: '予期しないエラーが発生しました',
      };
    }
  }

  /**
   * 画像をStorageにアップロード
   */
  private async uploadImage(userId: string, imageUri: string): Promise<{
    success: boolean;
    path?: string;
    url?: string;
    error?: string;
  }> {
    try {
      // ファイルをBase64で読み込み（ファイル存在チェック不要）
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // ファイル名を生成
      const timestamp = Date.now();
      const fileName = `${timestamp}_parking_sign.jpg`;
      const submissionId = this.generateUUID();
      const filePath = `${userId}/${submissionId}/${fileName}`;

      // Storageにアップロード
      const { data, error } = await supabase.storage
        .from('parking-submissions')
        .upload(filePath, decode(base64), {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Storage アップロードエラー:', error);

        // Bucket not found エラーの場合は詳細なメッセージを返す
        if (error.message?.includes('Bucket not found')) {
          return {
            success: false,
            error: 'Storageバケット「parking-submissions」が作成されていません。セットアップガイド（CROWDSOURCING_SETUP.md）を参照してください。',
          };
        }

        return {
          success: false,
          error: `ファイルのアップロードに失敗しました: ${error.message}`,
        };
      }

      // 公開URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('parking-submissions')
        .getPublicUrl(filePath);

      return {
        success: true,
        path: filePath,
        url: publicUrl,
      };
    } catch (error) {
      console.error('uploadImage エラー:', error);
      return {
        success: false,
        error: '画像のアップロード中にエラーが発生しました',
      };
    }
  }

  /**
   * 画像認識処理をトリガー（管理者が手動実行）
   */
  async triggerImageProcessing(submissionId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('process-parking-image', {
        body: { submissionId },
      });

      if (error) {
        console.error('画像処理トリガーエラー:', error);
        return {
          success: false,
          error: 'OCR処理の実行に失敗しました',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('triggerImageProcessing エラー:', error);
      return {
        success: false,
        error: '予期しないエラーが発生しました',
      };
    }
  }

  /**
   * 投稿を承認
   */
  async approveSubmission(id: string, reviewNotes?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return {
          success: false,
          error: '認証エラー: ログインが必要です',
        };
      }

      const { error } = await supabase
        .from('parking_submissions')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes,
        })
        .eq('id', id);

      if (error) {
        console.error('承認エラー:', error);
        return {
          success: false,
          error: '承認処理に失敗しました',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('approveSubmission エラー:', error);
      return {
        success: false,
        error: '予期しないエラーが発生しました',
      };
    }
  }

  /**
   * 投稿を却下
   */
  async rejectSubmission(id: string, reviewNotes?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return {
          success: false,
          error: '認証エラー: ログインが必要です',
        };
      }

      const { error } = await supabase
        .from('parking_submissions')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes,
        })
        .eq('id', id);

      if (error) {
        console.error('却下エラー:', error);
        return {
          success: false,
          error: '却下処理に失敗しました',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('rejectSubmission エラー:', error);
      return {
        success: false,
        error: '予期しないエラーが発生しました',
      };
    }
  }

  /**
   * ユーザーの投稿一覧を取得
   */
  async getUserSubmissions(userId?: string): Promise<{
    success: boolean;
    submissions?: ParkingSubmission[];
    error?: string;
  }> {
    try {
      let query = supabase
        .from('parking_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('投稿取得エラー:', error);
        return {
          success: false,
          error: '投稿の取得に失敗しました',
        };
      }

      return {
        success: true,
        submissions: data || [],
      };
    } catch (error) {
      console.error('getUserSubmissions エラー:', error);
      return {
        success: false,
        error: '予期しないエラーが発生しました',
      };
    }
  }

  /**
   * 投稿の詳細を取得
   */
  async getSubmission(id: string): Promise<{
    success: boolean;
    submission?: ParkingSubmission;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('parking_submissions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('投稿詳細取得エラー:', error);
        return {
          success: false,
          error: '投稿の取得に失敗しました',
        };
      }

      return {
        success: true,
        submission: data,
      };
    } catch (error) {
      console.error('getSubmission エラー:', error);
      return {
        success: false,
        error: '予期しないエラーが発生しました',
      };
    }
  }

  /**
   * 投稿を削除（ユーザー自身の投稿のみ）
   */
  async deleteSubmission(id: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { error } = await supabase
        .from('parking_submissions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('投稿削除エラー:', error);
        return {
          success: false,
          error: '投稿の削除に失敗しました',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('deleteSubmission エラー:', error);
      return {
        success: false,
        error: '予期しないエラーが発生しました',
      };
    }
  }

  /**
   * UUID生成
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

export const parkingSubmissionService = new ParkingSubmissionService();
