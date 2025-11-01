/**
 * 管理画面: 駐車場投稿の承認・却下
 * 管理者がユーザーからの投稿を確認し、承認・却下する
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Modal,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/utils/constants';
import { supabase } from '@/config/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { parkingSubmissionService } from '@/services/parking-submission.service';
import { CrossPlatformMap, Marker } from '@/components/Map/CrossPlatformMap';
import { decode } from 'base64-arraybuffer';

interface Submission {
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
    rates?: Array<{
      type: 'base' | 'progressive' | 'max';
      minutes: number;
      price: number;
      time_range?: string;
    }>;
    capacity?: number;
    hours?: {
      hours: string;
      is_24h: boolean;
      original_hours: string;
    };
    address?: string;
    phone_number?: string;
  };
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'merged';
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
  updated_at: string;
  user_notes?: string;
  confidence_score?: number;
  user_email?: string;
}

interface AdminSubmissionsScreenProps {
  navigation: any;
}

interface ParkingSpot {
  id: number;
  name: string;
  lat: number;
  lng: number;
  rates: any[];
  capacity?: number;
  hours?: any;
  address?: string;
  phone_number?: string;
  images?: string[];
  is_user_submitted: boolean;
  created_at: string;
}

// 管理者として許可されたメールアドレス
const ADMIN_EMAILS = ['hiroakiyasa@yahoo.co.jp', 'hiroakiyasa@gmail.com'];

export const AdminSubmissionsScreen: React.FC<AdminSubmissionsScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuthStore();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRunningOCR, setIsRunningOCR] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [googleSearchResults, setGoogleSearchResults] = useState<any>(null);

  // 編集可能なデータ（OCR結果を編集するため）
  const [editableData, setEditableData] = useState<Submission['extracted_data'] | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [jsonEditError, setJsonEditError] = useState<string | null>(null);

  // ユーザー投稿駐車場の管理用
  const [viewMode, setViewMode] = useState<'submissions' | 'parking'>('submissions');
  const [userParkingSpots, setUserParkingSpots] = useState<ParkingSpot[]>([]);
  const [selectedParkingSpot, setSelectedParkingSpot] = useState<ParkingSpot | null>(null);

  // モーダルを閉じる関数（すべての関連状態をリセット）
  const closeDetailModal = () => {
    setSelectedSubmission(null);
    setEditableData(null);
    setIsEditMode(false);
    setReviewNotes('');
    setGoogleSearchResults(null);
    setIsRunningOCR(false);
    setIsSearching(false);
    setIsProcessing(false);
    setJsonEditError(null);
  };

  // 管理者権限チェック
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        Alert.alert('アクセス拒否', '管理画面にアクセスするにはログインが必要です', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
        return;
      }

      // セッションを取得（TestFlight対応）
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.user?.email) {
        Alert.alert('エラー', 'ユーザー情報の取得に失敗しました', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
        return;
      }

      // 管理者メールアドレスをチェック（大文字小文字を区別しない）
      const userEmail = session.user.email.toLowerCase();
      const isAdmin = ADMIN_EMAILS.some(email => email.toLowerCase() === userEmail);

      console.log('🔐 AdminSubmissions: 管理者チェック', {
        userEmail,
        isAdmin,
        adminEmails: ADMIN_EMAILS,
      });

      if (!isAdmin) {
        Alert.alert(
          'アクセス拒否',
          'この画面は管理者のみアクセスできます',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    };

    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (viewMode === 'submissions') {
      loadSubmissions();
    } else {
      loadUserParkingSpots();
    }
  }, [viewMode]);

  useEffect(() => {
    filterSubmissionsByStatus();
  }, [filterStatus, submissions]);

  const loadUserParkingSpots = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('parking_spots')
        .select('*')
        .eq('is_user_submitted', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUserParkingSpots(data || []);
    } catch (error) {
      console.error('ユーザー投稿駐車場の読み込みエラー:', error);
      Alert.alert('エラー', 'ユーザー投稿駐車場の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSubmissions = async () => {
    try {
      setIsLoading(true);

      // 投稿データを取得
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('parking_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      // ユーザーIDのリストを取得
      const userIds = [...new Set(submissionsData.map((s: any) => s.user_id))];

      // ユーザープロファイルを取得
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, display_name')
        .in('id', userIds);

      if (profilesError) {
        console.warn('ユーザープロファイル取得エラー:', profilesError);
      }

      // プロファイルをマップに変換
      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.id, p.display_name])
      );

      // データを結合し、署名付きURLを生成
      const formattedData = await Promise.all(
        submissionsData.map(async (item: any) => {
          // 署名付きURLを取得（1時間有効）
          const { data: signedUrlData } = await supabase.storage
            .from('parking-submissions')
            .createSignedUrl(item.image_path, 3600);

          return {
            ...item,
            user_email: profileMap.get(item.user_id) || 'ユーザー',
            // 署名付きURLを使用（公開URLの代わり）
            image_url: signedUrlData?.signedUrl || item.image_url,
          };
        })
      );

      setSubmissions(formattedData);
    } catch (error) {
      console.error('投稿読み込みエラー:', error);
      Alert.alert('エラー', '投稿の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    if (viewMode === 'submissions') {
      await loadSubmissions();
    } else {
      await loadUserParkingSpots();
    }
    setIsRefreshing(false);
  };

  const handleDeleteParkingSpot = async (spotId: number) => {
    Alert.alert(
      '駐車場を削除',
      'この駐車場を完全に削除しますか？\n\n※ この操作は取り消せません',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsProcessing(true);

              const { error } = await supabase
                .from('parking_spots')
                .delete()
                .eq('id', spotId);

              if (error) throw error;

              Alert.alert('削除完了', '駐車場を削除しました');
              await loadUserParkingSpots();
              setSelectedParkingSpot(null);
            } catch (error) {
              console.error('削除エラー:', error);
              Alert.alert('エラー', '削除に失敗しました');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleUpdateParkingSpot = async (spotId: number, updatedData: any) => {
    try {
      setIsProcessing(true);

      const { error } = await supabase
        .from('parking_spots')
        .update(updatedData)
        .eq('id', spotId);

      if (error) throw error;

      Alert.alert('更新完了', '駐車場情報を更新しました');
      await loadUserParkingSpots();
      setSelectedParkingSpot(null);
      setIsEditMode(false);
    } catch (error) {
      console.error('更新エラー:', error);
      Alert.alert('エラー', '更新に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const filterSubmissionsByStatus = () => {
    if (filterStatus === 'all') {
      setFilteredSubmissions(submissions);
    } else {
      setFilteredSubmissions(
        submissions.filter((s) => s.status === filterStatus)
      );
    }
  };

  const handleRunOCR = async () => {
    if (!selectedSubmission) return;

    Alert.alert(
      'OCR処理を実行',
      '画像認識処理を実行して、駐車場情報を抽出しますか？\n\n※ Google Vision APIが設定されている場合は実際のOCRが実行されます',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '実行',
          style: 'default',
          onPress: async () => {
            await runOCRProcessing();
          },
        },
      ]
    );
  };

  const runOCRProcessing = async () => {
    if (!selectedSubmission) return;

    setIsRunningOCR(true);

    try {
      const result = await parkingSubmissionService.triggerImageProcessing(selectedSubmission.id);

      if (result.success) {
        // 選択中の投稿のデータだけを更新（一覧は再読み込みしない）
        const { data, error } = await supabase
          .from('parking_submissions')
          .select('*')
          .eq('id', selectedSubmission.id)
          .single();

        if (data && !error) {
          // 署名付きURLを再生成
          const { data: signedUrlData } = await supabase.storage
            .from('parking-submissions')
            .createSignedUrl(data.image_path, 3600);

          const updatedSubmission = {
            ...data,
            user_email: selectedSubmission.user_email,
            image_url: signedUrlData?.signedUrl || data.image_url,
          };

          setSelectedSubmission(updatedSubmission as Submission);

          // submissionsリストも更新
          setSubmissions(prev =>
            prev.map(s => s.id === updatedSubmission.id ? updatedSubmission as Submission : s)
          );

          Alert.alert('OCR処理完了', 'OCR処理が完了しました。データを確認してください。');
        }
      } else {
        Alert.alert('エラー', result.error || 'OCR処理に失敗しました');
      }
    } catch (error) {
      console.error('OCR実行エラー:', error);
      Alert.alert('エラー', '予期しないエラーが発生しました');
    } finally {
      setIsRunningOCR(false);
    }
  };

  const handleGoogleSearch = async () => {
    if (!selectedSubmission || !selectedSubmission.extracted_data?.name) {
      Alert.alert('エラー', '駐車場名が抽出されていません。先にOCR処理を実行してください。');
      return;
    }

    setIsSearching(true);

    try {
      const searchQuery = `${selectedSubmission.extracted_data.name} 駐車場 ${selectedSubmission.latitude.toFixed(5)} ${selectedSubmission.longitude.toFixed(5)}`;

      console.log('🔍 Google検索実行:', searchQuery);

      // 実際のGoogle Places API Nearby Searchを使用
      const placesResult = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${selectedSubmission.latitude},${selectedSubmission.longitude}&radius=100&keyword=${encodeURIComponent(selectedSubmission.extracted_data.name)}&key=AIzaSyCJ0oiGa8B4oO-Nj8inJMWFUDwfe8-p9x0`
      );

      if (!placesResult.ok) {
        throw new Error('Google Places API error');
      }

      const placesData = await placesResult.json();
      console.log('📍 Google Places結果:', placesData);

      const found = placesData.results && placesData.results.length > 0;
      const matchScore = found ? 0.9 : 0.0;

      const result = {
        query: searchQuery,
        found,
        matchScore,
        description: found
          ? `Google Placesで「${placesData.results[0].name}」が見つかりました。住所: ${placesData.results[0].vicinity || '不明'}`
          : 'Google Placesで該当する駐車場が見つかりませんでした。OCR結果を確認してください。',
        placesData: found ? placesData.results[0] : null,
      };

      setGoogleSearchResults(result);

      Alert.alert(
        'Google検索照合',
        result.description,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Google検索エラー:', error);

      // Fallback: 通常のWeb検索URLを表示
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(selectedSubmission.extracted_data.name + ' 駐車場')}`;

      setGoogleSearchResults({
        query: selectedSubmission.extracted_data.name,
        found: false,
        matchScore: 0,
        description: `API接続エラー。Googleで手動検索してください: ${searchUrl}`,
      });

      Alert.alert('エラー', '検索APIに接続できませんでした。インターネット接続を確認してください。');
    } finally {
      setIsSearching(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedSubmission) return;

    Alert.alert(
      '投稿を承認',
      'この投稿を承認してデータベースに反映しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '承認',
          style: 'default',
          onPress: async () => {
            await processApproval();
          },
        },
      ]
    );
  };

  const processApproval = async () => {
    if (!selectedSubmission || !user) return;

    setIsProcessing(true);

    try {
      // 編集されたデータまたは元のデータを使用
      const dataToUse = editableData || selectedSubmission.extracted_data;

      // 重複チェック（経度・緯度または名前が完全一致）
      console.log('🔍 重複チェック開始...');
      const parkingName = dataToUse?.name || '駐車場';

      // 1. 座標での重複チェック
      const { data: locationDuplicates } = await supabase
        .from('parking_spots')
        .select('id, name, lat, lng')
        .eq('lat', selectedSubmission.latitude)
        .eq('lng', selectedSubmission.longitude)
        .limit(1);

      if (locationDuplicates && locationDuplicates.length > 0) {
        const duplicate = locationDuplicates[0];
        console.log('⚠️ 座標重複発見:', duplicate);

        setIsProcessing(false);
        Alert.alert(
          '重複投稿（同じ位置）',
          `この投稿は既存の駐車場と同じ位置にあります。\n\n既存駐車場: ${duplicate.name}\n緯度: ${duplicate.lat}\n経度: ${duplicate.lng}\n\n既存データを更新しますか？`,
          [
            {
              text: 'キャンセル',
              style: 'cancel',
              onPress: () => {
                console.log('❌ 承認をキャンセルしました');
              },
            },
            {
              text: 'OK',
              onPress: async () => {
                console.log('🔄 既存駐車場を更新:', duplicate.id);
                await continueApprovalProcess(duplicate.id);
              },
            },
          ]
        );
        return;
      }

      // 2. 名前での重複チェック
      const { data: nameDuplicates } = await supabase
        .from('parking_spots')
        .select('id, name, lat, lng')
        .eq('name', parkingName)
        .limit(1);

      if (nameDuplicates && nameDuplicates.length > 0) {
        const duplicate = nameDuplicates[0];
        console.log('⚠️ 名前重複発見:', duplicate);

        setIsProcessing(false);
        Alert.alert(
          '重複投稿（同じ名前）',
          `この投稿は既存の駐車場と同じ名前です。\n\n既存駐車場: ${duplicate.name}\n緯度: ${duplicate.lat}\n経度: ${duplicate.lng}\n\n既存データを更新しますか？\n（別の場所の場合は「新規登録」を選択してください）`,
          [
            {
              text: 'キャンセル',
              style: 'cancel',
              onPress: () => {
                console.log('❌ 承認をキャンセルしました');
              },
            },
            {
              text: '新規登録',
              onPress: async () => {
                console.log('➕ 名前重複を無視して新規登録');
                await continueApprovalProcess();
              },
            },
            {
              text: 'OK',
              onPress: async () => {
                console.log('🔄 既存駐車場を更新:', duplicate.id);
                await continueApprovalProcess(duplicate.id);
              },
            },
          ]
        );
        return;
      }

      console.log('✅ 重複なし、承認処理を続行');
      await continueApprovalProcess();
    } catch (error: any) {
      console.error('承認エラー:', error);

      // 詳細なエラーメッセージを表示
      let errorMessage = '承認処理に失敗しました';
      if (error?.message) {
        errorMessage += `\n\nエラー詳細: ${error.message}`;
      }
      if (error?.details) {
        errorMessage += `\n${error.details}`;
      }

      Alert.alert('エラー', errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // 承認処理の本体（重複チェック後に実行）
  const continueApprovalProcess = async (existingParkingId?: number) => {
    if (!selectedSubmission || !user) return;

    try {
      const dataToUse = editableData || selectedSubmission.extracted_data;
      const isUpdate = existingParkingId !== undefined;

      let imageUrl: string | null = null;

      // 画像をspot-photosバケットにコピー（fetch + Base64方式、React Native対応）
      try {
        console.log('📸 画像を転送中:', selectedSubmission.image_path);

        // ファイル名を生成（タイムスタンプ + ランダム文字列）
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const fileExt = selectedSubmission.image_path.split('.').pop() || 'jpg';
        const newFileName = `parking_${timestamp}_${randomStr}.${fileExt}`;

        // 1. parking-submissionsバケットから画像の公開URLを取得
        const { data: { publicUrl } } = supabase.storage
          .from('parking-submissions')
          .getPublicUrl(selectedSubmission.image_path);

        console.log('📥 画像URL:', publicUrl);

        // 2. fetchで画像をダウンロードしてBase64に変換
        const response = await fetch(publicUrl);
        if (!response.ok) {
          throw new Error(`画像ダウンロード失敗: ${response.status}`);
        }

        const blob = await response.blob();
        console.log('✅ 画像ダウンロード成功:', blob.size, 'bytes');

        // 3. BlobをBase64に変換（React Native互換）
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              // data:image/jpeg;base64,xxxxx の形式なので、base64部分だけ抽出
              const base64Data = reader.result.split(',')[1];
              resolve(base64Data);
            } else {
              reject(new Error('Base64への変換に失敗'));
            }
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });

        console.log('✅ Base64変換成功:', base64.length, 'chars');

        // 4. spot-photosバケットにアップロード
        const { error: uploadError } = await supabase.storage
          .from('spot-photos')
          .upload(newFileName, decode(base64), {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (uploadError) {
          console.error('❌ 画像アップロードエラー:', uploadError);
          throw uploadError;
        }

        // 5. 公開URLを取得
        const { data: urlData } = supabase.storage
          .from('spot-photos')
          .getPublicUrl(newFileName);

        imageUrl = urlData.publicUrl;
        console.log('✅ 画像転送成功:', imageUrl);
      } catch (imageError) {
        console.error('❌ 画像処理エラー:', imageError);
        // 画像転送に失敗しても処理は続行（警告のみ）
        Alert.alert(
          '警告',
          '画像のコピーに失敗しましたが、駐車場情報は登録されます。',
          [{ text: 'OK' }]
        );
      }

      // 1. parking_spotsテーブルに新規レコード作成 または 既存レコード更新
      if (selectedSubmission.submission_type === 'new_parking') {
        const updateData: any = {
          name: dataToUse?.name || '駐車場',
          lat: selectedSubmission.latitude,
          lng: selectedSubmission.longitude,
          rates: dataToUse?.rates || [],
          capacity: dataToUse?.capacity,
          hours: dataToUse?.hours || null,
          address: dataToUse?.address,
          phone_number: dataToUse?.phone_number,
          is_user_submitted: true, // ユーザー投稿由来のフラグ
        };

        // 画像の処理（更新時は既存画像に追加）
        if (isUpdate && existingParkingId) {
          // 既存データから現在の画像配列を取得
          const { data: existingData } = await supabase
            .from('parking_spots')
            .select('images')
            .eq('id', existingParkingId)
            .single();

          const existingImages = existingData?.images || [];
          updateData.images = imageUrl ? [...existingImages, imageUrl] : existingImages;
          console.log('🔄 画像更新:', { 既存: existingImages.length, 新規追加: imageUrl ? 1 : 0, 合計: updateData.images.length });
          if (imageUrl) {
            console.log('✅ 承認画像保存 (駐車場詳細で表示可能):', imageUrl);
            console.log('📸 保存先バケット: spot-photos');
            console.log('🔗 詳細パネルでこの画像が閲覧できます');
          }
        } else {
          // 新規登録時
          updateData.images = imageUrl ? [imageUrl] : [];
          if (imageUrl) {
            console.log('✅ 新規画像保存 (駐車場詳細で表示可能):', imageUrl);
            console.log('📸 保存先バケット: spot-photos');
            console.log('🔗 詳細パネルでこの画像が閲覧できます');
          } else {
            console.log('📷 画像なし: 駐車場詳細には写真が表示されません');
          }
        }

        // オプションフィールドを追加（値がある場合のみ）
        if ((dataToUse as any)?.elevation !== undefined) {
          updateData.elevation = (dataToUse as any).elevation;
        }

        // nearest_toiletはjsonb型なのでオブジェクトとして送る
        if ((dataToUse as any)?.nearest_toilet) {
          updateData.nearest_toilet = (dataToUse as any).nearest_toilet;
        }

        // nearest_convenience_storeはtext型なので文字列として送る
        const convenienceData = (dataToUse as any)?.nearest_convenience_store;
        console.log('🏪 コンビニデータ確認:', convenienceData);
        if (convenienceData) {
          updateData.nearest_convenience_store = typeof convenienceData === 'string'
            ? convenienceData
            : JSON.stringify(convenienceData);
          console.log('✅ コンビニデータ保存:', updateData.nearest_convenience_store);
        } else {
          console.log('⚠️ コンビニデータなし');
        }

        // nearest_hotspringはtext型なので文字列として送る
        // OCRデータはnearest_hot_spring（アンダースコア2つ）の場合もある
        const hotspringData = (dataToUse as any)?.nearest_hotspring || (dataToUse as any)?.nearest_hot_spring;
        console.log('♨️ 温泉データ確認:', {
          nearest_hotspring: (dataToUse as any)?.nearest_hotspring,
          nearest_hot_spring: (dataToUse as any)?.nearest_hot_spring,
          使用するデータ: hotspringData
        });
        if (hotspringData) {
          updateData.nearest_hotspring = typeof hotspringData === 'string'
            ? hotspringData
            : JSON.stringify(hotspringData);
          console.log('✅ 温泉データ保存:', updateData.nearest_hotspring);
        } else {
          console.log('⚠️ 温泉データなし');
        }

        // INSERTまたはUPDATE
        if (isUpdate && existingParkingId) {
          console.log('🔄 parking_spotsを更新:', existingParkingId, JSON.stringify(updateData, null, 2));
          const { error: updateError } = await supabase
            .from('parking_spots')
            .update(updateData)
            .eq('id', existingParkingId);

          if (updateError) {
            console.error('❌ UPDATE エラー詳細:', updateError);
            throw updateError;
          }

          console.log('✅ parking_spotsの更新成功');
        } else {
          console.log('📝 parking_spotsに挿入するデータ:', JSON.stringify(updateData, null, 2));
          const { error: insertError } = await supabase
            .from('parking_spots')
            .insert(updateData);

          if (insertError) {
            console.error('❌ INSERT エラー詳細:', insertError);
            throw insertError;
          }

          console.log('✅ parking_spotsへの挿入成功');
        }
      }

      // 2. parking_submissionsのステータスを更新
      const { error: updateError } = await supabase
        .from('parking_submissions')
        .update({
          status: 'merged',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
          // 編集されたデータを保存
          extracted_data: dataToUse,
        })
        .eq('id', selectedSubmission.id);

      if (updateError) throw updateError;

      // 地図画面に更新フラグを設定
      await AsyncStorage.setItem('needsMapRefresh', 'true');

      const message = isUpdate
        ? '既存の駐車場情報を更新しました。\n\n地図画面に戻ると更新された情報が表示されます。'
        : '投稿をデータベースに反映しました。\n\n地図画面に戻ると新しい駐車場が表示されます。';

      Alert.alert('承認完了', message, [{ text: 'OK' }]);
      closeDetailModal();
      await loadSubmissions();
    } catch (error: any) {
      // エラーを上位のprocessApprovalに投げる
      throw error;
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission) return;

    Alert.alert(
      '投稿を却下',
      'この投稿を却下しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '却下',
          style: 'destructive',
          onPress: async () => {
            await processRejection();
          },
        },
      ]
    );
  };

  const processRejection = async () => {
    if (!selectedSubmission || !user) return;

    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from('parking_submissions')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes.trim() || null,
        })
        .eq('id', selectedSubmission.id);

      if (error) throw error;

      Alert.alert('却下完了', '投稿を却下しました');
      closeDetailModal();
      await loadSubmissions();
    } catch (error) {
      console.error('却下エラー:', error);
      Alert.alert('エラー', '却下処理に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return { backgroundColor: Colors.warning, text: '承認待ち' };
      case 'processing':
        return { backgroundColor: Colors.info, text: '処理中' };
      case 'approved':
        return { backgroundColor: Colors.success, text: '承認済み' };
      case 'rejected':
        return { backgroundColor: Colors.error, text: '却下' };
      case 'merged':
        return { backgroundColor: Colors.primary, text: '反映済み' };
      default:
        return { backgroundColor: Colors.textSecondary, text: status };
    }
  };

  // データ欠損をチェックする関数
  const getMissingDataFields = (submission: Submission): string[] => {
    const missing: string[] = [];
    const data = submission.extracted_data;

    if (!data) return ['すべてのデータ'];

    if (!data.name || data.name.trim() === '') missing.push('駐車場名');
    if (!data.rates || data.rates.length === 0) missing.push('料金情報');
    if (!data.capacity) missing.push('収容台数');
    if (!data.address || data.address.trim() === '') missing.push('住所');
    if (!data.phone_number || data.phone_number.trim() === '') missing.push('電話番号');
    if (!data.hours) missing.push('営業時間');

    return missing;
  };

  const renderSubmissionCard = (submission: Submission) => {
    const statusBadge = getStatusBadgeStyle(submission.status);
    const missingFields = getMissingDataFields(submission);
    const hasWarning = missingFields.length > 0;

    return (
      <TouchableOpacity
        key={submission.id}
        style={styles.submissionCard}
        onPress={() => {
          // 既存の状態をクリアしてから開く
          closeDetailModal();
          // 次のティックでモーダルを開く
          setTimeout(() => {
            setSelectedSubmission(submission);
          }, 50);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>
              {submission.extracted_data?.name || '駐車場情報'}
            </Text>
            <Text style={styles.cardSubtitle}>
              投稿者: {submission.user_email}
            </Text>
            {hasWarning && (
              <View style={styles.warningBadgeSmall}>
                <Ionicons name="warning" size={12} color="#F57C00" />
                <Text style={styles.warningBadgeSmallText}>
                  データ不足 ({missingFields.length}項目)
                </Text>
              </View>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBadge.backgroundColor }]}>
            <Text style={styles.statusBadgeText}>{statusBadge.text}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Image source={{ uri: submission.image_url }} style={styles.cardImage} />

          <View style={styles.cardInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={14} color={Colors.textSecondary} />
              <Text style={styles.infoText} numberOfLines={1} ellipsizeMode="tail">
                {submission.extracted_data?.address ||
                 `${submission.latitude.toFixed(4)}, ${submission.longitude.toFixed(4)}`}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="time" size={14} color={Colors.textSecondary} />
              <Text style={styles.infoText}>
                {new Date(submission.created_at).toLocaleDateString('ja-JP')}
              </Text>
              {submission.confidence_score !== null && submission.confidence_score !== undefined && (
                <>
                  <Text style={styles.infoText}> • </Text>
                  <Ionicons name="analytics" size={14} color={Colors.textSecondary} />
                  <Text style={styles.infoText}>
                    {(submission.confidence_score * 100).toFixed(0)}%
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderParkingSpotCard = (spot: ParkingSpot) => {
    return (
      <TouchableOpacity
        key={spot.id}
        style={styles.submissionCard}
        onPress={() => {
          setSelectedParkingSpot(spot);
          setEditableData({
            name: spot.name,
            rates: spot.rates,
            capacity: spot.capacity,
            hours: spot.hours,
            address: spot.address,
            phone_number: spot.phone_number,
          });
        }}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{spot.name}</Text>
            <Text style={styles.cardSubtitle}>
              ID: {spot.id} • {spot.capacity ? `${spot.capacity}台` : '台数不明'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: Colors.success }]}>
            <Text style={styles.statusBadgeText}>ユーザー投稿</Text>
          </View>
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={14} color={Colors.textSecondary} />
            <Text style={styles.infoText} numberOfLines={1} ellipsizeMode="tail">
              {spot.address || `${spot.lat.toFixed(4)}, ${spot.lng.toFixed(4)}`}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time" size={14} color={Colors.textSecondary} />
            <Text style={styles.infoText}>
              {new Date(spot.created_at).toLocaleDateString('ja-JP')}
            </Text>
            {spot.rates && spot.rates.length > 0 && (
              <>
                <Text style={styles.infoText}> • </Text>
                <Ionicons name="pricetag" size={14} color={Colors.textSecondary} />
                <Text style={styles.infoText}>
                  {spot.rates.length}件の料金情報
                </Text>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderParkingSpotDetailModal = () => {
    if (!selectedParkingSpot) return null;

    return (
      <Modal
        visible={!!selectedParkingSpot}
        animationType="slide"
        onRequestClose={() => {
          setSelectedParkingSpot(null);
          setIsEditMode(false);
          setEditableData(null);
        }}
      >
        <SafeAreaView style={styles.modalContainer} edges={['left', 'right', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setSelectedParkingSpot(null);
                setIsEditMode(false);
                setEditableData(null);
              }}
              style={styles.modalHeaderButton}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
              <Text style={styles.modalHeaderButtonText}>戻る</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>駐車場管理</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.detailSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={styles.sectionTitle}>駐車場情報</Text>
                {!isEditMode && (
                  <TouchableOpacity
                    onPress={() => setIsEditMode(true)}
                    style={{ padding: 8, backgroundColor: Colors.primary, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Ionicons name="create-outline" size={16} color={Colors.white} />
                    <Text style={{ color: Colors.white, fontSize: 12, fontWeight: '600' }}>編集</Text>
                  </TouchableOpacity>
                )}
              </View>

              {isEditMode ? (
                <View>
                  <Text style={styles.detailLabel}>JSONを編集:</Text>
                  <TextInput
                    style={[
                      styles.reviewNotesInput,
                      { minHeight: 300, fontFamily: 'Courier', fontSize: 12 },
                      jsonEditError && { borderColor: Colors.error, borderWidth: 2 }
                    ]}
                    multiline
                    value={JSON.stringify(editableData, null, 2)}
                    onChangeText={(text) => {
                      try {
                        const parsed = JSON.parse(text);
                        setEditableData(parsed);
                        setJsonEditError(null);
                      } catch (e) {
                        setJsonEditError((e as Error).message);
                      }
                    }}
                  />
                  {jsonEditError && (
                    <Text style={{ fontSize: 11, color: Colors.error, marginTop: 4 }}>
                      ⚠️ JSON構文エラー: {jsonEditError}
                    </Text>
                  )}

                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setIsEditMode(false);
                        setEditableData({
                          name: selectedParkingSpot.name,
                          rates: selectedParkingSpot.rates,
                          capacity: selectedParkingSpot.capacity,
                          hours: selectedParkingSpot.hours,
                          address: selectedParkingSpot.address,
                          phone_number: selectedParkingSpot.phone_number,
                        });
                        setJsonEditError(null);
                      }}
                      style={[styles.actionButton, styles.rejectButton]}
                    >
                      <Ionicons name="close" size={20} color={Colors.white} />
                      <Text style={styles.actionButtonText}>キャンセル</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleUpdateParkingSpot(selectedParkingSpot.id, editableData)}
                      disabled={!!jsonEditError || isProcessing}
                      style={[styles.actionButton, styles.approveButton, (jsonEditError || isProcessing) && { opacity: 0.5 }]}
                    >
                      {isProcessing ? (
                        <ActivityIndicator color={Colors.white} />
                      ) : (
                        <>
                          <Ionicons name="checkmark" size={20} color={Colors.white} />
                          <Text style={styles.actionButtonText}>保存</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>ID:</Text>
                    <Text style={styles.detailValue}>{selectedParkingSpot.id}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>駐車場名:</Text>
                    <Text style={styles.detailValue}>{selectedParkingSpot.name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>収容台数:</Text>
                    <Text style={styles.detailValue}>{selectedParkingSpot.capacity ? `${selectedParkingSpot.capacity}台` : '不明'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>住所:</Text>
                    <Text style={styles.detailValue}>{selectedParkingSpot.address || '不明'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>電話番号:</Text>
                    <Text style={styles.detailValue}>{selectedParkingSpot.phone_number || '不明'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>位置:</Text>
                    <Text style={styles.detailValue}>
                      {selectedParkingSpot.lat.toFixed(6)}, {selectedParkingSpot.lng.toFixed(6)}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {!isEditMode && (
              <View style={styles.detailSection}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton, { width: '100%' }]}
                  onPress={() => handleDeleteParkingSpot(selectedParkingSpot.id)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <>
                      <Ionicons name="trash" size={20} color={Colors.white} />
                      <Text style={styles.actionButtonText}>削除</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  const renderDetailModal = () => {
    if (!selectedSubmission) return null;

    return (
      <Modal
        visible={!!selectedSubmission}
        animationType="slide"
        onRequestClose={closeDetailModal}
      >
        <SafeAreaView style={styles.modalContainer} edges={['left', 'right', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeDetailModal} style={styles.modalHeaderButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
              <Text style={styles.modalHeaderButtonText}>戻る</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>投稿詳細</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* 画像 */}
            <Image
              source={{ uri: selectedSubmission.image_url }}
              style={styles.detailImage}
              resizeMode="contain"
            />

            {/* 投稿情報 */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>投稿情報</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>投稿者:</Text>
                <Text style={styles.detailValue}>{selectedSubmission.user_email}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>投稿日時:</Text>
                <Text style={styles.detailValue}>
                  {new Date(selectedSubmission.created_at).toLocaleString('ja-JP')}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>タイプ:</Text>
                <Text style={styles.detailValue}>
                  {selectedSubmission.submission_type === 'new_parking'
                    ? '新規駐車場'
                    : '料金更新'}
                </Text>
              </View>
              {selectedSubmission.confidence_score !== null &&
                selectedSubmission.confidence_score !== undefined && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>信頼度スコア:</Text>
                    <Text style={styles.detailValue}>
                      {(selectedSubmission.confidence_score * 100).toFixed(0)}%
                    </Text>
                  </View>
                )}
            </View>

            {/* 抽出データ */}
            {selectedSubmission.extracted_data && (
              <View style={styles.detailSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <View>
                    <Text style={styles.sectionTitle}>抽出データ</Text>
                    {getMissingDataFields(selectedSubmission).length > 0 && !isEditMode && (
                      <View style={styles.warningBadge}>
                        <Ionicons name="warning" size={16} color="#F57C00" />
                        <Text style={styles.warningBadgeText}>
                          {getMissingDataFields(selectedSubmission).length}項目が未抽出: {getMissingDataFields(selectedSubmission).join('、')}
                        </Text>
                      </View>
                    )}
                  </View>
                  {!isEditMode && (
                    <TouchableOpacity
                      onPress={() => {
                        setEditableData(selectedSubmission.extracted_data || null);
                        setIsEditMode(true);
                        setJsonEditError(null);
                      }}
                      style={{ padding: 8, backgroundColor: Colors.primary, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <Ionicons name="create-outline" size={16} color={Colors.white} />
                      <Text style={{ color: Colors.white, fontSize: 12, fontWeight: '600' }}>編集</Text>
                    </TouchableOpacity>
                  )}
                  {isEditMode && (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => {
                          setIsEditMode(false);
                          setEditableData(null);
                          setJsonEditError(null);
                        }}
                        style={{ padding: 8, backgroundColor: Colors.textSecondary, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      >
                        <Ionicons name="close-outline" size={16} color={Colors.white} />
                        <Text style={{ color: Colors.white, fontSize: 12, fontWeight: '600' }}>キャンセル</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={async () => {
                          // JSONエラーがある場合は保存できない
                          if (jsonEditError) {
                            Alert.alert('エラー', 'JSON構文エラーがあるため保存できません。修正してください。');
                            return;
                          }

                          // 編集データを保存
                          try {
                            const { error } = await supabase
                              .from('parking_submissions')
                              .update({
                                extracted_data: editableData,
                                updated_at: new Date().toISOString(),
                              })
                              .eq('id', selectedSubmission.id);

                            if (error) throw error;

                            // 選択中の投稿を更新
                            setSelectedSubmission({
                              ...selectedSubmission,
                              extracted_data: editableData,
                            });

                            // リストも更新
                            setSubmissions(prev =>
                              prev.map(s =>
                                s.id === selectedSubmission.id
                                  ? { ...s, extracted_data: editableData }
                                  : s
                              )
                            );

                            setIsEditMode(false);
                            setJsonEditError(null);
                            Alert.alert('保存完了', '編集内容を保存しました');
                          } catch (error) {
                            console.error('保存エラー:', error);
                            Alert.alert('エラー', '保存に失敗しました');
                          }
                        }}
                        disabled={!!jsonEditError}
                        style={{
                          padding: 8,
                          backgroundColor: jsonEditError ? Colors.textSecondary : Colors.success,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          opacity: jsonEditError ? 0.5 : 1,
                        }}
                      >
                        <Ionicons name="checkmark-outline" size={16} color={Colors.white} />
                        <Text style={{ color: Colors.white, fontSize: 12, fontWeight: '600' }}>保存</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {isEditMode ? (
                  <View>
                    <Text style={styles.detailLabel}>JSONを編集（parking_spots形式）:</Text>
                    <TextInput
                      style={[
                        styles.reviewNotesInput,
                        { minHeight: 200, fontFamily: 'Courier', fontSize: 12 },
                        jsonEditError && { borderColor: Colors.error, borderWidth: 2 }
                      ]}
                      multiline
                      value={JSON.stringify(editableData, null, 2)}
                      onChangeText={(text) => {
                        try {
                          const parsed = JSON.parse(text);
                          setEditableData(parsed);
                          setJsonEditError(null);
                        } catch (e) {
                          setJsonEditError((e as Error).message);
                        }
                      }}
                    />
                    {jsonEditError ? (
                      <Text style={{ fontSize: 11, color: Colors.error, marginTop: 4 }}>
                        ⚠️ JSON構文エラー: {jsonEditError}
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 11, color: Colors.textSecondary, marginTop: 4 }}>
                        ※ parking_spots型に合わせてJSON形式で編集してください
                      </Text>
                    )}
                  </View>
                ) : (
                  <>
                    {selectedSubmission.extracted_data.name && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>駐車場名:</Text>
                        <Text style={styles.detailValue}>
                          {selectedSubmission.extracted_data.name}
                        </Text>
                      </View>
                    )}
                    {selectedSubmission.extracted_data.rates &&
                      selectedSubmission.extracted_data.rates.length > 0 && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>料金:</Text>
                          <View style={styles.ratesList}>
                            {selectedSubmission.extracted_data.rates.map((rate: any, idx: number) => (
                              <Text key={idx} style={styles.rateItem}>
                                • {rate.type}: {rate.minutes}分 ¥{rate.price}
                                {rate.time_range && ` (${rate.time_range})`}
                              </Text>
                            ))}
                          </View>
                        </View>
                      )}
                    {selectedSubmission.extracted_data.hours && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>営業時間:</Text>
                        <Text style={styles.detailValue}>
                          {typeof selectedSubmission.extracted_data.hours === 'string'
                            ? selectedSubmission.extracted_data.hours
                            : selectedSubmission.extracted_data.hours.original_hours}
                        </Text>
                      </View>
                    )}
                    {selectedSubmission.extracted_data.capacity && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>収容台数:</Text>
                        <Text style={styles.detailValue}>
                          {selectedSubmission.extracted_data.capacity}台
                        </Text>
                      </View>
                    )}
                    {selectedSubmission.extracted_data.address && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>住所:</Text>
                        <Text style={styles.detailValue}>
                          {selectedSubmission.extracted_data.address}
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {/* 地図 */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>位置情報</Text>
              {Platform.OS === 'web' ? (
                <View style={styles.webMapPlaceholder}>
                  <Ionicons name="map" size={40} color={Colors.primary} />
                  <Text style={styles.webMapText}>
                    📍 緯度: {selectedSubmission.latitude.toFixed(6)}{'\n'}
                    経度: {selectedSubmission.longitude.toFixed(6)}
                  </Text>
                  <TouchableOpacity
                    style={styles.webMapButton}
                    onPress={() => {
                      const url = `https://www.google.com/maps?q=${selectedSubmission.latitude},${selectedSubmission.longitude}`;
                      if (Platform.OS === 'web') {
                        window.open(url, '_blank');
                      } else {
                        Linking.openURL(url);
                      }
                    }}
                  >
                    <Ionicons name="open-outline" size={16} color={Colors.white} />
                    <Text style={styles.webMapButtonText}>Google Mapsで開く</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <CrossPlatformMap
                  initialRegion={{
                    latitude: selectedSubmission.latitude,
                    longitude: selectedSubmission.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  style={styles.map}
                  onMapReady={() => console.log('✅ Map ready in AdminSubmissionsScreen')}
                >
                  <Marker
                    coordinate={{
                      latitude: selectedSubmission.latitude,
                      longitude: selectedSubmission.longitude,
                    }}
                    title={selectedSubmission.extracted_data?.name || '駐車場'}
                  />
                </CrossPlatformMap>
              )}
            </View>

            {/* ユーザーメモ */}
            {selectedSubmission.user_notes && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>ユーザーメモ</Text>
                <Text style={styles.userNotes}>{selectedSubmission.user_notes}</Text>
              </View>
            )}

            {/* OCR処理とGoogle検索 */}
            {selectedSubmission.status === 'pending' && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>画像認識・検索</Text>

                <View style={styles.ocrButtons}>
                  <TouchableOpacity
                    style={[styles.ocrButton, styles.ocrButtonPrimary]}
                    onPress={handleRunOCR}
                    disabled={isRunningOCR || isProcessing}
                  >
                    {isRunningOCR ? (
                      <ActivityIndicator color={Colors.white} size="small" />
                    ) : (
                      <>
                        <Ionicons name="image-outline" size={20} color={Colors.white} />
                        <Text style={styles.ocrButtonText}>OCR実行</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.ocrButton,
                      styles.ocrButtonSecondary,
                      (!selectedSubmission.extracted_data?.name || isSearching) && styles.ocrButtonDisabled,
                    ]}
                    onPress={handleGoogleSearch}
                    disabled={!selectedSubmission.extracted_data?.name || isSearching || isProcessing}
                  >
                    {isSearching ? (
                      <ActivityIndicator color={Colors.primary} size="small" />
                    ) : (
                      <>
                        <Ionicons name="search-outline" size={20} color={Colors.primary} />
                        <Text style={styles.ocrButtonTextSecondary}>Google検索照合</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {googleSearchResults && (
                  <View style={styles.searchResultsCard}>
                    <View style={styles.searchResultsHeader}>
                      <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                      <Text style={styles.searchResultsTitle}>検索結果</Text>
                    </View>
                    <Text style={styles.searchResultsText}>
                      クエリ: {googleSearchResults.query}
                    </Text>
                    <Text style={styles.searchResultsDescription}>
                      {googleSearchResults.description}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* レビューメモ */}
            {selectedSubmission.status === 'pending' && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>レビューメモ</Text>
                <TextInput
                  style={styles.reviewNotesInput}
                  multiline
                  numberOfLines={4}
                  placeholder="承認・却下理由を入力（任意）"
                  value={reviewNotes}
                  onChangeText={setReviewNotes}
                />
              </View>
            )}

            {/* アクションボタン */}
            {selectedSubmission.status === 'pending' && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={handleReject}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <>
                      <Ionicons name="close-circle" size={20} color={Colors.white} />
                      <Text style={styles.actionButtonText}>却下</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={handleApprove}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                      <Text style={styles.actionButtonText}>承認</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>投稿管理</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* ビューモード切替 */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'submissions' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('submissions')}
        >
          <Ionicons name="document-text" size={20} color={viewMode === 'submissions' ? Colors.white : Colors.primary} />
          <Text style={[styles.viewModeText, viewMode === 'submissions' && styles.viewModeTextActive]}>
            投稿レビュー
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'parking' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('parking')}
        >
          <Ionicons name="car" size={20} color={viewMode === 'parking' ? Colors.white : Colors.primary} />
          <Text style={[styles.viewModeText, viewMode === 'parking' && styles.viewModeTextActive]}>
            駐車場管理
          </Text>
        </TouchableOpacity>
      </View>

      {/* フィルター（投稿レビューモードのみ） */}
      {viewMode === 'submissions' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {[
            { key: 'all', label: '全て' },
            { key: 'pending', label: '承認待ち' },
            { key: 'processing', label: '処理中' },
            { key: 'approved', label: '承認済み' },
            { key: 'rejected', label: '却下' },
            { key: 'merged', label: '反映済み' },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                filterStatus === filter.key && styles.filterButtonActive,
              ]}
              onPress={() => setFilterStatus(filter.key)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterStatus === filter.key && styles.filterButtonTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* コンテンツ一覧 */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.submissionsList}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        >
          {viewMode === 'submissions' ? (
            filteredSubmissions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={64} color={Colors.textSecondary} />
                <Text style={styles.emptyStateText}>投稿がありません</Text>
              </View>
            ) : (
              filteredSubmissions.map(renderSubmissionCard)
            )
          ) : (
            userParkingSpots.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="car-outline" size={64} color={Colors.textSecondary} />
                <Text style={styles.emptyStateText}>ユーザー投稿駐車場がありません</Text>
              </View>
            ) : (
              userParkingSpots.map(renderParkingSpotCard)
            )
          )}
        </ScrollView>
      )}

      {/* 詳細モーダル */}
      {renderDetailModal()}
      {renderParkingSpotDetailModal()}

      {/* 駐車場追加ボタン（駐車場管理モードのみ） */}
      {viewMode === 'parking' && (
        <TouchableOpacity
          style={styles.addParkingButton}
          onPress={() => navigation.navigate('AdminParkingCreate')}
        >
          <Ionicons name="add" size={32} color={Colors.white} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexGrow: 0,
    flexShrink: 0,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.backgroundLight,
    marginRight: 8,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterButtonTextActive: {
    color: Colors.white,
  },
  submissionsList: {
    flex: 1,
    padding: 16,
  },
  submissionCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  cardBody: {
    gap: 8,
  },
  cardImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: Colors.backgroundLight,
  },
  cardInfo: {
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  modalHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.white,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modalHeaderButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailImage: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    backgroundColor: Colors.backgroundLight,
    marginBottom: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    width: 120,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  ratesList: {
    flex: 1,
  },
  rateItem: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  map: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  userNotes: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    backgroundColor: Colors.backgroundLight,
    padding: 12,
    borderRadius: 8,
  },
  reviewNotesInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.white,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  approveButton: {
    backgroundColor: Colors.success,
  },
  rejectButton: {
    backgroundColor: Colors.error,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  ocrButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  ocrButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  ocrButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  ocrButtonSecondary: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  ocrButtonDisabled: {
    opacity: 0.5,
  },
  ocrButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  ocrButtonTextSecondary: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  searchResultsCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  searchResultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  searchResultsText: {
    fontSize: 13,
    color: Colors.text,
    marginBottom: 8,
    fontWeight: '600',
  },
  searchResultsDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  warningBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  warningBadgeSmallText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F57C00',
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F57C00',
  },
  warningBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F57C00',
    flex: 1,
    lineHeight: 18,
  },
  viewModeContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.backgroundLight,
    borderWidth: 2,
    borderColor: Colors.primary,
    gap: 8,
  },
  viewModeButtonActive: {
    backgroundColor: Colors.primary,
  },
  viewModeText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  viewModeTextActive: {
    color: Colors.white,
  },
  // Web版用のスタイル
  webMapPlaceholder: {
    padding: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    backgroundColor: Colors.backgroundLight,
    alignItems: 'center',
    gap: 12,
  },
  webMapText: {
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
  },
  webMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  webMapButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  addParkingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
