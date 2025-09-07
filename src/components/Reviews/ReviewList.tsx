import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '@/utils/constants';
import { ReviewService, ParkingReview } from '@/services/review.service';

interface ReviewListProps {
  parkingSpotId: number;
}

export const ReviewList: React.FC<ReviewListProps> = ({ parkingSpotId }) => {
  const [reviews, setReviews] = useState<ParkingReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, [parkingSpotId]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const reviewsData = await ReviewService.getReviews(parkingSpotId);
      setReviews(reviewsData);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={14}
            color={star <= rating ? '#FFD700' : '#DDD'}
          />
        ))}
      </View>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  };

  const getUserDisplayName = (review: ParkingReview) => {
    if (review.user_name) {
      return review.user_name;
    }
    if (review.user_email) {
      return review.user_email.split('@')[0] + '***';
    }
    return '匿名ユーザー';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.loadingText}>感想を読み込み中...</Text>
      </View>
    );
  }

  if (reviews.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubble-outline" size={24} color={Colors.textSecondary} />
        <Text style={styles.emptyText}>まだ感想が投稿されていません</Text>
        <Text style={styles.emptySubText}>この駐車場を利用した方は、ぜひ感想を投稿してください</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          利用者の感想 ({reviews.length}件)
        </Text>
      </View>

      <ScrollView 
        style={styles.reviewsList}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {reviews.map((review) => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={styles.userInfo}>
                <Ionicons name="person-circle" size={20} color={Colors.textSecondary} />
                <Text style={styles.userName}>{getUserDisplayName(review)}</Text>
              </View>
              <View style={styles.reviewMeta}>
                {renderStars(review.rating)}
                <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
              </View>
            </View>
            <Text style={styles.reviewContent}>{review.content}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.large,
  },
  header: {
    marginBottom: Spacing.medium,
  },
  title: {
    fontSize: Typography.h6,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  reviewsList: {
    maxHeight: 300,
  },
  reviewCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: Spacing.medium,
    marginBottom: Spacing.small,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.small,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.small,
    flex: 1,
  },
  userName: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  reviewMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  reviewContent: {
    fontSize: Typography.bodySmall,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  loadingContainer: {
    padding: Spacing.large,
    alignItems: 'center',
    gap: Spacing.small,
  },
  loadingText: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    padding: Spacing.large,
    alignItems: 'center',
    gap: Spacing.small,
  },
  emptyText: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});