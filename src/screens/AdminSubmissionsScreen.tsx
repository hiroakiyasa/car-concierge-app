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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/utils/constants';
import { supabase } from '@/config/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { parkingSubmissionService } from '@/services/parking-submission.service';

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

  useEffect(() => {
    loadSubmissions();
  }, []);

  useEffect(() => {
    filterSubmissionsByStatus();
  }, [filterStatus, submissions]);

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
    await loadSubmissions();
    setIsRefreshing(false);
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

      // 1. parking_spotsテーブルに新規レコードを作成
      if (selectedSubmission.submission_type === 'new_parking') {
        const { error: insertError } = await supabase
          .from('parking_spots')
          .insert({
            name: dataToUse?.name || '駐車場',
            lat: selectedSubmission.latitude,
            lng: selectedSubmission.longitude,
            rates: dataToUse?.rates || [],
            capacity: dataToUse?.capacity,
            hours: dataToUse?.hours || null,
            address: dataToUse?.address,
            phone_number: dataToUse?.phone_number,
          });

        if (insertError) throw insertError;
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

      Alert.alert('承認完了', '投稿をデータベースに反映しました');
      closeDetailModal();
      await loadSubmissions();
    } catch (error) {
      console.error('承認エラー:', error);
      Alert.alert('エラー', '承認処理に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission) return;

    Alert.alert(
      '投稿を却下',
      '却下理由を入力してください',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '却下',
          style: 'destructive',
          onPress: async () => {
            if (!reviewNotes.trim()) {
              Alert.alert('エラー', '却下理由を入力してください');
              return;
            }
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
          review_notes: reviewNotes,
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

  const renderSubmissionCard = (submission: Submission) => {
    const statusBadge = getStatusBadgeStyle(submission.status);

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
          <View>
            <Text style={styles.cardTitle}>
              {submission.extracted_data?.name || '駐車場情報'}
            </Text>
            <Text style={styles.cardSubtitle}>
              投稿者: {submission.user_email}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBadge.backgroundColor }]}>
            <Text style={styles.statusBadgeText}>{statusBadge.text}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Image source={{ uri: submission.image_url }} style={styles.cardImage} />

          <View style={styles.cardInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={16} color={Colors.textSecondary} />
              <Text style={styles.infoText}>
                緯度: {submission.latitude.toFixed(6)}, 経度: {submission.longitude.toFixed(6)}
              </Text>
            </View>

            {submission.confidence_score !== null && submission.confidence_score !== undefined && (
              <View style={styles.infoRow}>
                <Ionicons name="analytics" size={16} color={Colors.textSecondary} />
                <Text style={styles.infoText}>
                  信頼度: {(submission.confidence_score * 100).toFixed(0)}%
                </Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Ionicons name="time" size={16} color={Colors.textSecondary} />
              <Text style={styles.infoText}>
                {new Date(submission.created_at).toLocaleString('ja-JP')}
              </Text>
            </View>

            {submission.submission_type === 'update_rates' && (
              <View style={styles.infoRow}>
                <Ionicons name="refresh" size={16} color={Colors.info} />
                <Text style={[styles.infoText, { color: Colors.info }]}>料金更新</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
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
        <SafeAreaView style={styles.modalContainer}>
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
                  <Text style={styles.sectionTitle}>抽出データ</Text>
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
              <MapView
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                  latitude: selectedSubmission.latitude,
                  longitude: selectedSubmission.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: selectedSubmission.latitude,
                    longitude: selectedSubmission.longitude,
                  }}
                  title={selectedSubmission.extracted_data?.name || '駐車場'}
                />
              </MapView>
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
                  placeholder="承認・却下理由を入力（却下の場合は必須）"
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>投稿管理</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* フィルター */}
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

      {/* 投稿一覧 */}
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
          {filteredSubmissions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={Colors.textSecondary} />
              <Text style={styles.emptyStateText}>投稿がありません</Text>
            </View>
          ) : (
            filteredSubmissions.map(renderSubmissionCard)
          )}
        </ScrollView>
      )}

      {/* 詳細モーダル */}
      {renderDetailModal()}
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
    padding: 16,
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
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.backgroundLight,
    marginRight: 8,
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
    padding: 16,
    marginBottom: 16,
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
    marginBottom: 12,
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
    gap: 12,
  },
  cardImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: Colors.backgroundLight,
  },
  cardInfo: {
    gap: 8,
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
    padding: 16,
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
    gap: 4,
    padding: 4,
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
});
