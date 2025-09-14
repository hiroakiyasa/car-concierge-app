import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/utils/constants';
import { ReviewService } from '@/services/review.service';
import { useAuthStore } from '@/stores/useAuthStore';
import { supabase } from '@/config/supabase';

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  parkingSpotId: number;
  parkingSpotName: string;
  onReviewSubmitted: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  visible,
  onClose,
  parkingSpotId,
  parkingSpotName,
  onReviewSubmitted,
}) => {
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  
  // 認証状態のログ出力（デバッグ用）
  React.useEffect(() => {
    console.log('📝 ReviewModal: コンポーネント認証状態', {
      visible,
      hasUser: !!user,
      isAuthenticated,
      userEmail: user?.email,
      userId: user?.id
    });
  }, [visible, user, isAuthenticated]);

  const handleSubmit = async () => {
    // 評価のみでも投稿可能（感想はオプショナル）

    // 認証状態の事前チェック（ボタンが有効でも念のため再確認）
    console.log('📝 ReviewModal: 投稿実行時の認証状態', {
      hasUser: !!user,
      isAuthenticated,
      userEmail: user?.email,
      userId: user?.id
    });

    if (!isAuthenticated || !user) {
      console.log('📝 ReviewModal: AuthStore認証状態に問題 - 再認証を試行');
      
      // 認証状態を再チェック
      await checkAuth();
      
      // 再チェック後の状態を確認
      const currentState = useAuthStore.getState();
      console.log('📝 ReviewModal: 再認証後の状態', {
        hasUser: !!currentState.user,
        isAuthenticated: currentState.isAuthenticated,
        userEmail: currentState.user?.email
      });
      
      if (!currentState.isAuthenticated || !currentState.user) {
        Alert.alert(
          '認証エラー', 
          '認証状態に問題があります。一度ログアウトして再度ログインしてください。',
          [
            {
              text: 'OK',
              onPress: onClose
            }
          ]
        );
        return;
      }
    }

    // さらにSupabaseセッションの事前チェックも追加
    try {
      const { data: sessionCheck } = await supabase.auth.getSession();
      const { data: { user: userCheck } } = await supabase.auth.getUser();
      
      console.log('📝 ReviewModal: Supabaseセッション事前チェック', {
        hasSession: !!sessionCheck.session,
        hasUser: !!userCheck,
        userId: userCheck?.id
      });
      
      if (!sessionCheck.session || !userCheck) {
        console.log('📝 ReviewModal: Supabaseセッション無効 - 自動ログアウト実行');
        
        // AuthStoreの状態をクリアして自動的にログアウト状態に
        const { signOut } = useAuthStore.getState();
        await signOut();
        
        Alert.alert(
          'セッション期限切れ',
          '認証セッションが期限切れのため、自動的にログアウトしました。再度ログインしてください。',
          [
            {
              text: 'OK',
              onPress: onClose
            }
          ]
        );
        return;
      }
    } catch (sessionError) {
      console.error('📝 ReviewModal: セッションチェックエラー:', sessionError);
      Alert.alert(
        '認証エラー',
        '認証状態の確認に失敗しました。再度ログインしてください。',
        [
          {
            text: 'OK',
            onPress: onClose
          }
        ]
      );
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await ReviewService.createReview(parkingSpotId, content, rating);
      
      if (result.success) {
        const message = content.trim() ? '感想を投稿しました' : '評価を投稿しました';
        Alert.alert('投稿完了', message, [
          {
            text: 'OK',
            onPress: () => {
              setContent('');
              setRating(5);
              onClose();
              onReviewSubmitted();
            },
          },
        ]);
      } else {
        Alert.alert('エラー', result.error || '投稿に失敗しました');
      }
    } catch (error) {
      Alert.alert('エラー', '投稿に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsSection}>
        <View style={styles.starsRow}>
          <Text style={styles.ratingLabel}>評価:</Text>
          <View style={styles.starsButtonGroup}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={32}
                  color={star <= rating ? '#FFB800' : '#DDD'}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingText}>({rating}/5)</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>感想を投稿</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting || !isAuthenticated || !user}
            style={[
              styles.submitButton,
              (isSubmitting || !isAuthenticated || !user) && styles.submitButtonDisabled,
            ]}
          >
            <Text
              style={[
                styles.submitButtonText,
                (isSubmitting || !isAuthenticated || !user) && styles.submitButtonTextDisabled,
              ]}
            >
              {isSubmitting ? '投稿中...' : !isAuthenticated ? 'ログインが必要' : '投稿'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.parkingInfoCard}>
            <Ionicons name="car" size={20} color={Colors.primary} />
            <Text style={styles.parkingName}>{parkingSpotName}</Text>
          </View>

          {renderStars()}

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>感想</Text>
            <TextInput
              style={styles.textInput}
              value={content}
              onChangeText={setContent}
              placeholder="駐車場の感想を教えてください（省略可）"
              placeholderTextColor="#999"
              multiline
              numberOfLines={6}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>
              {content.length}/500文字
            </Text>
            {!isAuthenticated && (
              <Text style={styles.authWarning}>
                ⚠️ レビューを投稿するにはログインが必要です
              </Text>
            )}
          </View>

          <View style={styles.guidelines}>
            <Text style={styles.guidelinesTitle}>投稿ガイドライン</Text>
            <Text style={styles.guidelinesText}>
              • 実際に利用した駐車場についてのみ投稿してください{'\n'}
              • 他の利用者の参考になる具体的な感想をお願いします{'\n'}
              • 料金、アクセス、設備などについて記載いただけると参考になります{'\n'}
              • 不適切な内容は削除される場合があります
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  submitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#CCC',
  },
  submitButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  submitButtonTextDisabled: {
    color: '#888',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  parkingInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  parkingName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  starsSection: {
    marginBottom: 24,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  starsButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  starButton: {
    padding: 2,
  },
  ratingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    backgroundColor: '#FFF',
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  characterCountWarning: {
    color: '#FF3B30',
    fontWeight: '500',
  },
  guidelines: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  guidelinesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  guidelinesText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  authWarning: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 8,
    fontWeight: '500',
  },
});